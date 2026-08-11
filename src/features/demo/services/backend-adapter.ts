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
function object(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRow : {}; }
function shortDate(value: unknown) { return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(String(value))) : "Sem prazo"; }

export interface BootstrapPayload { account: { userId: string; email?: string; name: string; organization: { id: string; name: string }; role: string }; employees: JsonRow[]; tasks: JsonRow[]; approvals: JsonRow[]; activities: JsonRow[]; integrations: JsonRow[]; financialAccounts?: JsonRow[]; financialBalances?: JsonRow[]; }

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
  const providerCatalog = [
    { provider: "google-workspace", name: "Google Workspace", description: "Gmail e Google Calendar em uma única conexão", category: "Produtividade", initials: "GW" },
    { provider: "google-drive", name: "Google Drive", description: "Documentos e arquivos", category: "Arquivos", initials: "GD" },
    { provider: "whatsapp", name: "WhatsApp", description: "Mensagens e atendimento", category: "Comunicação", initials: "WA" },
    { provider: "conta-azul", name: "Conta Azul", description: "Operações financeiras", category: "Financeiro", initials: "CA" },
    { provider: "omie", name: "Omie", description: "ERP e operações financeiras", category: "Financeiro", initials: "OM" },
    { provider: "asaas", name: "Asaas", description: "Cobranças e financeiro", category: "Financeiro", initials: "AS" },
    { provider: "hubspot", name: "HubSpot", description: "Leads, negócios e clientes", category: "Comercial", initials: "HS" },
  ];
  const integrations = providerCatalog.map((provider) => { const row = payload.integrations.find((item) => item.provider === provider.provider); const health = object(row?.health); return { ...provider, id: text(row?.id, provider.provider), connected: text(row?.status) === "connected", status: (text(row?.status, "disconnected") as "connected" | "disconnected" | "expired" | "error" | "requires_reauth"), capabilities: list(row?.capabilities), lastSyncAt: text(row?.last_sync_at) || undefined, healthMessage: text(health.message) || undefined }; });
  const financialAccounts = (payload.financialAccounts ?? []).map((row) => { const metadata = object(row.metadata); return { id: text(row.id), customerName: text(row.customer_name, "Contato não identificado"), customerEmail: text(metadata.customerEmail) || undefined, document: text(row.document, "Sem documento"), amount: number(row.amount), dueDate: text(row.due_date), direction: text(row.direction) === "payable" ? "payable" as const : "receivable" as const, status: (["paid", "overdue", "cancelled"].includes(text(row.status)) ? text(row.status) : "open") as "open" | "paid" | "overdue" | "cancelled", source: text(row.source) === "conta-azul" ? "conta-azul" as const : "api" as const, createdAt: shortDate(row.created_at) }; });
  const financialBalances = (payload.financialBalances ?? []).map((row) => ({ id: text(row.id), accountName: text(row.account_name, "Conta financeira"), accountType: text(row.account_type) || undefined, balance: number(row.balance), provider: text(row.provider), balanceAt: text(row.balance_at) }));
  return { employees, tasks, approvals, activities, integrations, financialAccounts, financialBalances, financialCollectionEvents: [], financialDocuments: [], financialEntries: [], anaAuditEvents: [], financialHandoffs: [], financialBudgets: [], procurementRequests: [], suppliers: [], supplierQuotes: [], supportCases: [], salesLeads: [] };
}
