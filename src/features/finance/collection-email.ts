import { createHash } from "node:crypto";
import type { CollectionEmailAccountSnapshot } from "@/types/domain";

const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export function normalizeCollectionEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidCollectionEmail(value: string) {
  const normalized = normalizeCollectionEmail(value);
  return normalized.length <= 254 && emailPattern.test(normalized) && !/[\r\n]/.test(value);
}

export function parseGmailSendAllowlist(value = process.env.CREWOS_GMAIL_SEND_ALLOWLIST ?? "") {
  return new Set(value.split(",").map(normalizeCollectionEmail).filter(isValidCollectionEmail));
}

export function assertAllowedCollectionRecipient(email: string, allowlist = parseGmailSendAllowlist()) {
  const normalized = normalizeCollectionEmail(email);
  if (!isValidCollectionEmail(normalized)) throw new Error("O e-mail do cliente é inválido");
  if (!allowlist.has(normalized)) throw new Error("Destinatário bloqueado pela allowlist de envios externos");
  return normalized;
}

export function validateCollectionDraft(input: { to: string; subject: string; body: string }) {
  const to = normalizeCollectionEmail(input.to);
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (!isValidCollectionEmail(to)) throw new Error("O e-mail do cliente é inválido");
  if (!subject || subject.length > 180 || /[\r\n]/.test(subject)) throw new Error("O assunto deve ter entre 1 e 180 caracteres e não pode conter quebras de linha");
  if (!body || body.length > 20_000) throw new Error("A mensagem deve ter entre 1 e 20.000 caracteres");
  return { to, subject, body };
}

export function buildCollectionEmailDraft(input: { companyName: string; customerName: string; accounts: CollectionEmailAccountSnapshot[] }) {
  const accounts = [...input.accounts].sort((left, right) => left.dueDate.localeCompare(right.dueDate));
  const total = accounts.reduce((sum, account) => sum + account.amount, 0);
  const reference = accounts.length === 1 ? accounts[0].document : `${accounts.length} títulos pendentes`;
  const lines = accounts.map((account) => `- ${account.document} · vencimento ${formatDate(account.dueDate)} · ${formatCurrency(account.amount)}`);
  return {
    subject: `Lembrete de pagamento — ${reference}`,
    body: [
      `Olá, ${input.customerName}.`,
      "",
      `Identificamos ${accounts.length === 1 ? "o seguinte título pendente" : "os seguintes títulos pendentes"}:`,
      ...lines,
      "",
      `Total pendente: ${formatCurrency(total)}.`,
      "",
      "Caso o pagamento já tenha sido realizado, por favor, envie o comprovante ou nos confirme para atualizarmos nosso controle. Se precisar conversar sobre a pendência, estamos à disposição.",
      "",
      "Atenciosamente,",
      `Equipe financeira · ${input.companyName.trim() || "CrewOS"}`,
    ].join("\n"),
    total,
  };
}

export function collectionIdempotencyKey(taskId: string, recipient: string, customerName = "") {
  return createHash("sha256").update(`${taskId}:${normalizeCollectionEmail(recipient)}:${customerName.trim().toLocaleLowerCase("pt-BR")}`).digest("hex");
}

export function collectionMessageId(actionId: string) {
  const safe = actionId.toLowerCase().replace(/[^a-z0-9-]/g, "");
  return `<crewos-${safe}@local.crewos>`;
}

export function encodeCollectionMime(input: { to: string; subject: string; body: string; messageId: string; date?: Date; inReplyTo?: string }) {
  const draft = validateCollectionDraft(input);
  if (!/^<crewos-[a-z0-9-]+@local\.crewos>$/.test(input.messageId)) throw new Error("Message-ID de cobrança inválido");
  if (input.inReplyTo && (!/^<[^\r\n<>]+>$/.test(input.inReplyTo) || input.inReplyTo.length > 500)) throw new Error("Message-ID original inválido");
  const encodedSubject = Buffer.from(draft.subject, "utf8").toString("base64");
  const body = draft.body.replace(/\r?\n/g, "\r\n");
  const raw = [
    `To: ${draft.to}`,
    `Subject: =?UTF-8?B?${encodedSubject}?=`,
    `Date: ${(input.date ?? new Date()).toUTCString()}`,
    `Message-ID: ${input.messageId}`,
    ...(input.inReplyTo ? [`In-Reply-To: ${input.inReplyTo}`, `References: ${input.inReplyTo}`] : []),
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    body,
  ].join("\r\n");
  return Buffer.from(raw, "utf8").toString("base64url");
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`));
}
