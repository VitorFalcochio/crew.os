import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  assertAllowedCollectionRecipient,
  buildCollectionEmailDraft,
  collectionIdempotencyKey,
  collectionMessageId,
  isValidCollectionEmail,
  normalizeCollectionEmail,
  validateCollectionDraft,
} from "./collection-email";
import type { CollectionEmailAccountSnapshot, CollectionEmailAction } from "@/types/domain";

interface CollectionStoreFile { version: 1; actions: CollectionEmailAction[] }
export interface PrepareCollectionAccount extends CollectionEmailAccountSnapshot { customerEmail?: string }
export interface BlockedCollectionGroup { accountIds: string[]; customerName: string; email?: string; reason: string }

const dataDirectory = () => path.join(process.cwd(), ".crewos-data");
const dataFile = () => path.join(dataDirectory(), "ana-collection-actions.json");
let queue: Promise<void> = Promise.resolve();

function exclusive<T>(operation: () => Promise<T>) {
  const result = queue.then(operation, operation);
  queue = result.then(() => undefined, () => undefined);
  return result;
}

async function readStore(): Promise<CollectionStoreFile> {
  try {
    const parsed = JSON.parse(await readFile(dataFile(), "utf8")) as CollectionStoreFile;
    return parsed.version === 1 && Array.isArray(parsed.actions) ? { ...parsed, actions: parsed.actions.map((action) => ({ ...action, events: action.events ?? [] })) } : { version: 1, actions: [] };
  } catch {
    return { version: 1, actions: [] };
  }
}

async function writeStore(store: CollectionStoreFile) {
  await mkdir(dataDirectory(), { recursive: true });
  const temporary = `${dataFile()}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(store, null, 2), { encoding: "utf8", mode: 0o600 });
  await rename(temporary, dataFile());
}

function assertLocalMode() {
  if (process.env.NODE_ENV === "production") throw new Error("Cobranças locais são bloqueadas em produção");
}

export async function prepareLocalCollectionActions(input: { taskId: string; companyName: string; accounts: PrepareCollectionAccount[] }) {
  assertLocalMode();
  if (!/^[A-Za-z0-9_-]{4,200}$/.test(input.taskId)) throw new Error("Identificador de tarefa inválido");
  if (!input.accounts.length || input.accounts.length > 20) throw new Error("Envie entre 1 e 20 recebíveis por análise");

  const groups = new Map<string, { to: string; accounts: PrepareCollectionAccount[] }>();
  const blocked: BlockedCollectionGroup[] = [];
  for (const account of input.accounts) {
    const email = account.customerEmail ? normalizeCollectionEmail(account.customerEmail) : "";
    if (!email || !isValidCollectionEmail(email)) {
      blocked.push({ accountIds: [account.id], customerName: account.customerName, email: email || undefined, reason: email ? "E-mail inválido" : "Cliente sem e-mail de cobrança" });
      continue;
    }
    try { assertAllowedCollectionRecipient(email); } catch (error) {
      blocked.push({ accountIds: [account.id], customerName: account.customerName, email, reason: error instanceof Error ? error.message : "Destinatário bloqueado" });
      continue;
    }
    const groupKey = `${account.customerName.trim().toLocaleLowerCase("pt-BR")}::${email}`;
    const current = groups.get(groupKey);
    groups.set(groupKey, { to: email, accounts: [...(current?.accounts ?? []), account] });
  }

  return exclusive(async () => {
    const store = await readStore();
    const actions: CollectionEmailAction[] = [];
    for (const { to, accounts: grouped } of groups.values()) {
      const idempotencyKey = collectionIdempotencyKey(input.taskId, to, grouped[0].customerName);
      const existing = store.actions.find((action) => action.idempotencyKey === idempotencyKey);
      if (existing) { actions.push(existing); continue; }
      const now = new Date().toISOString();
      const id = randomUUID();
      const accounts = grouped.map(({ id: accountId, customerName, document, amount, dueDate }) => ({ id: accountId, customerName: customerName.trim(), document: document.trim(), amount, dueDate }));
      const customerName = grouped[0].customerName.trim();
      const draft = buildCollectionEmailDraft({ companyName: input.companyName, customerName, accounts });
      const action: CollectionEmailAction = {
        id, taskId: input.taskId, approvalId: randomUUID(), accountIds: accounts.map((account) => account.id), accounts,
        customerName, to, subject: draft.subject, body: draft.body, totalAmount: draft.total,
        status: "awaiting_approval", approvalStatus: "pending", idempotencyKey, messageIdHeader: collectionMessageId(id), attempt: 0,
        createdAt: now, updatedAt: now, events: [{ type: "prepared", at: now }],
      };
      store.actions.unshift(action);
      actions.push(action);
    }
    await writeStore(store);
    return { actions, blocked };
  });
}

export async function getLocalCollectionAction(id: string) {
  assertLocalMode();
  await queue;
  return (await readStore()).actions.find((action) => action.id === id);
}

export async function updateLocalCollectionDraft(id: string, input: { subject: string; body: string; actor?: string }) {
  assertLocalMode();
  return mutateAction(id, (action) => {
    if (action.status !== "awaiting_approval" || action.approvalStatus !== "pending") throw new Error("Somente cobranças pendentes podem ser editadas");
    const draft = validateCollectionDraft({ to: action.to, subject: input.subject, body: input.body });
    const now = new Date().toISOString();
    return { ...action, subject: draft.subject, body: draft.body, updatedAt: now, events: [...action.events, { type: "edited", at: now, actor: input.actor }] };
  });
}

export async function beginLocalCollectionSend(id: string, input: { actor: string; retry: boolean }) {
  assertLocalMode();
  return mutateAction(id, (action) => {
    if (action.status === "sent") return action;
    if (action.status === "rejected") throw new Error("A cobrança foi recusada");
    const staleSending = action.status === "sending" && Date.now() - new Date(action.updatedAt).getTime() > 120_000;
    const canStart = input.retry ? action.status === "failed" || staleSending : action.status === "awaiting_approval";
    if (!canStart) throw new Error(action.status === "sending" ? "Esta cobrança já está sendo enviada" : "A cobrança não está pronta para envio");
    assertAllowedCollectionRecipient(action.to);
    validateCollectionDraft(action);
    const now = new Date().toISOString();
    return {
      ...action, status: "sending" as const, approvalStatus: "approved" as const, approvedBy: action.approvedBy ?? input.actor,
      approvedAt: action.approvedAt ?? now, attempt: action.attempt + 1, error: undefined, updatedAt: now,
      events: [...action.events, { type: input.retry ? "retried" as const : "approved" as const, at: now, actor: input.actor }],
    };
  });
}

export async function markLocalCollectionSent(id: string, result: { messageId: string; threadId?: string }) {
  return mutateAction(id, (action) => {
    const now = new Date().toISOString();
    return { ...action, status: "sent" as const, externalMessageId: result.messageId, externalThreadId: result.threadId, sentAt: now, updatedAt: now, error: undefined, events: [...action.events, { type: "sent" as const, at: now, detail: `Gmail ${result.messageId}` }] };
  });
}

export async function markLocalCollectionFailed(id: string, error: string) {
  return mutateAction(id, (action) => {
    const now = new Date().toISOString();
    return { ...action, status: "failed" as const, error: error.slice(0, 1000), updatedAt: now, events: [...action.events, { type: "failed" as const, at: now, detail: error.slice(0, 500) }] };
  });
}

export async function rejectLocalCollectionAction(id: string, actor: string) {
  assertLocalMode();
  return mutateAction(id, (action) => {
    if (action.status !== "awaiting_approval") throw new Error("A cobrança não pode mais ser recusada");
    const now = new Date().toISOString();
    return { ...action, status: "rejected" as const, approvalStatus: "rejected" as const, updatedAt: now, events: [...action.events, { type: "rejected" as const, at: now, actor }] };
  });
}

async function mutateAction(id: string, update: (action: CollectionEmailAction) => CollectionEmailAction) {
  return exclusive(async () => {
    const store = await readStore();
    const index = store.actions.findIndex((action) => action.id === id);
    if (index < 0) throw new Error("Cobrança não encontrada");
    const action = update(store.actions[index]);
    store.actions[index] = action;
    await writeStore(store);
    return action;
  });
}
