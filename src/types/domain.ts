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
  relatedPurchaseRequestId?: string;
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

export type FinancialDocumentType = "invoice" | "boleto" | "receipt" | "payment_proof" | "statement" | "other";
export type FinancialDirection = "payable" | "receivable" | "neutral";

export interface FinancialDocument {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  hash: string;
  type: FinancialDocumentType;
  direction: FinancialDirection;
  status: "processed" | "review" | "duplicate" | "unidentified" | "error";
  confidence: number;
  counterparty?: string;
  taxId?: string;
  documentNumber?: string;
  amount?: number;
  dueDate?: string;
  issueDate?: string;
  barcode?: string;
  category: string;
  project?: string;
  costCenter?: string;
  duplicateOf?: string;
  relatedDocumentIds: string[];
  notes: string[];
  textExcerpt?: string;
  createdAt: string;
}

export interface FinancialEntry {
  id: string;
  direction: "payable" | "receivable";
  counterparty: string;
  description: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: "open" | "partial" | "paid" | "overdue";
  category: string;
  project?: string;
  costCenter?: string;
  sourceDocumentIds: string[];
  createdAt: string;
}

export interface AnaAuditEvent {
  id: string;
  action: string;
  reason: string;
  dataUsed: string[];
  autonomy: "observar" | "aprovar" | "executar";
  createdAt: string;
}

export interface FinancialHandoff {
  id: string;
  fromEmployeeId: "ana";
  toDepartment: "Comercial" | "Compras" | "Atendimento";
  title: string;
  context: string;
  status: "suggested" | "created" | "resolved";
  createdAt: string;
}

export interface FinancialBudget { id: string; category: string; limit: number; period: string; }

export type ProcurementRequestStatus = "quoting" | "recommended" | "awaiting_approval" | "approved" | "rejected";

export interface ProcurementRequest {
  id: string;
  title: string;
  category: string;
  quantity: number;
  budget: number;
  neededBy: string;
  project: string;
  notes: string;
  status: ProcurementRequestStatus;
  recommendedQuoteId?: string;
  createdAt: string;
}

export interface SupplierQuote {
  id: string;
  requestId: string;
  supplierName: string;
  unitPrice: number;
  shipping: number;
  total: number;
  leadTimeDays: number;
  paymentTerms: string;
  rating: number;
  risk: "baixo" | "médio" | "alto";
}

export interface DemoState {
  employees: Employee[];
  tasks: Task[];
  approvals: Approval[];
  activities: Activity[];
  integrations: Integration[];
  financialAccounts: FinancialAccount[];
  financialCollectionEvents: FinancialCollectionEvent[];
  financialDocuments: FinancialDocument[];
  financialEntries: FinancialEntry[];
  anaAuditEvents: AnaAuditEvent[];
  financialHandoffs: FinancialHandoff[];
  financialBudgets: FinancialBudget[];
  procurementRequests: ProcurementRequest[];
  supplierQuotes: SupplierQuote[];
}
