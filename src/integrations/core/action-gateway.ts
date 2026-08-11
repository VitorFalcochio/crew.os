import { randomUUID } from "node:crypto";
import { capabilityRegistry, type CapabilityRegistry } from "./capability-registry";
import { IntegrationError, toIntegrationError } from "./errors";
import { decideAutonomy } from "./policy-engine";
import { ProviderRegistry } from "./provider-registry";
import { IntegrationRateLimiter, withRetry } from "./reliability";
import type { IntegrationStore } from "./store";
import type { ActionApproval, ExecuteActionInput, ExecuteActionResult, IntegrationAction } from "./types";
import { assertNoSecurityOverrides, sanitize } from "../security/sanitize";

export class ActionGateway {
  constructor(private readonly store: IntegrationStore, private readonly providers: ProviderRegistry, private readonly capabilities: CapabilityRegistry = capabilityRegistry, private readonly now = () => new Date(), private readonly id = () => randomUUID(), private readonly limiter = new IntegrationRateLimiter()) {}

  async execute(input: ExecuteActionInput): Promise<ExecuteActionResult> {
    const definition = this.capabilities.get(input.capability);
    try { assertNoSecurityOverrides(input.input); } catch (error) { return this.failure(input.capability, new IntegrationError("INVALID_INPUT", (error as Error).message, false, 400)); }
    if (!await this.store.hasPermission(input.organizationId, input.employeeId, input.capability)) return this.failure(input.capability, new IntegrationError("PERMISSION_DENIED", "Funcionário sem permissão para esta capability", false, 403));
    let resolved;
    try { resolved = this.providers.resolve(input.capability, await this.store.listConnections(input.organizationId)); } catch (error) { return this.failure(input.capability, toIntegrationError(error)); }
    const action: IntegrationAction = { id: this.id(), organizationId: input.organizationId, employeeId: input.employeeId, taskId: input.taskId, connectionId: resolved.connection.id, provider: resolved.connection.provider, capability: input.capability, idempotencyKey: input.idempotencyKey, input: sanitize(input.input), status: "pending", createdAt: this.now().toISOString() };
    const reserved = await this.store.reserveAction(action);
    if (!reserved.created) {
      if (reserved.action.status === "succeeded") return { success: true, actionId: reserved.action.id, provider: reserved.action.provider, capability: reserved.action.capability, externalId: reserved.action.externalId, requiresApproval: false, data: reserved.action.output };
      return this.failure(input.capability, new IntegrationError("DUPLICATE_ACTION", `Ação já registrada com status ${reserved.action.status}`, false, 409), reserved.action);
    }
    const policies = await this.store.listAutonomyPolicies(input.organizationId, input.employeeId, input.capability);
    const decision = decideAutonomy({ capability: input.capability, payload: input.input, policies, critical: definition.critical });
    if (decision.requiresApproval) return this.requestApproval(action, decision.reason);
    return this.run(action, resolved.adapter);
  }

  async executeApproved(input: { organizationId: string; approvalId: string }): Promise<ExecuteActionResult> {
    const approval = await this.store.getApproval(input.organizationId, input.approvalId);
    if (!approval || approval.organizationId !== input.organizationId) return this.failure("finance.accountsPayable.create", new IntegrationError("ORGANIZATION_MISMATCH", "Approval não pertence à organização", false, 403));
    if (approval.status === "executed") { const action = await this.store.getAction(input.organizationId, approval.actionId); return action?.status === "succeeded" ? { success: true, actionId: action.id, provider: action.provider, capability: action.capability, externalId: action.externalId, requiresApproval: false, data: action.output } : this.failure(approval.capability, new IntegrationError("DUPLICATE_ACTION", "Approval já consumida", false, 409)); }
    if (approval.status !== "approved") return this.failure(approval.capability, new IntegrationError("APPROVAL_REQUIRED", "Approval ainda não foi aprovada", false, 409));
    const action = await this.store.getAction(input.organizationId, approval.actionId);
    if (!action || action.status !== "awaiting_approval") return this.failure(approval.capability, new IntegrationError("DUPLICATE_ACTION", "Ação não está disponível para execução", false, 409));
    const connection = (await this.store.listConnections(input.organizationId)).find((item) => item.id === action.connectionId);
    if (!connection) return this.failure(action.capability, new IntegrationError("INTEGRATION_NOT_CONNECTED", "Conexão original não está mais disponível", false, 409), action);
    const result = await this.run(action, this.providers.get(action.provider));
    await this.store.updateApproval(input.organizationId, approval.id, { status: result.success ? "executed" : "failed" });
    return result;
  }

  private async requestApproval(action: IntegrationAction, reason: string): Promise<ExecuteActionResult> {
    const approval: ActionApproval = { id: this.id(), organizationId: action.organizationId, employeeId: action.employeeId, taskId: action.taskId, actionId: action.id, capability: action.capability, provider: action.provider, description: `Executar ${action.capability} via ${action.provider}`, sanitizedPayload: sanitize(action.input), reason, riskLevel: action.capability.startsWith("finance.") ? "high" : "medium", status: "pending", requestedAt: this.now().toISOString() };
    await this.store.createApproval(approval); await this.store.updateAction(action.organizationId, action.id, { status: "awaiting_approval", approvalId: approval.id });
    await this.store.recordActivity({ organizationId: action.organizationId, employeeId: action.employeeId, taskId: action.taskId, title: "Aprovação solicitada", description: approval.description, metadata: { actionId: action.id, approvalId: approval.id, capability: action.capability } });
    return { success: false, actionId: action.id, provider: action.provider, capability: action.capability, requiresApproval: true, approvalId: approval.id, error: { code: "APPROVAL_REQUIRED", message: reason, retryable: false } };
  }

  private async run(action: IntegrationAction, adapter: ReturnType<ProviderRegistry["get"]>): Promise<ExecuteActionResult> {
    const started = Date.now(); await this.store.updateAction(action.organizationId, action.id, { status: "executing" });
    try {
      const connection = (await this.store.listConnections(action.organizationId)).find((item) => item.id === action.connectionId);
      if (!connection || connection.organizationId !== action.organizationId) throw new IntegrationError("ORGANIZATION_MISMATCH", "Conexão fora do tenant", false, 403);
      this.limiter.consume(`${action.organizationId}:${action.provider}:${action.connectionId}`);
      const result = await withRetry(() => adapter.executeAction({ capability: action.capability, input: action.input, idempotencyKey: action.idempotencyKey, connection }));
      await this.store.updateAction(action.organizationId, action.id, { status: "succeeded", output: sanitize(result.data), externalId: result.externalId, completedAt: this.now().toISOString() });
      await Promise.all([this.store.recordAudit({ organizationId: action.organizationId, employeeId: action.employeeId, taskId: action.taskId, actionId: action.id, capability: action.capability, provider: action.provider, status: "succeeded", input: sanitize(action.input), output: sanitize(result.data), durationMs: Date.now() - started, source: "action_gateway" }), this.store.recordActivity({ organizationId: action.organizationId, employeeId: action.employeeId, taskId: action.taskId, title: "Ação externa concluída", description: `${action.capability} executada via ${action.provider}`, metadata: { actionId: action.id, externalId: result.externalId } })]);
      return { success: true, actionId: action.id, provider: action.provider, capability: action.capability, externalId: result.externalId, requiresApproval: false, data: sanitize(result.data) };
    } catch (caught) {
      const error = toIntegrationError(caught); await this.store.updateAction(action.organizationId, action.id, { status: "failed", error: { code: error.code, message: error.message, retryable: error.retryable }, completedAt: this.now().toISOString() });
      await this.store.recordAudit({ organizationId: action.organizationId, employeeId: action.employeeId, taskId: action.taskId, actionId: action.id, capability: action.capability, provider: action.provider, status: "failed", input: sanitize(action.input), error: { code: error.code, message: error.message }, durationMs: Date.now() - started, source: "action_gateway" });
      return this.failure(action.capability, error, action);
    }
  }
  private failure(capability: ExecuteActionInput["capability"], error: IntegrationError, action?: IntegrationAction): ExecuteActionResult { return { success: false, actionId: action?.id, provider: action?.provider, capability, requiresApproval: error.code === "APPROVAL_REQUIRED", error: { code: error.code, message: error.message, retryable: error.retryable } }; }
}

export function createCrewActionTool(gateway: ActionGateway, trusted: { organizationId: string; employeeId: string; taskId?: string }) {
  return (input: { capability: ExecuteActionInput["capability"]; payload: ExecuteActionInput["input"]; idempotencyKey: string }) => gateway.execute({ ...trusted, capability: input.capability, input: input.payload, idempotencyKey: input.idempotencyKey });
}
