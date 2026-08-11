import test from "node:test";
import assert from "node:assert/strict";
import { buildSalesFollowupDraft, buildSupportReplyDraft, outboundEmailIdempotency, parseSalesLeadCsv } from "../src/features/customer-operations/outbound-email";
import type { SalesLead, SupportCase } from "../src/types/domain";

const supportCase: SupportCase = { id: "case-1", customerName: "Maria", customerEmail: "MARIA@EXAMPLE.COM", subject: "Dúvida sobre entrega", message: "Quando chega?", priority: "alta", status: "open", source: "manual", createdAt: "2026-08-10T10:00:00.000Z" };
const lead: SalesLead = { id: "lead-1", contactName: "João", companyName: "Acme", email: "joao@example.com", stage: "qualificado", context: "automação do financeiro", status: "active", source: "manual", createdAt: "2026-08-10T10:00:00.000Z" };

test("Sofia prepara resposta segura com destinatário normalizado", () => {
  const draft = buildSupportReplyDraft({ companyName: "Crew Teste", supportCase });
  assert.equal(draft.to, "maria@example.com"); assert.match(draft.subject, /^Re:/); assert.match(draft.body, /Sofia/); assert.match(draft.body, /Revise aqui/);
});

test("Lucas prepara follow-up sem desconto ou falsa urgência", () => {
  const draft = buildSalesFollowupDraft({ companyName: "Crew Teste", lead });
  assert.match(draft.body, /automação do financeiro/); assert.match(draft.body, /Lucas/); assert.doesNotMatch(draft.body, /desconto|imperdível|agora ou nunca/i);
});

test("idempotência separa tipo e entidade", () => {
  const first = outboundEmailIdempotency("task-1", "support_reply", "entity-1", "a@example.com");
  assert.equal(first, outboundEmailIdempotency("task-1", "support_reply", "entity-1", "A@example.com"));
  assert.notEqual(first, outboundEmailIdempotency("task-1", "sales_followup", "entity-1", "a@example.com"));
});

test("CSV de leads aceita ponto e vírgula, aspas e relata duplicidade", () => {
  const result = parseSalesLeadCsv('nome;empresa;email;contexto;valor\n"Ana Souza";Acme;ana@acme.com;"ERP, integração";12000\nOutra;Acme;ana@acme.com;Teste;100');
  assert.equal(result.items.length, 1); assert.equal(result.items[0].estimatedValue, 12000); assert.equal(result.errors.length, 1);
});

test("CSV exige cabeçalhos comerciais", () => {
  assert.throws(() => parseSalesLeadCsv("cliente;telefone\nAcme;123"), /nome, empresa e email/);
});
