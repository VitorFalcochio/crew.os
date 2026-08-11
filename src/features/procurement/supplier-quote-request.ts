import { collectionIdempotencyKey, collectionMessageId, validateCollectionDraft } from "@/features/finance/collection-email";
import type { ProcurementRequest, SupplierContact } from "@/types/domain";

export function buildSupplierQuoteRequestDraft(input: { companyName: string; request: ProcurementRequest; supplier: SupplierContact }) {
  const request = input.request;
  const subject = `Solicitação de cotação — ${request.title} — ${input.companyName}`;
  const body = [
    `Olá, equipe da ${input.supplier.name}.`, "",
    `${input.companyName} solicita uma cotação para a necessidade abaixo:`, "",
    `- Item/serviço: ${request.title}`,
    `- Categoria: ${request.category}`,
    `- Quantidade: ${request.quantity}`,
    `- Projeto: ${request.project}`,
    `- Necessário até: ${new Intl.DateTimeFormat("pt-BR").format(new Date(`${request.neededBy}T12:00:00`))}`,
    ...(request.notes.trim() ? [`- Especificações: ${request.notes.trim()}`] : []), "",
    "Por favor, informe preço unitário e total, impostos, frete, prazo de entrega, condições de pagamento e validade da proposta.", "",
    "Esta mensagem é uma solicitação de cotação e não representa pedido ou compromisso de compra.", "", "Atenciosamente,", `Carlos · Compras`, input.companyName,
  ].join("\n");
  return validateCollectionDraft({ to: input.supplier.email, subject, body });
}

export function supplierQuoteRequestIdempotency(taskId: string, supplier: SupplierContact) { return collectionIdempotencyKey(taskId, supplier.email, supplier.id); }
export function supplierQuoteRequestMessageId(actionId: string) { return collectionMessageId(`quote-${actionId}`); }
