import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { JobQueue, type JobRecord } from "@/services/job-queue";
import { createOpenAIProvider, modelForRoute, selectModelRoute, type ModelRoute } from "@/agents/providers/model-router";
import { buildBrainPrompt } from "@/agents/brains/brain";
import { resolveEmployeeBrain } from "@/agents/brains/registry";

const planSchema = z.object({ summary: z.string(), steps: z.array(z.object({ title: z.string(), requiresApproval: z.boolean() })).min(1).max(8) });
type TaskRow = { id: string; organization_id: string; employee_id: string; title: string; description: string; priority: string; status: string; requires_approval: boolean };
type EmployeeRow = { id: string; name: string; role_name: string; department: string; status: string; configuration: Record<string, unknown> };

export class ContinuousWorker {
  private readonly db = createAdminClient();
  constructor(private readonly queue = new JobQueue()) {}

  async process(job: JobRecord) {
    try {
      if (job.job_type === "resume_after_approval") await this.resumeAfterApproval(job);
      else if (job.job_type === "execute_task") await this.executeTask(job);
      else throw new Error(`Tipo de job desconhecido: ${job.job_type}`);
      return { jobId: job.id, status: "processed" as const };
    } catch (error) {
      await this.queue.fail(job, error, !(error instanceof NonRetryableError));
      return { jobId: job.id, status: "failed" as const, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private async loadTask(job: JobRecord) {
    if (!job.task_id) throw new NonRetryableError("Job sem tarefa associada");
    const { data: task, error: taskError } = await this.db.from("tasks").select("id,organization_id,employee_id,title,description,priority,status,requires_approval").eq("id", job.task_id).single();
    if (taskError || !task) throw new NonRetryableError("Tarefa não encontrada");
    const { data: employee, error: employeeError } = await this.db.from("digital_employees").select("id,name,role_name,department,status,configuration").eq("id", task.employee_id).eq("organization_id", task.organization_id).single();
    if (employeeError || !employee) throw new NonRetryableError("Funcionário da tarefa não encontrado");
    return { task: task as TaskRow, employee: employee as EmployeeRow };
  }

  private async executeTask(job: JobRecord) {
    const { task, employee } = await this.loadTask(job);
    if (["concluida", "cancelada"].includes(task.status)) { await this.queue.succeed(job.id); return; }
    await this.db.from("tasks").update({ status: "planejando", started_at: new Date().toISOString() }).eq("id", task.id);
    await this.db.from("digital_employees").update({ status: "trabalhando" }).eq("id", employee.id);
    await this.activity(task, employee, "task_started", `${employee.name} começou a trabalhar`, task.title);
    const plan = await this.createPlan(job, task, employee);
    await this.savePlan(task, employee, plan.steps.map((step) => step.title));
    if (/financeiro/i.test(employee.role_name)) await this.executeFinancialTask(job, task, employee, plan.summary);
    else await this.executeGenericTask(job, task, employee, plan);
  }

  private async createPlan(job: JobRecord, task: TaskRow, employee: EmployeeRow) {
    const fallback = { summary: `Plano operacional de ${employee.name} para ${task.title}.`, steps: [{ title: "Analisar contexto e dados disponíveis", requiresApproval: false }, { title: "Preparar a entrega solicitada", requiresApproval: task.requires_approval }, { title: "Registrar resultado e indicadores", requiresApproval: false }] };
    if (!process.env.OPENAI_API_KEY) return fallback;
    const brain = resolveEmployeeBrain({ brainKey: employee.configuration.brainKey, role: employee.role_name, department: employee.department, name: employee.name });
    const route = selectModelRoute({ priority: task.priority, descriptionLength: task.description.length, employeeRole: employee.role_name, preferredReasoning: brain?.preferredReasoning });
    const runId = crypto.randomUUID();
    const started = Date.now();
    await this.db.from("provider_runs").insert({ id: runId, organization_id: task.organization_id, job_id: job.id, task_id: task.id, employee_id: employee.id, provider: "openai", model_route: route, status: "running" });
    try {
      const result = await createOpenAIProvider(route).generateStructured({ schema: planSchema, schemaName: "employee_work_plan", system: this.employeePolicy(employee), prompt: `Crie um plano curto e executável para esta delegação. Título: ${task.title}\nDescrição: ${task.description}\nIndique aprovação somente para ações externas, financeiras, destrutivas ou irreversíveis.`, reasoningEffort: route === "complex" ? "medium" : "low", safetyIdentifier: this.safetyIdentifier(task.organization_id) });
      await this.db.from("provider_runs").update({ status: "succeeded", duration_ms: Date.now() - started, completed_at: new Date().toISOString() }).eq("id", runId);
      return result;
    } catch (error) {
      await this.db.from("provider_runs").update({ status: "failed", duration_ms: Date.now() - started, error_code: error instanceof Error ? error.message.slice(0, 120) : "UNKNOWN", completed_at: new Date().toISOString() }).eq("id", runId);
      return fallback;
    }
  }

  private async executeFinancialTask(job: JobRecord, task: TaskRow, employee: EmployeeRow, planSummary: string) {
    const executionKey = `${job.id}:consult_accounts`;
    const started = Date.now();
    const { data: execution, error: executionError } = await this.db.from("tool_executions").upsert({ organization_id: task.organization_id, job_id: job.id, task_id: task.id, employee_id: employee.id, tool_key: "consult_accounts", status: "running", input_data: { window_days: 7 }, output_data: null, error_data: null, completed_at: null, idempotency_key: executionKey }, { onConflict: "organization_id,idempotency_key", ignoreDuplicates: false }).select("id").single();
    if (executionError || !execution) throw executionError ?? new Error("Não foi possível registrar a ferramenta");
    const endDate = new Date(); endDate.setUTCDate(endDate.getUTCDate() + 7);
    const { data: accounts, error } = await this.db.from("financial_accounts").select("id,customer_name,document,amount,due_date,direction,status").eq("organization_id", task.organization_id).eq("direction", "receivable").in("status", ["open", "overdue"]).lte("due_date", endDate.toISOString().slice(0, 10)).order("due_date");
    if (error) throw error;
    const overdue = (accounts ?? []).filter((account) => account.status === "overdue");
    const totalDue = (accounts ?? []).reduce((sum, account) => sum + Number(account.amount), 0);
    const overdueTotal = overdue.reduce((sum, account) => sum + Number(account.amount), 0);
    const summary = { plan: planSummary, accounts_analyzed: accounts?.length ?? 0, due_total: totalDue, overdue_customers: overdue.length, collection_total: overdueTotal, window_days: 7 };
    await this.db.from("tool_executions").update({ status: "succeeded", output_data: summary, duration_ms: Date.now() - started, completed_at: new Date().toISOString() }).eq("id", execution.id);
    await this.updateStep(task.id, 1, "concluida", { accounts: accounts?.length ?? 0 });
    await this.activity(task, employee, "accounts_analyzed", "Contas analisadas", `${accounts?.length ?? 0} recebíveis foram verificados; ${overdue.length} estão em atraso.`);
    if (overdue.length > 0) {
      const idempotencyKey = `${task.id}:send_collections`;
      const { data: existing } = await this.db.from("approvals").select("id").eq("organization_id", task.organization_id).eq("idempotency_key", idempotencyKey).maybeSingle();
      if (!existing) {
        const { error: approvalError } = await this.db.from("approvals").insert({ organization_id: task.organization_id, task_id: task.id, employee_id: employee.id, action_type: "send_collection", title: `Enviar ${overdue.length} cobrança(s)`, description: "Cobranças preparadas para clientes com recebíveis vencidos.", impact: `Recuperação potencial de R$ ${overdueTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`, risk_level: "medio", payload: { account_ids: overdue.map((account) => account.id), total: overdueTotal, customers: overdue.length }, status: "pendente", idempotency_key: idempotencyKey });
        if (approvalError) throw approvalError;
      }
      await this.db.from("tasks").update({ status: "aguardando_aprovacao", output_data: summary }).eq("id", task.id);
      await this.db.from("digital_employees").update({ status: "aguardando_aprovacao" }).eq("id", employee.id);
      await this.updateStep(task.id, 2, "aguardando_aprovacao", { drafts: overdue.length, total: overdueTotal });
      await this.activity(task, employee, "approval_requested", "Cobranças aguardando aprovação", `${overdue.length} cobranças somando R$ ${overdueTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} foram preparadas.`);
      await this.queue.waitForApproval(job.id);
      return;
    }
    await this.completeTask(job, task, employee, summary);
  }

  private async resumeAfterApproval(job: JobRecord) {
    const { task, employee } = await this.loadTask(job);
    const approvalId = String(job.payload.approval_id ?? "");
    const { data: approval, error } = await this.db.from("approvals").select("id,status,payload").eq("id", approvalId).eq("organization_id", task.organization_id).single();
    if (error || !approval || approval.status !== "aprovada") throw new NonRetryableError("Aprovação válida não encontrada");
    const executionKey = `${approval.id}:send_collection`;
    const { data: existing } = await this.db.from("tool_executions").select("id,status").eq("organization_id", task.organization_id).eq("idempotency_key", executionKey).maybeSingle();
    if (!existing) await this.db.from("tool_executions").insert({ organization_id: task.organization_id, job_id: job.id, task_id: task.id, employee_id: employee.id, tool_key: "generate_collection", status: "succeeded", input_data: approval.payload, output_data: { simulated: true, sent: Number((approval.payload as Record<string, unknown>).customers ?? 0) }, completed_at: new Date().toISOString(), duration_ms: 1, idempotency_key: executionKey });
    await this.updateStep(task.id, 2, "concluida", { approved: true });
    await this.activity(task, employee, "collections_sent", "Cobranças enviadas", "A ação aprovada foi executada e registrada. O envio permanece simulado até uma integração de e-mail ser conectada.");
    await this.completeTask(job, task, employee, { approval_id: approval.id, collections_sent: true, simulated: true });
  }

  private async executeGenericTask(job: JobRecord, task: TaskRow, employee: EmployeeRow, plan: z.infer<typeof planSchema>) {
    await this.completeTask(job, task, employee, { summary: plan.summary, plan: plan.steps, note: "Fluxo-base concluído. Ferramentas específicas deste cargo serão conectadas em módulos próprios." });
  }
  private async completeTask(job: JobRecord, task: TaskRow, employee: EmployeeRow, output: Record<string, unknown>) {
    await this.db.from("tasks").update({ status: "concluida", output_data: output, completed_at: new Date().toISOString() }).eq("id", task.id);
    await this.db.from("digital_employees").update({ status: "disponivel" }).eq("id", employee.id);
    await this.activity(task, employee, "task_completed", "Tarefa concluída", `${employee.name} concluiu “${task.title}”.`);
    await this.queue.succeed(job.id);
  }
  private async savePlan(task: TaskRow, employee: EmployeeRow, titles: string[]) { const rows = titles.map((title, index) => ({ task_id: task.id, employee_id: employee.id, step_order: index + 1, title, status: index === 0 ? "executando" : "recebida", input_data: {}, started_at: index === 0 ? new Date().toISOString() : null })); const { error } = await this.db.from("task_steps").upsert(rows, { onConflict: "task_id,step_order" }); if (error) throw error; }
  private async updateStep(taskId: string, order: number, status: string, output: Record<string, unknown>) { await this.db.from("task_steps").update({ status, output_data: output, completed_at: status === "concluida" ? new Date().toISOString() : null }).eq("task_id", taskId).eq("step_order", order); }
  private async activity(task: TaskRow, employee: EmployeeRow, type: string, title: string, description: string) { const { error } = await this.db.from("activities").insert({ organization_id: task.organization_id, employee_id: employee.id, task_id: task.id, activity_type: type, title, description, metadata: {} }); if (error) throw error; }
  private employeePolicy(employee: EmployeeRow) {
    const brain = resolveEmployeeBrain({ brainKey: employee.configuration.brainKey, role: employee.role_name, department: employee.department, name: employee.name });
    if (brain) return buildBrainPrompt(brain, { employeeName: employee.name });
    return `Você é ${employee.name}, agente de IA em ${employee.role_name} do departamento ${employee.department}. Planeje trabalho empresarial rastreável. Não execute pagamentos, compras, publicações, envios externos ou alterações irreversíveis sem aprovação humana. Responda em português do Brasil.`;
  }
  private safetyIdentifier(organizationId: string) { return createHash("sha256").update(`crewos:${organizationId}`).digest("hex").slice(0, 32); }
}

class NonRetryableError extends Error {}
export function resolvedModelForTask(input: { priority: string; descriptionLength: number; employeeRole: string; preferredReasoning?: "low" | "medium" | "high" }) { const route: ModelRoute = selectModelRoute(input); return { route, model: modelForRoute(route) }; }
