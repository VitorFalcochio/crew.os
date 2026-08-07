import assert from "node:assert/strict";
import test from "node:test";
import { buildLocalSupplierComparison } from "../src/features/procurement/local-procurement";

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
