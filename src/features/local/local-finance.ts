import type { FinancialAccount } from "@/types/domain";

export interface LocalReceivablesAnalysis {
  analyzed: number;
  overdue: FinancialAccount[];
  overdueTotal: number;
}

export function analyzeLocalReceivables(accounts: FinancialAccount[], today: string): LocalReceivablesAnalysis {
  const overdue = accounts.filter((item) => item.status !== "paid" && (item.status === "overdue" || item.dueDate < today));
  return {
    analyzed: accounts.length,
    overdue,
    overdueTotal: overdue.reduce((sum, item) => sum + item.amount, 0),
  };
}
