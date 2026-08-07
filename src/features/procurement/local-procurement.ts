import type { ProcurementRequest, SupplierQuote } from "@/types/domain";

interface QuoteCandidate {
  supplierName: string;
  priceFactor: number;
  shippingFactor: number;
  leadTimeDays: number;
  paymentTerms: string;
  rating: number;
  risk: SupplierQuote["risk"];
}

const candidates: QuoteCandidate[] = [
  { supplierName: "Vértice Suprimentos", priceFactor: .91, shippingFactor: .018, leadTimeDays: 7, paymentTerms: "28 dias", rating: 4.7, risk: "baixo" },
  { supplierName: "Nova Base Materiais", priceFactor: .86, shippingFactor: .035, leadTimeDays: 14, paymentTerms: "21 dias", rating: 4.2, risk: "médio" },
  { supplierName: "Atlas Distribuidora", priceFactor: .98, shippingFactor: 0, leadTimeDays: 4, paymentTerms: "35 dias", rating: 4.8, risk: "baixo" },
];

function riskPenalty(risk: SupplierQuote["risk"]) {
  return risk === "alto" ? 1 : risk === "médio" ? .5 : 0;
}

export function buildLocalSupplierComparison(
  request: Pick<ProcurementRequest, "id" | "budget" | "quantity">,
  createId: () => string,
) {
  const quotes: SupplierQuote[] = candidates.map((candidate) => {
    const subtotal = request.budget * candidate.priceFactor;
    const shipping = request.budget * candidate.shippingFactor;
    return {
      id: createId(),
      requestId: request.id,
      supplierName: candidate.supplierName,
      unitPrice: subtotal / request.quantity,
      shipping,
      total: subtotal + shipping,
      leadTimeDays: candidate.leadTimeDays,
      paymentTerms: candidate.paymentTerms,
      rating: candidate.rating,
      risk: candidate.risk,
    };
  });
  const maxTotal = Math.max(...quotes.map((quote) => quote.total));
  const maxLeadTime = Math.max(...quotes.map((quote) => quote.leadTimeDays));
  const score = (quote: SupplierQuote) =>
    (quote.total / maxTotal) * .65 +
    (quote.leadTimeDays / maxLeadTime) * .1 +
    ((5 - quote.rating) / 5) * .15 +
    riskPenalty(quote.risk) * .1;
  const recommended = [...quotes].sort((a, b) => score(a) - score(b))[0];
  return { quotes, recommended, score: score(recommended) };
}
