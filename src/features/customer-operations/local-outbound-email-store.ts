import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { assertAllowedCollectionRecipient, validateCollectionDraft } from "@/features/finance/collection-email";
import { buildSalesFollowupDraft, buildSupportReplyDraft, outboundEmailIdempotency, outboundEmailMessageId } from "./outbound-email";
import type { AgentOutboundEmailAction, SalesLead, SupportCase } from "@/types/domain";

interface StoreFile { version: 1; actions: AgentOutboundEmailAction[] }
const dataDirectory = () => path.join(process.cwd(), ".crewos-data");
const dataFile = () => path.join(dataDirectory(), "agent-outbound-email-actions.json");
let queue: Promise<void> = Promise.resolve();

function exclusive<T>(operation: () => Promise<T>) { const result = queue.then(operation, operation); queue = result.then(() => undefined, () => undefined); return result; }
function assertLocalMode() { if (process.env.NODE_ENV === "production") throw new Error("Ações locais de Sofia e Lucas são bloqueadas em produção"); }
async function readStore(): Promise<StoreFile> { try { const parsed = JSON.parse(await readFile(dataFile(), "utf8")) as StoreFile; return parsed.version === 1 && Array.isArray(parsed.actions) ? { ...parsed, actions: parsed.actions.map((action) => ({ ...action, events: action.events ?? [] })) } : { version: 1, actions: [] }; } catch { return { version: 1, actions: [] }; } }
async function writeStore(store: StoreFile) { await mkdir(dataDirectory(), { recursive: true }); const temporary = `${dataFile()}.${process.pid}.tmp`; await writeFile(temporary, JSON.stringify(store, null, 2), { encoding: "utf8", mode: 0o600 }); await rename(temporary, dataFile()); }

export async function prepareLocalAgentOutboundEmail(input: { taskId: string; companyName: string; kind: "support_reply"; entity: SupportCase } | { taskId: string; companyName: string; kind: "sales_followup"; entity: SalesLead }) {
  assertLocalMode(); if (!/^[A-Za-z0-9_-]{4,200}$/.test(input.taskId)) throw new Error("Identificador de tarefa inválido");
  const to = assertAllowedCollectionRecipient(input.kind === "support_reply" ? input.entity.customerEmail : input.entity.email);
  return exclusive(async () => {
    const store = await readStore(); const key = outboundEmailIdempotency(input.taskId, input.kind, input.entity.id, to);
    const existing = store.actions.find((action) => action.idempotencyKey === key); if (existing) return existing;
    const draft = input.kind === "support_reply" ? buildSupportReplyDraft({ companyName: input.companyName, supportCase: input.entity }) : buildSalesFollowupDraft({ companyName: input.companyName, lead: input.entity });
    const id = randomUUID(); const now = new Date().toISOString();
    const action: AgentOutboundEmailAction = { id, taskId: input.taskId, approvalId: randomUUID(), kind: input.kind, employeeId: input.kind === "support_reply" ? "sofia" : "lucas", entityId: input.entity.id, ...(input.kind === "support_reply" ? { sourceThreadId: input.entity.gmailThreadId, inReplyToMessageId: input.entity.gmailRfcMessageId } : {}), recipientName: input.kind === "support_reply" ? input.entity.customerName : input.entity.contactName, to: draft.to, subject: draft.subject, body: draft.body, status: "awaiting_approval", approvalStatus: "pending", idempotencyKey: key, messageIdHeader: outboundEmailMessageId(input.kind, id), attempt: 0, createdAt: now, updatedAt: now, events: [{ type: "prepared", at: now }] };
    store.actions.unshift(action); await writeStore(store); return action;
  });
}

export async function getLocalAgentOutboundEmail(id: string) { assertLocalMode(); await queue; return (await readStore()).actions.find((action) => action.id === id); }
export async function updateLocalAgentOutboundEmailDraft(id: string, input: { subject: string; body: string; actor?: string }) { assertLocalMode(); return mutate(id, (action) => { if (action.status !== "awaiting_approval" || action.approvalStatus !== "pending") throw new Error("Somente mensagens pendentes podem ser editadas"); const draft = validateCollectionDraft({ to: action.to, subject: input.subject, body: input.body }); const now = new Date().toISOString(); return { ...action, ...draft, updatedAt: now, events: [...action.events, { type: "edited", at: now, actor: input.actor }] }; }); }
export async function beginLocalAgentOutboundEmailSend(id: string, input: { actor: string; retry: boolean }) { assertLocalMode(); return mutate(id, (action) => { if (action.status === "sent") return action; if (action.status === "rejected") throw new Error("A mensagem foi recusada"); const stale = action.status === "sending" && Date.now() - new Date(action.updatedAt).getTime() > 120_000; const canStart = input.retry ? action.status === "failed" || stale : action.status === "awaiting_approval"; if (!canStart) throw new Error(action.status === "sending" ? "Esta mensagem já está sendo enviada" : "A mensagem não está pronta para envio"); assertAllowedCollectionRecipient(action.to); validateCollectionDraft(action); const now = new Date().toISOString(); return { ...action, status: "sending", approvalStatus: "approved", approvedBy: action.approvedBy ?? input.actor, approvedAt: action.approvedAt ?? now, attempt: action.attempt + 1, error: undefined, updatedAt: now, events: [...action.events, { type: input.retry ? "retried" : "approved", at: now, actor: input.actor }] }; }); }
export async function markLocalAgentOutboundEmailSent(id: string, result: { messageId: string; threadId?: string }) { return mutate(id, (action) => { const now = new Date().toISOString(); return { ...action, status: "sent", externalMessageId: result.messageId, externalThreadId: result.threadId, sentAt: now, updatedAt: now, error: undefined, events: [...action.events, { type: "sent", at: now, detail: `Gmail ${result.messageId}` }] }; }); }
export async function markLocalAgentOutboundEmailFailed(id: string, error: string) { return mutate(id, (action) => { const now = new Date().toISOString(); return { ...action, status: "failed", error: error.slice(0, 1000), updatedAt: now, events: [...action.events, { type: "failed", at: now, detail: error.slice(0, 500) }] }; }); }
export async function rejectLocalAgentOutboundEmail(id: string, actor: string) { assertLocalMode(); return mutate(id, (action) => { if (action.status !== "awaiting_approval") throw new Error("A mensagem não pode mais ser recusada"); const now = new Date().toISOString(); return { ...action, status: "rejected", approvalStatus: "rejected", updatedAt: now, events: [...action.events, { type: "rejected", at: now, actor }] }; }); }
async function mutate(id: string, update: (action: AgentOutboundEmailAction) => AgentOutboundEmailAction) { return exclusive(async () => { const store = await readStore(); const index = store.actions.findIndex((action) => action.id === id); if (index < 0) throw new Error("Mensagem externa não encontrada"); const action = update(store.actions[index]); store.actions[index] = action; await writeStore(store); return action; }); }
