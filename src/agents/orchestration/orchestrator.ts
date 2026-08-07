import type { EmployeeRuntimeContext, EmployeeTool, ToolContext } from "../core/contracts";

export interface OrchestrationStore {
  loadContext(organizationId: string, employeeId: string, taskId: string): Promise<EmployeeRuntimeContext>;
  updateTask(taskId: string, status: string, output?: unknown): Promise<void>;
  createApproval(input: { taskId: string; employeeId: string; title: string; payload: unknown }): Promise<string>;
  recordActivity(input: { organizationId: string; employeeId: string; taskId: string; title: string; metadata?: Record<string, unknown> }): Promise<void>;
}

export class EmployeeOrchestrator {
  constructor(private readonly store: OrchestrationStore, private readonly tools: Map<string, EmployeeTool>) {}
  async runTool(input: { organizationId: string; employeeId: string; taskId: string; toolKey: string; payload: unknown; approved?: boolean }) {
    const context = await this.store.loadContext(input.organizationId, input.employeeId, input.taskId);
    const tool = this.tools.get(input.toolKey);
    if (!tool) throw new Error(`Ferramenta não encontrada: ${input.toolKey}`);
    if (!context.permissions.includes(input.toolKey)) throw new Error("Funcionário sem permissão para esta ferramenta");
    if (tool.requiresApproval && !input.approved) {
      const approvalId = await this.store.createApproval({ taskId: input.taskId, employeeId: input.employeeId, title: tool.name, payload: input.payload });
      await this.store.updateTask(input.taskId, "aguardando aprovação");
      return { status: "approval_required" as const, approvalId };
    }
    await this.store.updateTask(input.taskId, "executando");
    const toolContext: ToolContext = { organizationId: input.organizationId, employeeId: input.employeeId, taskId: input.taskId, approved: Boolean(input.approved), recordActivity: (title, metadata) => this.store.recordActivity({ organizationId: input.organizationId, employeeId: input.employeeId, taskId: input.taskId, title, metadata }) };
    const result = await tool.execute(input.payload, toolContext);
    if (!result.ok) { await this.store.updateTask(input.taskId, "falhou", { error: result.error }); return { status: "failed" as const, result }; }
    await this.store.updateTask(input.taskId, "concluída", result.data);
    return { status: "completed" as const, result };
  }
}
