export type EmployeeStatus = "trabalhando" | "aguardando aprovação" | "disponível" | "pausado" | "com erro" | "configurando";
export type TaskStatus = "recebida" | "planejando" | "executando" | "aguardando ferramenta" | "aguardando aprovação" | "concluída" | "falhou" | "cancelada";
export type Priority = "baixa" | "média" | "alta" | "urgente";

export interface Employee {
  id: string;
  name: string;
  initials: string;
  role: string;
  department: string;
  level: string;
  description: string;
  status: EmployeeStatus;
  currentTask: string;
  tasksCompleted: number;
  performance: number;
  successRate: number;
  averageTime: string;
  savings: number;
  monthlyPrice: number;
  hired: boolean;
  color: string;
  skills: string[];
  responsibilities: string[];
  tools: string[];
}

export interface Task {
  id: string;
  employeeId: string;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  dueAt: string;
  requiresApproval: boolean;
  createdAt: string;
  result?: string;
}

export interface Approval {
  id: string;
  taskId: string;
  employeeId: string;
  title: string;
  description: string;
  impact: string;
  risk: "baixo" | "médio" | "alto";
  status: "pendente" | "aprovada" | "recusada" | "ajuste solicitado";
  amount?: number;
  relatedAccountIds?: string[];
  requestedAt: string;
}

export interface Activity {
  id: string;
  employeeId?: string;
  taskId?: string;
  title: string;
  description: string;
  type: "tarefa" | "aprovação" | "ferramenta" | "colaboração" | "sistema";
  createdAt: string;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  connected: boolean;
  initials: string;
}

export interface FinancialAccount {
  id: string;
  customerName: string;
  document: string;
  amount: number;
  dueDate: string;
  status: "open" | "paid" | "overdue";
  source: "manual" | "sample" | "api";
  createdAt: string;
}

export type FinancialRisk = "baixo" | "médio" | "alto";
export type CollectionPriority = "baixa" | "média" | "alta" | "urgente";

export interface FinancialCollectionEvent {
  id: string;
  accountId: string;
  customerName: string;
  document: string;
  eventType: "analysis" | "approval" | "refusal" | "adjustment";
  title: string;
  description: string;
  risk: FinancialRisk;
  priority: CollectionPriority;
  daysOverdue: number;
  amount: number;
  createdAt: string;
}

export interface DemoState {
  employees: Employee[];
  tasks: Task[];
  approvals: Approval[];
  activities: Activity[];
  integrations: Integration[];
  financialAccounts: FinancialAccount[];
  financialCollectionEvents: FinancialCollectionEvent[];
}
