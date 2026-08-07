import test from "node:test";
import assert from "node:assert/strict";
import { analyzeLocalReceivables } from "../src/features/local/local-finance";
import type { FinancialAccount } from "../src/types/domain";

const accounts: FinancialAccount[] = [
  { id: "1", customerName: "Cliente vencido", document: "NF-1", amount: 840, dueDate: "2026-08-01", status: "open", source: "manual", createdAt: "Agora" },
  { id: "2", customerName: "Cliente futuro", document: "NF-2", amount: 1200, dueDate: "2026-08-20", status: "open", source: "manual", createdAt: "Agora" },
  { id: "3", customerName: "Cliente pago", document: "NF-3", amount: 500, dueDate: "2026-07-01", status: "paid", source: "manual", createdAt: "Agora" },
  { id: "4", customerName: "Marcado vencido", document: "NF-4", amount: 160, dueDate: "2026-08-20", status: "overdue", source: "manual", createdAt: "Agora" },
];

test("Ana classifica somente recebíveis vencidos e não pagos", () => {
  const result = analyzeLocalReceivables(accounts, "2026-08-07");
  assert.equal(result.analyzed, 4);
  assert.deepEqual(result.overdue.map((account) => account.id), ["1", "4"]);
  assert.equal(result.overdueTotal, 1000);
});

test("análise vazia produz resultado verificável sem cobrança", () => {
  assert.deepEqual(analyzeLocalReceivables([], "2026-08-07"), { analyzed: 0, overdue: [], overdueTotal: 0, assessments: [] });
});

test("Ana prioriza maior risco usando atraso, valor e exposição do cliente", () => {
  const result = analyzeLocalReceivables([
    { id: "high", customerName: "Cliente A", document: "NF-A1", amount: 6000, dueDate: "2026-07-01", status: "overdue", source: "manual", createdAt: "Agora" },
    { id: "same-customer", customerName: "Cliente A", document: "NF-A2", amount: 5000, dueDate: "2026-08-20", status: "open", source: "manual", createdAt: "Agora" },
    { id: "low", customerName: "Cliente B", document: "NF-B1", amount: 200, dueDate: "2026-08-05", status: "overdue", source: "manual", createdAt: "Agora" },
  ], "2026-08-07");

  assert.equal(result.assessments[0].account.id, "high");
  assert.equal(result.assessments[0].risk, "alto");
  assert.equal(result.assessments[0].priority, "urgente");
  assert.equal(result.assessments[0].customerExposure, 11000);
  assert.equal(result.assessments[1].risk, "baixo");
});

test("classificação financeira é determinística e explica seus critérios", () => {
  const first = analyzeLocalReceivables(accounts, "2026-08-07");
  const second = analyzeLocalReceivables(accounts, "2026-08-07");
  assert.deepEqual(first.assessments, second.assessments);
  assert.equal(first.assessments[0].reasons.length, 3);
  assert.match(first.assessments[0].reasons[0], /dia\(s\) em atraso/);
});
