import type { CollectionPriority, FinancialAccount, FinancialRisk } from "@/types/domain";

export interface ReceivableAssessment {
  account: FinancialAccount;
  daysOverdue: number;
  customerExposure: number;
  score: number;
  risk: FinancialRisk;
  priority: CollectionPriority;
  reasons: string[];
}

export interface LocalReceivablesAnalysis {
  analyzed: number;
  overdue: FinancialAccount[];
  overdueTotal: number;
  assessments: ReceivableAssessment[];
}

export function analyzeLocalReceivables(accounts: FinancialAccount[], today: string): LocalReceivablesAnalysis {
  const overdue = accounts.filter((item) => item.status !== "paid" && (item.status === "overdue" || item.dueDate < today));
  const dayInMs = 86_400_000;
  const todayTime = new Date(`${today}T12:00:00Z`).getTime();
  const exposureByCustomer = new Map<string, number>();
  for (const account of accounts.filter((item) => item.status !== "paid")) {
    const key = account.customerName.trim().toLocaleLowerCase("pt-BR");
    exposureByCustomer.set(key, (exposureByCustomer.get(key) ?? 0) + account.amount);
  }
  const assessments = overdue.map((account): ReceivableAssessment => {
    const dueTime = new Date(`${account.dueDate}T12:00:00Z`).getTime();
    const daysOverdue = Math.max(0, Math.floor((todayTime - dueTime) / dayInMs));
    const customerExposure = exposureByCustomer.get(account.customerName.trim().toLocaleLowerCase("pt-BR")) ?? account.amount;
    const agePoints = daysOverdue >= 30 ? 45 : daysOverdue >= 15 ? 30 : daysOverdue >= 7 ? 20 : 10;
    const amountPoints = account.amount >= 5_000 ? 35 : account.amount >= 2_000 ? 25 : account.amount >= 500 ? 15 : 5;
    const exposurePoints = customerExposure >= 10_000 ? 20 : customerExposure >= 5_000 ? 12 : 5;
    const score = agePoints + amountPoints + exposurePoints;
    const risk: FinancialRisk = score >= 65 ? "alto" : score >= 35 ? "médio" : "baixo";
    const priority: CollectionPriority = risk === "alto" || daysOverdue >= 30 ? "urgente" : risk === "médio" ? "alta" : daysOverdue >= 7 ? "média" : "baixa";
    const reasons = [
      `${daysOverdue} dia(s) em atraso`,
      `Título de ${account.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
      customerExposure > account.amount ? `Exposição total do cliente: ${customerExposure.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : "Único título em aberto do cliente",
    ];
    return { account, daysOverdue, customerExposure, score, risk, priority, reasons };
  }).sort((left, right) => right.score - left.score || right.daysOverdue - left.daysOverdue || right.account.amount - left.account.amount);
  return {
    analyzed: accounts.length,
    overdue,
    overdueTotal: overdue.reduce((sum, item) => sum + item.amount, 0),
    assessments,
  };
}
