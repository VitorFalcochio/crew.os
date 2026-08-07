import type { FinancialDirection, FinancialDocumentType } from "@/types/domain";

export interface ParsedFinancialDocument {
  fileName: string;
  mimeType: string;
  size: number;
  hash: string;
  type: FinancialDocumentType;
  direction: FinancialDirection;
  confidence: number;
  counterparty?: string;
  taxId?: string;
  documentNumber?: string;
  amount?: number;
  dueDate?: string;
  issueDate?: string;
  barcode?: string;
  category: string;
  notes: string[];
  textExcerpt?: string;
  extractionMethod: "pdf-text" | "ocr" | "plain-text" | "metadata";
}

function normalizeDate(value?: string) {
  if (!value) return undefined;
  const [day, month, year] = value.split("/").map(Number);
  if (!day || !month || !year) return undefined;
  return `${String(year).padStart(4, "20")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function money(value?: string) {
  if (!value) return undefined;
  const parsed = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function firstMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }
}

export function classifyFinancialText(input: { fileName: string; mimeType: string; size: number; hash: string; text: string; extractionMethod: ParsedFinancialDocument["extractionMethod"] }): ParsedFinancialDocument {
  const compact = input.text.replace(/\s+/g, " ").trim();
  const source = `${input.fileName} ${compact}`.toLocaleLowerCase("pt-BR");
  const type: FinancialDocumentType = /comprovante|pagamento efetuado|pix realizado/.test(source) ? "payment_proof" : /boleto|linha digitável|cedente|nosso número/.test(source) ? "boleto" : /nota fiscal|nf-e|nfe|danfe/.test(source) ? "invoice" : /recibo/.test(source) ? "receipt" : /extrato/.test(source) ? "statement" : "other";
  const direction: FinancialDirection = /conta.?a.?receber|cliente deve|receita|venda|emitida por nós|cobrança ao cliente/.test(source) ? "receivable" : /conta.?a.?pagar|fornecedor|cedente|beneficiário|despesa|compra/.test(source) || type === "boleto" ? "payable" : "neutral";
  const amount = money(firstMatch(compact, [/(?:valor(?:\s+total|\s+do\s+documento|\s+cobrado)?|total)\s*[:\-]?\s*R?\$?\s*([\d.]+,\d{2})/i, /R\$\s*([\d.]+,\d{2})/i]));
  const dueDate = normalizeDate(firstMatch(compact, [/(?:vencimento|vence em|data de vencimento)\s*[:\-]?\s*(\d{2}\/\d{2}\/\d{2,4})/i]));
  const issueDate = normalizeDate(firstMatch(compact, [/(?:emiss[aã]o|data de emiss[aã]o)\s*[:\-]?\s*(\d{2}\/\d{2}\/\d{2,4})/i]));
  const taxId = firstMatch(compact, [/\b(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/, /\b(\d{3}\.\d{3}\.\d{3}-\d{2})\b/]);
  const documentNumber = firstMatch(compact, [/(?:nota|nf-e|nfe|documento|fatura)\s*(?:n[º°o.]*)?\s*[:\-]?\s*([A-Z0-9.\/-]{3,})/i]);
  const barcodeCandidate = firstMatch(compact, [/(?:linha digit[aá]vel|c[oó]digo de barras)\s*[:\-]?\s*([\d.\s-]{44,80})/i])?.replace(/\D/g, "");
  const barcode = barcodeCandidate && barcodeCandidate.length >= 44 ? barcodeCandidate.slice(0, 48) : undefined;
  const counterparty = firstMatch(compact, [/(?:fornecedor|benefici[aá]rio|cedente|cliente|emitente|raz[aã]o social)\s*[:\-]\s*([^|;]{3,70}?)(?=\s+(?:cnpj|cpf|valor|vencimento|documento|nota)\b|$)/i]);
  const category = /aluguel|locaç[aã]o/.test(source) ? "Aluguel" : /software|assinatura|licen[çc]a|sistema/.test(source) ? "Software e assinaturas" : /energia|água|telefone|internet/.test(source) ? "Utilidades" : /material|cimento|aço|insumo/.test(source) ? "Materiais" : /imposto|tributo|taxa/.test(source) ? "Impostos e taxas" : direction === "receivable" ? "Receitas operacionais" : "Não categorizado";
  const signals = [type !== "other", direction !== "neutral", Boolean(amount), Boolean(dueDate), Boolean(counterparty), Boolean(documentNumber || barcode)].filter(Boolean).length;
  const confidence = Math.min(.98, .2 + signals * .13 + (compact.length > 80 ? .08 : 0));
  const notes: string[] = [];
  if (input.extractionMethod === "metadata") notes.push("O conteúdo do arquivo não pôde ser lido; classificação baseada no nome e metadados.");
  if (!amount) notes.push("Valor não identificado.");
  if (!counterparty) notes.push("Fornecedor ou cliente precisa de confirmação.");
  if (direction === "neutral") notes.push("Confirme se o documento representa uma conta a pagar ou a receber.");
  return { fileName: input.fileName, mimeType: input.mimeType, size: input.size, hash: input.hash, extractionMethod: input.extractionMethod, type, direction, confidence, counterparty, taxId, documentNumber, amount, dueDate, issueDate, barcode, category, notes, textExcerpt: compact.slice(0, 600) || undefined };
}

export function documentTypeLabel(type: FinancialDocumentType) {
  return ({ invoice: "Nota fiscal", boleto: "Boleto", receipt: "Recibo", payment_proof: "Comprovante", statement: "Extrato", other: "Não identificado" })[type];
}
