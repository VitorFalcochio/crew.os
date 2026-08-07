import type { AnaAuditEvent, FinancialDocument, FinancialEntry } from "@/types/domain";
import type { ParsedFinancialDocument } from "./document-intelligence";

const normalize = (value?: string) => value?.trim().toLocaleLowerCase("pt-BR") ?? "";

export function organizeFinancialDocuments(input: { parsed: ParsedFinancialDocument[]; documents: FinancialDocument[]; entries: FinancialEntry[]; now: string; createId: () => string }) {
  const documents = [...input.documents];
  const entries = input.entries.map((entry) => ({ ...entry, sourceDocumentIds: [...entry.sourceDocumentIds] }));
  const createdDocuments: FinancialDocument[] = [];
  let duplicates = 0;
  let reviews = 0;

  for (const parsed of input.parsed) {
    const exactDuplicate = documents.find((document) => document.hash === parsed.hash);
    const probableDuplicate = exactDuplicate ? undefined : documents.find((document) => parsed.documentNumber && document.documentNumber === parsed.documentNumber && document.amount === parsed.amount && normalize(document.counterparty) === normalize(parsed.counterparty));
    const duplicateOf = exactDuplicate?.id ?? probableDuplicate?.id;
    const related = documents.filter((document) => !duplicateOf && parsed.amount && document.amount === parsed.amount && normalize(document.counterparty) && normalize(document.counterparty) === normalize(parsed.counterparty)).map((document) => document.id);
    let status: FinancialDocument["status"] = duplicateOf ? "duplicate" : parsed.type === "other" ? "unidentified" : parsed.confidence < .55 || !parsed.amount || parsed.direction === "neutral" ? "review" : "processed";
    if (parsed.direction !== "neutral" && parsed.amount && !parsed.dueDate && !["payment_proof", "receipt"].includes(parsed.type)) status = "review";
    if (status === "duplicate") duplicates += 1;
    if (["review", "unidentified"].includes(status)) reviews += 1;
    const document: FinancialDocument = { id: input.createId(), fileName: parsed.fileName, mimeType: parsed.mimeType, size: parsed.size, hash: parsed.hash, type: parsed.type, direction: parsed.direction, status, confidence: parsed.confidence, counterparty: parsed.counterparty, taxId: parsed.taxId, documentNumber: parsed.documentNumber, amount: parsed.amount, dueDate: parsed.dueDate, issueDate: parsed.issueDate, barcode: parsed.barcode, category: parsed.category, duplicateOf, relatedDocumentIds: related, notes: parsed.notes, textExcerpt: parsed.textExcerpt, createdAt: input.now };
    for (const relatedId of related) {
      const index = documents.findIndex((item) => item.id === relatedId);
      if (index >= 0 && !documents[index].relatedDocumentIds.includes(document.id)) documents[index] = { ...documents[index], relatedDocumentIds: [...documents[index].relatedDocumentIds, document.id] };
    }
    documents.unshift(document);
    createdDocuments.push(document);
    if (status !== "processed" || duplicateOf || !parsed.amount || parsed.direction === "neutral") continue;

    const matchingEntry = entries.find((entry) => entry.amount === parsed.amount && normalize(entry.counterparty) === normalize(parsed.counterparty) && (!parsed.dueDate || entry.dueDate === parsed.dueDate));
    if (matchingEntry) {
      matchingEntry.sourceDocumentIds.push(document.id);
      if (parsed.type === "payment_proof") { matchingEntry.paidAmount = matchingEntry.amount; matchingEntry.status = "paid"; }
      continue;
    }
    if (parsed.type === "payment_proof" || !parsed.dueDate) continue;
    entries.unshift({ id: input.createId(), direction: parsed.direction, counterparty: parsed.counterparty ?? "Não identificado", description: `${parsed.type === "invoice" ? "Nota fiscal" : parsed.type === "boleto" ? "Boleto" : "Documento"}${parsed.documentNumber ? ` ${parsed.documentNumber}` : ""}`, amount: parsed.amount, paidAmount: 0, dueDate: parsed.dueDate, status: parsed.dueDate < input.now.slice(0, 10) ? "overdue" : "open", category: parsed.category, sourceDocumentIds: [document.id], createdAt: input.now });
  }

  const audit: AnaAuditEvent = { id: input.createId(), action: "Processamento de documentos", reason: `${createdDocuments.length} arquivo(s) recebido(s), ${duplicates} duplicidade(s) e ${reviews} item(ns) para revisão.`, dataUsed: createdDocuments.map((document) => document.fileName), autonomy: "observar", createdAt: input.now };
  return { documents, entries, createdDocuments, audit, duplicates, reviews };
}

export function buildFinancialOverview(entries: FinancialEntry[], documents: FinancialDocument[], today: string) {
  const open = entries.filter((entry) => entry.status !== "paid");
  const sum = (items: FinancialEntry[]) => items.reduce((total, entry) => total + Math.max(0, entry.amount - entry.paidAmount), 0);
  const payables = open.filter((entry) => entry.direction === "payable");
  const receivables = open.filter((entry) => entry.direction === "receivable");
  const horizon = (days: number) => {
    const end = new Date(`${today}T12:00:00`); end.setDate(end.getDate() + days);
    const endDate = end.toISOString().slice(0, 10);
    const due = open.filter((entry) => entry.dueDate >= today && entry.dueDate <= endDate);
    return { days, incoming: sum(due.filter((entry) => entry.direction === "receivable")), outgoing: sum(due.filter((entry) => entry.direction === "payable")) };
  };
  const nextSeven = horizon(7);
  const overduePayables = payables.filter((entry) => entry.dueDate < today);
  const overdueReceivables = receivables.filter((entry) => entry.dueDate < today);
  const duplicateCount = documents.filter((document) => document.status === "duplicate").length;
  const reviewCount = documents.filter((document) => ["review", "unidentified"].includes(document.status)).length;
  const radar = [
    ...(duplicateCount ? [{ severity: "alta" as const, title: `${duplicateCount} possível(is) duplicidade(s)`, description: "Revise antes de registrar ou pagar novamente.", department: "Compras" as const }] : []),
    ...(overdueReceivables.length ? [{ severity: "alta" as const, title: `${overdueReceivables.length} recebimento(s) atrasado(s)`, description: `${sum(overdueReceivables).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} aguardam cobrança.`, department: "Comercial" as const }] : []),
    ...(overduePayables.length ? [{ severity: "média" as const, title: `${overduePayables.length} pagamento(s) atrasado(s)`, description: "Há risco de multa ou interrupção do fornecedor.", department: "Compras" as const }] : []),
    ...(reviewCount ? [{ severity: "média" as const, title: `${reviewCount} documento(s) precisam de revisão`, description: "A Ana preservou os dados e não criou lançamentos incertos.", department: "Atendimento" as const }] : []),
  ];
  const recurringGroups = new Map<string, FinancialEntry[]>();
  for (const entry of entries.filter((item) => item.direction === "payable")) { const key = `${normalize(entry.counterparty)}|${entry.category}`; recurringGroups.set(key, [...(recurringGroups.get(key) ?? []), entry]); }
  const recurring = [...recurringGroups.values()].filter((items) => items.length >= 2).map((items) => ({ counterparty: items[0].counterparty, category: items[0].category, occurrences: items.length, average: items.reduce((sumValue, item) => sumValue + item.amount, 0) / items.length }));
  return { payablesTotal: sum(payables), receivablesTotal: sum(receivables), overduePayables, overdueReceivables, nextSeven, projections: [7, 15, 30, 60, 90].map(horizon), radar, recurring };
}

export function answerFinancialQuestion(question: string, overview: ReturnType<typeof buildFinancialOverview>) {
  const query = normalize(question);
  const brl = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  if (/pagar|sa[ií]da|vence/.test(query)) return `Há ${brl(overview.payablesTotal)} em contas a pagar abertas. Nos próximos 7 dias, vencem ${brl(overview.nextSeven.outgoing)}.`;
  if (/receber|devendo|inadimpl|atras/.test(query)) return `Há ${brl(overview.receivablesTotal)} a receber. ${overview.overdueReceivables.length} conta(s), somando ${brl(overview.overdueReceivables.reduce((sum, item) => sum + item.amount - item.paidAmount, 0))}, estão atrasadas.`;
  if (/caixa|saldo|proje/.test(query)) return `Sem considerar saldo bancário inicial, os próximos 30 dias projetam ${brl(overview.projections[2].incoming)} de entradas e ${brl(overview.projections[2].outgoing)} de saídas, resultado líquido de ${brl(overview.projections[2].incoming - overview.projections[2].outgoing)}.`;
  if (/radar|risco|anormal|problema/.test(query)) return overview.radar.length ? `Encontrei ${overview.radar.length} ponto(s) de atenção. O principal é: ${overview.radar[0].title}. ${overview.radar[0].description}` : "Não encontrei anomalias nos dados disponíveis agora.";
  return `Posso responder sobre contas a pagar, valores a receber, atrasos, projeção de caixa e alertas. Hoje há ${brl(overview.payablesTotal)} a pagar e ${brl(overview.receivablesTotal)} a receber.`;
}
