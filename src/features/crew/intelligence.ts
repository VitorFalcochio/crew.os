import type { Activity, Approval, DemoState, Employee, Task } from "@/types/domain";
import { currency } from "@/lib/utils";
import { getAutonomyPolicyForEmployee } from "./autonomy";

type ExtendedActivity = Activity & {
  metadata?: Record<string, unknown>;
};

export interface CrewImpactSummary {
  moneyRecoveredOrProtected: number;
  timeSavedMinutes: number;
  tasksExecuted: number;
  issuesFound: number;
  pendingDecisions: number;
  riskPrevented: number;
}

export interface CrewActivityDetail {
  id: string;
  employeeId?: string;
  employeeName: string;
  role: string;
  department: string;
  timeLabel: string;
  title: string;
  description: string;
  status: "working" | "waiting_approval" | "completed" | "attention" | "error" | "idle";
  whatHappened: string;
  why: string;
  dataUsed: string[];
  autonomyRule: string;
  result: string;
  nextAction: string;
  impact: {
    moneySaved: number;
    timeSavedMinutes: number;
    revenueGenerated: number;
    riskPrevented: number;
  };
}

export interface BriefingSpeaker {
  employeeId: string;
  name: string;
  role: string;
  department: string;
  status: string;
  message: string;
  metrics: string[];
  tone: "positive" | "warning" | "neutral";
}

export interface BriefingPriority {
  title: string;
  description: string;
  actionLabel: string;
  href: string;
}

export interface CrewBriefingSnapshot {
  periodLabel: string;
  greeting: string;
  speakers: BriefingSpeaker[];
  priorities: BriefingPriority[];
  progress: Array<{ label: string; done: boolean }>;
}

function normalize(value: string) {
  return value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function toNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : Number(value) || fallback;
}

function toStringList(value: unknown, fallback: string[]) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : fallback;
}

function getEmployee(employeeId: string | undefined, employees: Employee[]) {
  if (!employeeId) return undefined;
  return employees.find((employee) => employee.id === employeeId);
}

function inferActivityStatus(activity: ExtendedActivity, task?: Task) {
  const metaStatus = typeof activity.metadata?.status === "string" ? normalize(activity.metadata.status) : "";
  if (metaStatus.includes("error") || metaStatus.includes("falh")) return "error" as const;
  if (metaStatus.includes("approval") || normalize(activity.title).includes("aprova")) return "waiting_approval" as const;
  if (metaStatus.includes("complete") || normalize(task?.status ?? "").includes("conclu")) return "completed" as const;
  if (normalize(activity.title).includes("alert") || normalize(activity.description ?? "").includes("risco")) return "attention" as const;
  if (normalize(activity.title).includes("started") || normalize(activity.title).includes("comecou")) return "working" as const;
  return "idle" as const;
}

function defaultDataUsed(activity: ExtendedActivity, employee?: Employee) {
  const department = normalize(employee?.department ?? "");
  if (department.includes("finance")) return ["Contas a receber", "Histórico de pagamentos", "Movimentações recentes"];
  if (department.includes("compr")) return ["Fornecedores", "Propostas", "Prazo de entrega"];
  if (department.includes("atend")) return ["Mensagens recebidas", "Histórico do cliente", "Regras de resposta"];
  if (department.includes("marketing")) return ["Campanhas", "Pautas", "Resultados da semana"];
  if (department.includes("comercial")) return ["Leads", "CRM", "Histórico de follow-up"];
  if (department.includes("fiscal")) return ["Documentos fiscais", "Notas", "Obrigações"];
  if (department.includes("imob")) return ["Leads imobiliários", "Agenda", "Histórico de visitas"];
  return ["Contexto operacional", "Histórico recente", "Regras da empresa"];
}

function defaultNextAction(activity: ExtendedActivity, status: CrewActivityDetail["status"]) {
  if (status === "waiting_approval") return "Aguardar sua aprovação";
  if (status === "attention") return "Revisar o ponto de atenção";
  if (status === "error") return "Corrigir o erro e registrar a falha";
  if (status === "completed") return "Arquivar o resultado e seguir para a próxima etapa";
  return "Continuar monitorando a execução";
}

function defaultWhy(activity: ExtendedActivity, task?: Task, approval?: Approval) {
  const metadataWhy = typeof activity.metadata?.why === "string" ? activity.metadata.why : "";
  if (metadataWhy) return metadataWhy;
  if (approval) return approval.impact || approval.description;
  if (task?.description) return task.description;
  return activity.description || activity.title;
}

function defaultResult(activity: ExtendedActivity, task?: Task) {
  const metadataResult = typeof activity.metadata?.result === "string" ? activity.metadata.result : "";
  if (metadataResult) return metadataResult;
  if (task?.result) return task.result;
  return activity.description || "Resultado registrado no feed.";
}

function defaultAutonomyRule(employee: Employee, activity: ExtendedActivity) {
  const policy = getAutonomyPolicyForEmployee(employee);
  const title = normalize(activity.title);
  const department = normalize(employee.department);
  const rule =
    policy.rules.find((item) => title.includes(normalize(item.label))) ??
    policy.rules.find((item) => department.includes("finance") && item.actionKey === "send_collection") ??
    policy.rules[0];

  return `${rule.label} · ${rule.mode === "autonomous" ? "autônomo" : rule.mode === "approval_required" ? "precisa de aprovação" : rule.mode === "observe" ? "observador" : "bloqueado"}`;
}

function impactFromActivity(activity: ExtendedActivity, employee?: Employee, task?: Task, approval?: Approval) {
  const moneySaved = toNumber(activity.metadata?.money_saved, approval?.amount ?? 0);
  const timeSavedMinutes = toNumber(activity.metadata?.time_saved_minutes, employee ? Math.max(12, Math.round(employee.performance * 1.8)) : 15);
  const revenueGenerated = toNumber(activity.metadata?.revenue_generated, 0);
  const riskPrevented = toNumber(activity.metadata?.risk_prevented, approval ? 1 : 0);
  return { moneySaved, timeSavedMinutes, revenueGenerated, riskPrevented };
}

export function buildCrewImpactSummary(state: DemoState): CrewImpactSummary {
  const hired = state.employees.filter((employee) => employee.hired);
  const approvedMoney = state.approvals.filter((approval) => approval.status === "aprovada").reduce((sum, approval) => sum + (approval.amount ?? 0), 0);
  const pendingMoney = state.approvals.filter((approval) => approval.status === "pendente").reduce((sum, approval) => sum + (approval.amount ?? 0), 0);
  const moneyRecoveredOrProtected = hired.reduce((sum, employee) => sum + employee.savings, 0) + approvedMoney + pendingMoney;
  const timeSavedMinutes = hired.reduce((sum, employee) => sum + Math.round(employee.tasksCompleted * (employee.performance / 10)), 0);
  const tasksExecuted = state.tasks.filter((task) => task.status === "concluída").length;
  const issuesFound = state.tasks.filter((task) => task.status === "falhou").length + state.approvals.filter((approval) => approval.status === "pendente").length;
  const pendingDecisions = state.approvals.filter((approval) => approval.status === "pendente").length;
  const riskPrevented = issuesFound + state.activities.filter((activity) => normalize(activity.title).includes("aprova")).length;

  return { moneyRecoveredOrProtected, timeSavedMinutes, tasksExecuted, issuesFound, pendingDecisions, riskPrevented };
}

export function buildCrewActivities(state: DemoState): CrewActivityDetail[] {
  const approvalByTask = new Map(state.approvals.map((approval) => [approval.taskId, approval] as const));
  return state.activities.map((activity) => {
    const typedActivity = activity as ExtendedActivity;
    const employee = getEmployee(activity.employeeId, state.employees) ?? state.employees.find((item) => item.hired) ?? state.employees[0];
    const task = activity.taskId ? state.tasks.find((item) => item.id === activity.taskId) : undefined;
    const approval = activity.taskId ? approvalByTask.get(activity.taskId) : undefined;
    const status = inferActivityStatus(typedActivity, task);
    return {
      id: activity.id,
      employeeId: employee?.id,
      employeeName: employee?.name ?? "Equipe",
      role: employee?.role ?? "Funcionário digital",
      department: employee?.department ?? "Operação",
      timeLabel: activity.createdAt,
      title: activity.title,
      description: activity.description || "Atividade registrada.",
      status,
      whatHappened: activity.title,
      why: defaultWhy(typedActivity, task, approval),
      dataUsed: toStringList(typedActivity.metadata?.data_used, defaultDataUsed(typedActivity, employee)),
      autonomyRule: typeof typedActivity.metadata?.autonomy_rule === "string" ? String(typedActivity.metadata.autonomy_rule) : defaultAutonomyRule(employee ?? state.employees[0], typedActivity),
      result: defaultResult(typedActivity, task),
      nextAction: defaultNextAction(typedActivity, status),
      impact: impactFromActivity(typedActivity, employee, task, approval),
    };
  });
}

export function buildCrewBriefing(state: DemoState): CrewBriefingSnapshot {
  const hired = state.employees.filter((employee) => employee.hired);
  const pendingApprovals = state.approvals.filter((approval) => approval.status === "pendente").sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
  const activeTasks = state.tasks.filter((task) => ["planejando", "executando", "aguardando ferramenta", "aguardando aprovação", "aguardando_aprovacao"].includes(task.status));
  const progress = hired.map((employee) => ({ label: employee.name, done: employee.status === "trabalhando" || employee.status === "disponível" }));

  const speakers = hired.map((employee) => {
    const employeeTasks = state.tasks.filter((task) => task.employeeId === employee.id);
    const employeeApprovals = pendingApprovals.filter((approval) => approval.employeeId === employee.id);
    const latestActivity = [...state.activities].reverse().find((activity) => activity.employeeId === employee.id);
    const tone: BriefingSpeaker["tone"] = employeeApprovals.length > 0 || employee.status === "aguardando aprovação" ? "warning" : employee.status === "com erro" ? "warning" : "positive";
    const metrics = [
      `${employeeTasks.length} tarefas no contexto`,
      employeeApprovals.length ? `${employeeApprovals.length} decisão(ões) pendente(s)` : `${employee.tasksCompleted} tarefas concluídas`,
      latestActivity ? `Última ação: ${latestActivity.title}` : "Sem atividade recente",
    ];
    const message =
      employee.department === "Financeiro"
        ? `Recebemos ${currency(employee.savings)} em valor protegido no histórico atual. ${employeeApprovals.length ? `Há ${employeeApprovals.length} aprovação(ões) aguardando decisão.` : "Nada crítico está parado."}`
        : employee.department === "Comercial"
          ? `Entraram ${employee.tasksCompleted} entregas acumuladas no funil. ${employeeTasks.length ? "O pipeline segue ativo." : "Sem fila nova agora."}`
          : employee.department === "Marketing"
            ? `A equipe de marketing mantém ${employee.performance}% de desempenho e segue com o calendário sob controle.`
            : employee.department === "Atendimento"
              ? `Atendimento está organizando mensagens e priorizando respostas rápidas e consistentes.`
              : latestActivity
                ? `Último movimento: ${latestActivity.title}.`
                : `A equipe segue em modo operacional.`;

    return {
      employeeId: employee.id,
      name: employee.name,
      role: employee.role,
      department: employee.department,
      status: employee.status,
      message,
      metrics,
      tone,
    };
  });

  const priorities: BriefingPriority[] = [];
  if (pendingApprovals[0]) {
    priorities.push({
      title: pendingApprovals[0].title,
      description: pendingApprovals[0].impact,
      actionLabel: "Abrir aprovações",
      href: "/aprovacoes",
    });
  }
  const overdueTask = state.tasks.find((task) => normalize(task.status).includes("execut") || normalize(task.description).includes("atras"));
  if (overdueTask) {
    priorities.push({
      title: overdueTask.title,
      description: overdueTask.description,
      actionLabel: "Ver delegações",
      href: "/delegacoes",
    });
  }
  const activeTask = activeTasks[0];
  if (activeTask) {
    priorities.push({
      title: activeTask.title,
      description: activeTask.description,
      actionLabel: "Abrir atividade",
      href: "/atividades",
    });
  }

  return {
    periodLabel: "Resumo semanal",
    greeting: "Bom dia. Sua Crew analisou a última semana.",
    speakers,
    priorities,
    progress,
  };
}
