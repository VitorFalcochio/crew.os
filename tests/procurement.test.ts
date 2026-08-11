import assert from "node:assert/strict";
import test from "node:test";
import { buildLocalSupplierComparison } from "../src/features/procurement/local-procurement";
import { parseSupplierCsv } from "../src/features/procurement/supplier-import";
import { buildSupplierQuoteRequestDraft, supplierQuoteRequestIdempotency } from "../src/features/procurement/supplier-quote-request";
import type { ProcurementRequest, SupplierContact } from "../src/types/domain";

test("Carlos compara custo total, prazo, avaliação e risco", () => {
  let sequence = 0;
  const result = buildLocalSupplierComparison(
    { id: "request-1", budget: 30_000, quantity: 500 },
    () => `quote-${++sequence}`,
  );

  assert.equal(result.quotes.length, 3);
  assert.equal(result.recommended.supplierName, "Vértice Suprimentos");
  assert.ok(result.recommended.total < 30_000);
  assert.equal(
    result.recommended.total,
    30_000 * .91 + 30_000 * .018,
    "o frete deve fazer parte do custo total",
  );
});

test("Carlos preserva a relação das propostas com a requisição", () => {
  const result = buildLocalSupplierComparison(
    { id: "request-42", budget: 12_000, quantity: 20 },
    () => crypto.randomUUID(),
  );

  assert.ok(result.quotes.every((quote) => quote.requestId === "request-42"));
  assert.ok(result.quotes.every((quote) => quote.unitPrice > 0));
});

test("Carlos importa fornecedores por CSV com vírgula ou ponto e vírgula", () => {
  const result = parseSupplierCsv('nome;email;cnpj;categorias\n"Materiais Alfa";compras@alfa.com.br;12.345.678/0001-90;Cimento|Aço\nBeta;vendas@beta.com.br;;Elétrica');
  assert.equal(result.suppliers.length, 2);
  assert.deepEqual(result.suppliers[0].categories, ["Cimento", "Aço"]);
  assert.equal(result.suppliers[1].email, "vendas@beta.com.br");
  assert.equal(result.errors.length, 0);
});

test("importação rejeita linha inválida e e-mail duplicado", () => {
  const result = parseSupplierCsv("nome,email\nAlfa,compras@alfa.com.br\nSem email,invalido\nAlfa 2,compras@alfa.com.br");
  assert.equal(result.suppliers.length, 1);
  assert.equal(result.errors.length, 2);
});

test("solicitação de cotação usa dados reais e declara ausência de compromisso", () => {
  const request: ProcurementRequest = { id: "req-1", title: "Cimento CP-II", category: "Materiais", quantity: 500, budget: 30_000, neededBy: "2026-08-25", project: "Obra Centro", notes: "Entrega fracionada", supplierIds: ["sup-1"], status: "quoting", createdAt: "2026-08-10" };
  const supplier: SupplierContact = { id: "sup-1", name: "Materiais Alfa", email: "compras@alfa.com.br", categories: ["Materiais"], notes: "", source: "manual", createdAt: "2026-08-10" };
  const draft = buildSupplierQuoteRequestDraft({ companyName: "Construtora Alpha", request, supplier });
  assert.match(draft.subject, /Cimento CP-II/);
  assert.match(draft.body, /500/);
  assert.match(draft.body, /não representa pedido ou compromisso de compra/);
  assert.equal(supplierQuoteRequestIdempotency("task-1", supplier), supplierQuoteRequestIdempotency("task-1", { ...supplier, email: " COMPRAS@ALFA.COM.BR " }));
});
