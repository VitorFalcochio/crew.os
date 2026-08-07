import { initialDemoState } from "./seed";
import type { Activity, Approval, DemoState, Employee, EmployeeStatus, Priority, TaskStatus } from "@/types/domain";

type JsonRow = Record<string, unknown>;
const statusMap: Record<string, EmployeeStatus> = { trabalhando: "trabalhando", aguardando_aprovacao: "aguardando aprovação", disponivel: "disponível", pausado: "pausado", com_erro: "com erro", configurando: "configurando" };
const taskStatusMap: Record<string, TaskStatus> = { recebida: "recebida", planejando: "planejando", executando: "executando", aguardando_ferramenta: "aguardando ferramenta", aguardando_aprovacao: "aguardando aprovação", concluida: "concluída", falhou: "falhou", cancelada: "cancelada" };
const priorityMap: Record<string, Priority> = { baixa: "baixa", media: "média", alta: "alta", urgente: "urgente" };
const approvalStatusMap: Record<string, Approval["status"]> = { pendente: "pendente", aprovada: "aprovada", recusada: "recusada", ajuste_solicitado: "ajuste solicitado" };
const colors = ["#8b5cf6", "#3b82f6", "#06b6d4", "#ec4899", "#f59e0b", "#10b981"];
function text(value: unknown, fallback = "") { return typeof value === "string" ? value : fallback; }
function number(value: unknown, fallback = 0) { return typeof value === "number" ? value : Number(value) || fallback; }
function list(value: unknown) { return Array.isArray(value) ? value.map(String) : []; }
function shortDate(value: unknown) { return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(String(value))) : "Sem prazo"; }

export interface BootstrapPayload { account: { userId: string; email?: string; name: string; organization: { id: string; name: string }; role: string }; employees: JsonRow[]; tasks: JsonRow[]; approvals: JsonRow[]; activities: JsonRow[]; }

export function adaptBootstrap(payload: BootstrapPayload): DemoState {
  const employees: Employee[] = payload.employees.map((row, index) => {
    const configuration = (row.configuration ?? {}) as JsonRow;
    const name = text(row.name, "Funcionário");
    const employeeTasks = payload.tasks.filter((task) => task.employee_id === row.id);
    const activeTask = employeeTasks.find((task) => !["concluida", "falhou", "cancelada"].includes(text(task.status)));
    return { id: text(row.id), name, initials: name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), role: text(row.role_name), department: text(row.department), level: text(row.seniority, "Pleno"), description: text(row.description), status: statusMap[text(row.status)] ?? "configurando", currentTask: activeTask ? text(activeTask.title) : "Sem tarefa no momento", tasksCompleted: employeeTasks.filter((task) => task.status === "concluida").length, performance: number(configuration.performance, 90), successRate: number(configuration.success_rate, 95), averageTime: text(configuration.average_time, "—"), savings: number(configuration.savings), monthlyPrice: number(row.monthly_price), hired: true, color: colors[index % colors.length], skills: list(configuration.skills), responsibilities: list(configuration.responsibilities), tools: list(configuration.tools) };
  });
  const tasks = payload.tasks.map((row) => ({ id: text(row.id), employeeId: text(row.employee_id), title: text(row.title), description: text(row.description), priority: priorityMap[text(row.priority)] ?? "média", status: taskStatusMap[text(row.status)] ?? "recebida", dueAt: shortDate(row.due_at), requiresApproval: Boolean(row.requires_approval), createdAt: shortDate(row.created_at), result: row.output_data ? JSON.stringify(row.output_data) : undefined }));
  const approvals = payload.approvals.map((row) => ({ id: text(row.id), taskId: text(row.task_id), employeeId: text(row.employee_id), title: text(row.title), description: text(row.description), impact: text(row.impact), risk: text(row.risk_level) === "medio" ? "médio" as const : text(row.risk_level) === "alto" ? "alto" as const : "baixo" as const, status: approvalStatusMap[text(row.status)] ?? "pendente", amount: number((row.payload as JsonRow | undefined)?.total) || undefined, requestedAt: shortDate(row.requested_at) }));
  const activities: Activity[] = payload.activities.map((row) => ({ id: text(row.id), employeeId: text(row.employee_id) || undefined, taskId: text(row.task_id) || undefined, title: text(row.title), description: text(row.description), type: text(row.activity_type).includes("approval") ? "aprovação" : text(row.activity_type).includes("tool") ? "ferramenta" : text(row.activity_type).includes("collab") ? "colaboração" : "tarefa", createdAt: shortDate(row.created_at) }));
  return { employees, tasks, approvals, activities, integrations: initialDemoState.integrations };
}
