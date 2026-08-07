import assert from "node:assert/strict";
import test from "node:test";
import { answerEmployeeQuestion, buildEmployeeChatContext } from "../src/features/crew/employee-chat";
import type { Employee } from "../src/types/domain";

const ana = { id: "ana", name: "Ana", role: "Financeiro Digital", department: "Financeiro", skills: ["Fluxo de caixa"], responsibilities: ["Organizar contas"] } as Employee;
const carlos = { id: "carlos", name: "Carlos", role: "Compras", department: "Compras", skills: ["Cotações"], responsibilities: ["Comparar fornecedores"] } as Employee;
const baseState = { tasks: [], approvals: [], financialEntries: [], financialDocuments: [], procurementRequests: [], supplierQuotes: [] };

test("o chat da Ana responde usando os dados financeiros locais", () => {
  const state = { ...baseState, financialEntries: [{ id: "entry-1", direction: "payable" as const, counterparty: "Fornecedor", description: "Material", amount: 2500, paidAmount: 0, dueDate: "2026-08-12", status: "open" as const, category: "Materiais", sourceDocumentIds: [], createdAt: "Agora" }] };
  const answer = answerEmployeeQuestion(ana, "Quanto tenho para pagar?", state);
  assert.match(answer, /R\$\s*2\.500,00/);
});

test("o chat do Carlos mantém contexto exclusivo de compras", () => {
  const context = buildEmployeeChatContext(carlos, baseState, "Construtora Alpha");
  assert.match(context, /procurementRequests/);
  assert.doesNotMatch(context, /financialEntries/);
  assert.match(answerEmployeeQuestion(carlos, "O que aguarda aprovação?", baseState), /Não há recomendações/);
});
