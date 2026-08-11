import type { ActionApproval, AutonomyPolicy, Capability, IntegrationAction, IntegrationConnection, JsonObject } from "./types";

export interface IntegrationStore {
  listConnections(organizationId: string): Promise<IntegrationConnection[]>;
  hasPermission(organizationId: string, employeeId: string, capability: Capability): Promise<boolean>;
  listAutonomyPolicies(organizationId: string, employeeId: string, capability: Capability): Promise<AutonomyPolicy[]>;
  reserveAction(action: IntegrationAction): Promise<{ created: boolean; action: IntegrationAction }>;
  updateAction(organizationId: string, actionId: string, changes: Partial<IntegrationAction>): Promise<IntegrationAction>;
  getAction(organizationId: string, actionId: string): Promise<IntegrationAction | undefined>;
  createApproval(approval: ActionApproval): Promise<ActionApproval>;
  getApproval(organizationId: string, approvalId: string): Promise<ActionApproval | undefined>;
  updateApproval(organizationId: string, approvalId: string, changes: Partial<ActionApproval>): Promise<ActionApproval>;
  recordAudit(input: { organizationId: string; employeeId: string; taskId?: string; actionId: string; capability: Capability; provider: string; status: string; input: JsonObject; output?: unknown; error?: unknown; durationMs?: number; source?: string }): Promise<void>;
  recordActivity(input: { organizationId: string; employeeId: string; taskId?: string; title: string; description: string; metadata?: JsonObject }): Promise<void>;
}

export class MemoryIntegrationStore implements IntegrationStore {
  readonly connections: IntegrationConnection[] = [];
  readonly permissions = new Set<string>();
  readonly policies: AutonomyPolicy[] = [];
  readonly actions: IntegrationAction[] = [];
  readonly approvals: ActionApproval[] = [];
  readonly audits: Array<Record<string, unknown>> = [];
  readonly activities: Array<Record<string, unknown>> = [];
  private key(org: string, employee: string, capability: string) { return `${org}:${employee}:${capability}`; }
  allow(org: string, employee: string, capability: Capability) { this.permissions.add(this.key(org, employee, capability)); }
  async listConnections(organizationId: string) { return this.connections.filter((item) => item.organizationId === organizationId); }
  async hasPermission(organizationId: string, employeeId: string, capability: Capability) { return this.permissions.has(this.key(organizationId, employeeId, capability)); }
  async listAutonomyPolicies(organizationId: string, employeeId: string, capability: Capability) { return this.policies.filter((item) => item.organizationId === organizationId && item.active && (!item.employeeId || item.employeeId === employeeId) && (item.capability === "*" || item.capability === capability)); }
  async reserveAction(action: IntegrationAction) { const found = this.actions.find((item) => item.organizationId === action.organizationId && item.idempotencyKey === action.idempotencyKey); if (found) return { created: false, action: found }; this.actions.push(action); return { created: true, action }; }
  async updateAction(org: string, id: string, changes: Partial<IntegrationAction>) { const item = this.actions.find((entry) => entry.organizationId === org && entry.id === id); if (!item) throw new Error("Action não encontrada"); Object.assign(item, changes); return item; }
  async getAction(org: string, id: string) { return this.actions.find((item) => item.organizationId === org && item.id === id); }
  async createApproval(approval: ActionApproval) { const found = this.approvals.find((item) => item.organizationId === approval.organizationId && item.actionId === approval.actionId); if (found) return found; this.approvals.push(approval); return approval; }
  async getApproval(org: string, id: string) { return this.approvals.find((item) => item.organizationId === org && item.id === id); }
  async updateApproval(org: string, id: string, changes: Partial<ActionApproval>) { const item = this.approvals.find((entry) => entry.organizationId === org && entry.id === id); if (!item) throw new Error("Approval não encontrada"); Object.assign(item, changes); return item; }
  async recordAudit(input: Record<string, unknown>) { this.audits.push(input); }
  async recordActivity(input: Record<string, unknown>) { this.activities.push(input); }
}
