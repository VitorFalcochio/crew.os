import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { assertAllowedCollectionRecipient, validateCollectionDraft } from "@/features/finance/collection-email";
import { buildSupplierQuoteRequestDraft, supplierQuoteRequestIdempotency, supplierQuoteRequestMessageId } from "./supplier-quote-request";
import type { ProcurementRequest, SupplierContact, SupplierQuoteRequestEmailAction } from "@/types/domain";

interface QuoteRequestStoreFile { version: 1; actions: SupplierQuoteRequestEmailAction[] }
const dataDirectory = () => path.join(process.cwd(), ".crewos-data");
const dataFile = () => path.join(dataDirectory(), "carlos-quote-request-actions.json");
let queue: Promise<void> = Promise.resolve();

function exclusive<T>(operation: () => Promise<T>) {
  const result = queue.then(operation, operation);
  queue = result.then(() => undefined, () => undefined);
  return result;
}

function assertLocalMode() { if (process.env.NODE_ENV === "production") throw new Error("Solicitações de cotação locais são bloqueadas em produção"); }

async function readStore(): Promise<QuoteRequestStoreFile> {
  try {
    const parsed = JSON.parse(await readFile(dataFile(), "utf8")) as QuoteRequestStoreFile;
    return parsed.version === 1 && Array.isArray(parsed.actions) ? { ...parsed, actions: parsed.actions.map((action) => ({ ...action, events: action.events ?? [] })) } : { version: 1, actions: [] };
  } catch { return { version: 1, actions: [] }; }
}

async function writeStore(store: QuoteRequestStoreFile) {
  await mkdir(dataDirectory(), { recursive: true });
  const temporary = `${dataFile()}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(store, null, 2), { encoding: "utf8", mode: 0o600 });
  await rename(temporary, dataFile());
}

export async function prepareLocalSupplierQuoteRequests(input: { taskId: string; companyName: string; request: ProcurementRequest; suppliers: SupplierContact[] }) {
  assertLocalMode();
  if (!/^[A-Za-z0-9_-]{4,200}$/.test(input.taskId)) throw new Error("Identificador de tarefa inválido");
  if (!input.suppliers.length || input.suppliers.length > 10) throw new Error("Selecione entre 1 e 10 fornecedores");
  const blocked: Array<{ supplierId: string; supplierName: string; email: string; reason: string }> = [];
  const allowed = input.suppliers.filter((supplier) => {
    try { assertAllowedCollectionRecipient(supplier.email); return true; }
    catch (error) { blocked.push({ supplierId: supplier.id, supplierName: supplier.name, email: supplier.email, reason: error instanceof Error ? error.message : "Destinatário bloqueado" }); return false; }
  });
  return exclusive(async () => {
    const store = await readStore(); const actions: SupplierQuoteRequestEmailAction[] = [];
    for (const supplier of allowed) {
      const idempotencyKey = supplierQuoteRequestIdempotency(input.taskId, supplier);
      const existing = store.actions.find((action) => action.idempotencyKey === idempotencyKey);
      if (existing) { actions.push(existing); continue; }
      const id = randomUUID(); const now = new Date().toISOString();
      const draft = buildSupplierQuoteRequestDraft({ companyName: input.companyName, request: input.request, supplier });
      const action: SupplierQuoteRequestEmailAction = { id, taskId: input.taskId, approvalId: randomUUID(), requestId: input.request.id, supplierId: supplier.id, supplierName: supplier.name, to: draft.to, subject: draft.subject, body: draft.body, status: "awaiting_approval", approvalStatus: "pending", idempotencyKey, messageIdHeader: supplierQuoteRequestMessageId(id), attempt: 0, createdAt: now, updatedAt: now, events: [{ type: "prepared", at: now }] };
      store.actions.unshift(action); actions.push(action);
    }
    await writeStore(store); return { actions, blocked };
  });
}

export async function getLocalSupplierQuoteRequest(id: string) { assertLocalMode(); await queue; return (await readStore()).actions.find((action) => action.id === id); }

export async function updateLocalSupplierQuoteRequestDraft(id: string, input: { subject: string; body: string; actor?: string }) {
  assertLocalMode(); return mutate(id, (action) => {
    if (action.status !== "awaiting_approval" || action.approvalStatus !== "pending") throw new Error("Somente solicitações pendentes podem ser editadas");
    const draft = validateCollectionDraft({ to: action.to, subject: input.subject, body: input.body }); const now = new Date().toISOString();
    return { ...action, subject: draft.subject, body: draft.body, updatedAt: now, events: [...action.events, { type: "edited", at: now, actor: input.actor }] };
  });
}

export async function beginLocalSupplierQuoteRequestSend(id: string, input: { actor: string; retry: boolean }) {
  assertLocalMode(); return mutate(id, (action) => {
    if (action.status === "sent") return action;
    if (action.status === "rejected") throw new Error("A solicitação foi recusada");
    const staleSending = action.status === "sending" && Date.now() - new Date(action.updatedAt).getTime() > 120_000;
    const canStart = input.retry ? action.status === "failed" || staleSending : action.status === "awaiting_approval";
    if (!canStart) throw new Error(action.status === "sending" ? "Esta solicitação já está sendo enviada" : "A solicitação não está pronta para envio");
    assertAllowedCollectionRecipient(action.to); validateCollectionDraft(action); const now = new Date().toISOString();
    return { ...action, status: "sending" as const, approvalStatus: "approved" as const, approvedBy: action.approvedBy ?? input.actor, approvedAt: action.approvedAt ?? now, attempt: action.attempt + 1, error: undefined, updatedAt: now, events: [...action.events, { type: input.retry ? "retried" as const : "approved" as const, at: now, actor: input.actor }] };
  });
}

export async function markLocalSupplierQuoteRequestSent(id: string, result: { messageId: string; threadId?: string }) { return mutate(id, (action) => { const now = new Date().toISOString(); return { ...action, status: "sent" as const, externalMessageId: result.messageId, externalThreadId: result.threadId, sentAt: now, updatedAt: now, error: undefined, events: [...action.events, { type: "sent" as const, at: now, detail: `Gmail ${result.messageId}` }] }; }); }
export async function markLocalSupplierQuoteRequestFailed(id: string, error: string) { return mutate(id, (action) => { const now = new Date().toISOString(); return { ...action, status: "failed" as const, error: error.slice(0, 1000), updatedAt: now, events: [...action.events, { type: "failed" as const, at: now, detail: error.slice(0, 500) }] }; }); }
export async function rejectLocalSupplierQuoteRequest(id: string, actor: string) { assertLocalMode(); return mutate(id, (action) => { if (action.status !== "awaiting_approval") throw new Error("A solicitação não pode mais ser recusada"); const now = new Date().toISOString(); return { ...action, status: "rejected" as const, approvalStatus: "rejected" as const, updatedAt: now, events: [...action.events, { type: "rejected" as const, at: now, actor }] }; }); }

async function mutate(id: string, update: (action: SupplierQuoteRequestEmailAction) => SupplierQuoteRequestEmailAction) {
  return exclusive(async () => { const store = await readStore(); const index = store.actions.findIndex((action) => action.id === id); if (index < 0) throw new Error("Solicitação de cotação não encontrada"); const action = update(store.actions[index]); store.actions[index] = action; await writeStore(store); return action; });
}
