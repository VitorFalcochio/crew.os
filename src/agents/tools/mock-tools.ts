import type { EmployeeTool, ToolContext, ToolResult } from "../core/contracts";

interface Account { customer: string; amount: number; dueDate: string; status: "a vencer" | "atrasada" | "paga" }
const accounts: Account[] = [
  { customer: "Incorporadora Vale", amount: 8200, dueDate: "2026-08-04", status: "atrasada" },
  { customer: "Residencial Aurora", amount: 5940, dueDate: "2026-08-01", status: "atrasada" },
  { customer: "Obras Monte Azul", amount: 4600, dueDate: "2026-07-29", status: "atrasada" },
  { customer: "Construtora Pátio", amount: 12900, dueDate: "2026-08-09", status: "a vencer" },
  { customer: "Edifício Horizonte", amount: 17600, dueDate: "2026-08-11", status: "a vencer" },
];

abstract class TrackedTool<TInput, TOutput> implements EmployeeTool<TInput, TOutput> {
  abstract readonly key: string; abstract readonly name: string; abstract readonly description: string; abstract readonly requiresApproval: boolean;
  async execute(input: TInput, context: ToolContext): Promise<ToolResult<TOutput>> {
    if (this.requiresApproval && !context.approved) return { ok: false, error: "APPROVAL_REQUIRED" };
    const result = await this.run(input);
    await context.recordActivity(`${this.name} executada`, { tool: this.key, ok: result.ok });
    return result;
  }
  protected abstract run(input: TInput): Promise<ToolResult<TOutput>>;
}

export class ConsultAccountsTool extends TrackedTool<{ days: number }, Account[]> {
  readonly key = "consult_accounts"; readonly name = "Consultar contas"; readonly description = "Consulta contas a pagar e receber."; readonly requiresApproval = false;
  protected async run() { return { ok: true, data: accounts }; }
}
export class GenerateCollectionTool extends TrackedTool<{ accounts: Account[] }, { drafts: number; total: number }> {
  readonly key = "generate_collection"; readonly name = "Gerar cobrança"; readonly description = "Prepara e envia cobranças autorizadas."; readonly requiresApproval = true;
  protected async run(input: { accounts: Account[] }) { return { ok: true, data: { drafts: input.accounts.length, total: input.accounts.reduce((sum, account) => sum + account.amount, 0) } }; }
}

export const toolRegistry = new Map<string, EmployeeTool>([["consult_accounts", new ConsultAccountsTool()], ["generate_collection", new GenerateCollectionTool()]]);
