import test from "node:test";
import assert from "node:assert/strict";
import { classifyFinancialText } from "../src/features/finance/document-intelligence";
import { answerFinancialQuestion, buildFinancialOverview, organizeFinancialDocuments } from "../src/features/finance/financial-operations";

const boleto = classifyFinancialText({ fileName: "boleto-fornecedor.pdf", mimeType: "application/pdf", size: 1200, hash: "hash-1", extractionMethod: "pdf-text", text: "BOLETO Fornecedor: Materiais Alfa CNPJ 12.345.678/0001-90 Valor do documento R$ 4.850,00 Vencimento 20/08/2026 linha digitável 12345678901234567890123456789012345678901234" });

test("extração identifica boleto e seus campos verificáveis", () => {
  assert.equal(boleto.type, "boleto");
  assert.equal(boleto.direction, "payable");
  assert.equal(boleto.amount, 4850);
  assert.equal(boleto.dueDate, "2026-08-20");
  assert.equal(boleto.taxId, "12.345.678/0001-90");
  assert.ok(boleto.barcode);
});

test("organização bloqueia arquivo duplicado e não duplica lançamento", () => {
  let sequence = 0;
  const first = organizeFinancialDocuments({ parsed: [boleto], documents: [], entries: [], now: "2026-08-07T12:00:00.000Z", createId: () => `id-${++sequence}` });
  const second = organizeFinancialDocuments({ parsed: [boleto], documents: first.documents, entries: first.entries, now: "2026-08-07T12:01:00.000Z", createId: () => `id-${++sequence}` });
  assert.equal(first.entries.length, 1);
  assert.equal(second.entries.length, 1);
  assert.equal(second.createdDocuments[0].status, "duplicate");
  assert.equal(second.duplicates, 1);
});

test("visão financeira projeta caixa e responde usando os lançamentos", () => {
  const entries = [{ id: "1", direction: "payable" as const, counterparty: "Alfa", description: "Boleto", amount: 1000, paidAmount: 0, dueDate: "2026-08-10", status: "open" as const, category: "Materiais", sourceDocumentIds: [], createdAt: "2026-08-07" }, { id: "2", direction: "receivable" as const, counterparty: "Beta", description: "NF", amount: 2500, paidAmount: 0, dueDate: "2026-08-12", status: "open" as const, category: "Receitas", sourceDocumentIds: [], createdAt: "2026-08-07" }];
  const overview = buildFinancialOverview(entries, [], "2026-08-07");
  assert.deepEqual(overview.nextSeven, { days: 7, incoming: 2500, outgoing: 1000 });
  assert.match(answerFinancialQuestion("quanto tenho para pagar?", overview), /R\$\s*1\.000,00/);
});

