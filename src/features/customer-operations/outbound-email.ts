import { collectionIdempotencyKey, collectionMessageId, isValidCollectionEmail, normalizeCollectionEmail, validateCollectionDraft } from "@/features/finance/collection-email";
import type { SalesLead, SupportCase } from "@/types/domain";

export function buildSupportReplyDraft(input: { companyName: string; supportCase: SupportCase }) {
  const item = input.supportCase;
  return validateCollectionDraft({
    to: item.customerEmail,
    subject: /^re:/i.test(item.subject) ? item.subject : `Re: ${item.subject}`,
    body: [
      `Olá, ${item.customerName}.`, "",
      "Recebemos sua mensagem e entendemos a sua solicitação.", "",
      "[Revise aqui a orientação ou solução antes do envio.]", "",
      "Se esta resposta não resolver completamente o caso, responda a este e-mail com mais detalhes para continuarmos o atendimento.", "",
      "Atenciosamente,", `Sofia · Atendimento`, input.companyName.trim() || "CrewOS",
    ].join("\n"),
  });
}

export function buildSalesFollowupDraft(input: { companyName: string; lead: SalesLead }) {
  const lead = input.lead;
  return validateCollectionDraft({
    to: lead.email,
    subject: `Próximo passo — ${lead.companyName}`,
    body: [
      `Olá, ${lead.contactName}.`, "",
      `Estou retomando nosso contato sobre ${lead.context.trim() || "a oportunidade que conversamos"}.`, "",
      "Quero entender se este tema ainda é uma prioridade e qual seria o melhor próximo passo para vocês. Se fizer sentido, podemos marcar uma conversa breve.", "",
      "Fico à disposição.", "", "Atenciosamente,", `Lucas · Comercial`, input.companyName.trim() || "CrewOS",
    ].join("\n"),
  });
}

export function outboundEmailIdempotency(taskId: string, kind: "support_reply" | "sales_followup", entityId: string, email: string) {
  return collectionIdempotencyKey(taskId, email, `${kind}:${entityId}`);
}

export function outboundEmailMessageId(kind: "support_reply" | "sales_followup", actionId: string) {
  return collectionMessageId(`${kind === "support_reply" ? "support" : "sales"}-${actionId}`);
}

export interface ParsedLeadRow { contactName: string; companyName: string; email: string; context: string; estimatedValue?: number }

function parseCsvLine(line: string, separator: string) {
  const cells: string[] = []; let value = ""; let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === separator && !quoted) { cells.push(value.trim()); value = ""; }
    else value += char;
  }
  cells.push(value.trim()); return cells;
}

export function parseSalesLeadCsv(content: string) {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("O CSV precisa ter cabeçalho e ao menos um lead");
  if (lines.length > 501) throw new Error("Importe no máximo 500 leads por vez");
  const separator = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const headers = parseCsvLine(lines[0], separator).map((value) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, ""));
  const at = (...names: string[]) => names.map((name) => headers.indexOf(name)).find((index) => index >= 0) ?? -1;
  const contactIndex = at("nome", "contato", "nomedocontato"); const companyIndex = at("empresa", "cliente"); const emailIndex = at("email", "e-mail");
  const contextIndex = at("contexto", "interesse", "observacoes"); const valueIndex = at("valor", "valorestimado");
  if (contactIndex < 0 || companyIndex < 0 || emailIndex < 0) throw new Error("Use as colunas nome, empresa e email");
  const items: ParsedLeadRow[] = []; const errors: string[] = []; const seen = new Set<string>();
  lines.slice(1).forEach((line, offset) => {
    const cells = parseCsvLine(line, separator); const email = normalizeCollectionEmail(cells[emailIndex] ?? "");
    const contactName = (cells[contactIndex] ?? "").trim(); const companyName = (cells[companyIndex] ?? "").trim();
    if (!contactName || !companyName || !isValidCollectionEmail(email)) { errors.push(`Linha ${offset + 2}: nome, empresa ou e-mail inválido`); return; }
    if (seen.has(email)) { errors.push(`Linha ${offset + 2}: e-mail duplicado no arquivo`); return; }
    seen.add(email); const rawValue = (cells[valueIndex] ?? "").replace(/[^0-9,.-]/g, "").replace(".", "").replace(",", ".");
    items.push({ contactName, companyName, email, context: (cells[contextIndex] ?? "").trim(), ...(rawValue && Number(rawValue) > 0 ? { estimatedValue: Number(rawValue) } : {}) });
  });
  return { items, errors };
}
