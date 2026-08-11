export type JsonObject = Record<string, unknown>;

export type Capability =
  | `email.${string}`
  | `files.${string}`
  | `calendar.${string}`
  | `finance.${string}`
  | `crm.${string}`
  | `messages.${string}`;

export type ConnectionStatus = "connected" | "disconnected" | "expired" | "error" | "requires_reauth";
export type AutonomyLevel = "observe_only" | "suggest" | "approval_required" | "automatic" | "automatic_with_limits";
export type ActionStatus = "pending" | "awaiting_approval" | "executing" | "succeeded" | "failed" | "rejected";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired" | "executed" | "failed";

export interface IntegrationConnection {
  id: string;
  organizationId: string;
  provider: string;
  status: ConnectionStatus;
  accountIdentifier?: string;
  scopes: string[];
  capabilities: Capability[];
  credentialsReference?: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
  lastSyncAt?: string;
  tokenExpiresAt?: string;
  metadata: JsonObject;
  health: { status: "healthy" | "degraded" | "down" | "unknown"; lastCheckedAt?: string; message?: string };
}

export interface NormalizedModels {
  payable: { id: string; externalId?: string; provider: string; supplier: string; amount: number; dueDate: string; status: string; description?: string; documentNumber?: string; metadata: JsonObject };
  email: { id: string; externalId: string; provider: string; from: string; to: string[]; subject: string; receivedAt: string; attachments: Array<{ id: string; name: string; mimeType: string; size?: number }> };
}

export interface ProviderActionRequest {
  capability: Capability;
  input: JsonObject;
  idempotencyKey: string;
  connection: IntegrationConnection;
  signal?: AbortSignal;
}

export interface ProviderActionResult {
  externalId?: string;
  data: unknown;
  rateLimit?: { remaining?: number; resetAt?: string };
}

export interface CrewIntegrationAdapter {
  readonly key: string;
  readonly name: string;
  readonly capabilities: ReadonlySet<Capability>;
  connect?(input: JsonObject): Promise<{ accountIdentifier?: string; metadata?: JsonObject }>;
  disconnect?(connection: IntegrationConnection): Promise<void>;
  testConnection(connection: IntegrationConnection): Promise<{ ok: boolean; message?: string }>;
  executeAction(request: ProviderActionRequest): Promise<ProviderActionResult>;
  sync?(connection: IntegrationConnection, cursor?: string): Promise<{ cursor?: string; events: CrewEvent[] }>;
  verifyWebhook?(input: { rawBody: string; headers: Headers; connection: IntegrationConnection }): Promise<boolean> | boolean;
  normalizeWebhook?(input: { rawBody: string; headers: Headers; connection: IntegrationConnection }): Promise<CrewEvent[]> | CrewEvent[];
}

export interface AutonomyPolicy {
  id: string;
  organizationId: string;
  employeeId?: string;
  capability: Capability | "*";
  level: AutonomyLevel;
  limits?: { amount?: number; currency?: string; perDay?: number };
  active: boolean;
}

export interface IntegrationAction {
  id: string;
  organizationId: string;
  employeeId: string;
  taskId?: string;
  connectionId: string;
  provider: string;
  capability: Capability;
  idempotencyKey: string;
  input: JsonObject;
  status: ActionStatus;
  approvalId?: string;
  output?: unknown;
  externalId?: string;
  error?: { code: string; message: string; retryable: boolean };
  createdAt: string;
  completedAt?: string;
}

export interface ActionApproval {
  id: string;
  organizationId: string;
  employeeId: string;
  taskId?: string;
  actionId: string;
  capability: Capability;
  provider: string;
  description: string;
  sanitizedPayload: JsonObject;
  reason: string;
  riskLevel: "low" | "medium" | "high";
  status: ApprovalStatus;
  requestedAt: string;
}

export interface CrewEvent {
  id: string;
  organizationId: string;
  type: string;
  source: string;
  provider?: string;
  connectionId?: string;
  externalId?: string;
  idempotencyKey: string;
  occurredAt: string;
  data: JsonObject;
  untrusted: boolean;
}

export interface TriggerRule {
  id: string;
  organizationId: string;
  eventType: string;
  employeeId: string;
  active: boolean;
  conditions: Array<{ path: string; operator: "equals" | "includes" | "exists"; value?: unknown }>;
  task: { title: string; description: string; priority: "baixa" | "media" | "alta" | "urgente"; requiresApproval: boolean };
}

export interface ExecuteActionInput {
  organizationId: string;
  employeeId: string;
  capability: Capability;
  input: JsonObject;
  taskId?: string;
  idempotencyKey: string;
  context?: JsonObject;
}

export type ExecuteActionResult =
  | { success: true; actionId: string; provider: string; capability: Capability; externalId?: string; requiresApproval: false; data: unknown }
  | { success: false; actionId?: string; provider?: string; capability: Capability; requiresApproval: boolean; approvalId?: string; error: { code: string; message: string; retryable: boolean } };
