import "server-only";

import { assertLocalCollectionApi, collectionApiError } from "@/features/finance/collection-api-security";
import { beginLocalAgentOutboundEmailSend, getLocalAgentOutboundEmail, markLocalAgentOutboundEmailFailed, markLocalAgentOutboundEmailSent, prepareLocalAgentOutboundEmail, rejectLocalAgentOutboundEmail, updateLocalAgentOutboundEmailDraft } from "./local-outbound-email-store";
import { sendGoogleExternalEmail } from "@/integrations/providers/google/workspace-client";
import type { SalesLead, SupportCase } from "@/types/domain";

export async function prepareAgentEmail(request: Request, kind: "support_reply" | "sales_followup") {
  try {
    assertLocalCollectionApi(request); const body = await request.json() as { taskId?: unknown; companyName?: unknown; entity?: unknown };
    if (typeof body.taskId !== "string" || typeof body.companyName !== "string" || !body.entity || typeof body.entity !== "object") throw new Error("Dados da mensagem inválidos");
    if (kind === "support_reply") {
      const entity = body.entity as SupportCase;
      if (typeof entity.id !== "string" || typeof entity.customerName !== "string" || typeof entity.customerEmail !== "string" || typeof entity.subject !== "string") throw new Error("Atendimento inválido");
      return Response.json({ data: await prepareLocalAgentOutboundEmail({ taskId: body.taskId, companyName: body.companyName, kind, entity }) }, { headers: { "Cache-Control": "private, no-store" } });
    }
    const entity = body.entity as SalesLead;
    if (typeof entity.id !== "string" || typeof entity.contactName !== "string" || typeof entity.companyName !== "string" || typeof entity.email !== "string") throw new Error("Lead inválido");
    return Response.json({ data: await prepareLocalAgentOutboundEmail({ taskId: body.taskId, companyName: body.companyName, kind, entity }) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return collectionApiError(error); }
}

export async function getAgentEmail(request: Request, context: { params: Promise<{ id: string }> }, kind: "support_reply" | "sales_followup") {
  try { assertLocalCollectionApi(request); const action = await getLocalAgentOutboundEmail((await context.params).id); if (!action || action.kind !== kind) return Response.json({ error: "Mensagem não encontrada" }, { status: 404 }); return Response.json({ data: action }, { headers: { "Cache-Control": "private, no-store" } }); } catch (error) { return collectionApiError(error); }
}

export async function patchAgentEmail(request: Request, context: { params: Promise<{ id: string }> }, kind: "support_reply" | "sales_followup") {
  try { assertLocalCollectionApi(request); const id = (await context.params).id; const existing = await getLocalAgentOutboundEmail(id); if (!existing || existing.kind !== kind) return Response.json({ error: "Mensagem não encontrada" }, { status: 404 }); const body = await request.json() as { subject?: unknown; body?: unknown; actor?: unknown }; if (typeof body.subject !== "string" || typeof body.body !== "string") throw new Error("Assunto e mensagem são obrigatórios"); return Response.json({ data: await updateLocalAgentOutboundEmailDraft(id, { subject: body.subject, body: body.body, actor: typeof body.actor === "string" ? body.actor : undefined }) }); } catch (error) { return collectionApiError(error); }
}

export async function sendAgentEmail(request: Request, context: { params: Promise<{ id: string }> }, kind: "support_reply" | "sales_followup", retry: boolean) {
  let actionId: string | undefined; let started = false;
  try { assertLocalCollectionApi(request); actionId = (await context.params).id; const existing = await getLocalAgentOutboundEmail(actionId); if (!existing || existing.kind !== kind) return Response.json({ error: "Mensagem não encontrada" }, { status: 404 }); const body = await request.json().catch(() => ({})) as { actor?: unknown }; const actor = typeof body.actor === "string" && body.actor.trim() ? body.actor.trim().slice(0, 120) : "Gestor local"; const action = await beginLocalAgentOutboundEmailSend(actionId, { actor, retry }); if (action.status === "sent") return Response.json({ data: action }); started = true; const result = await sendGoogleExternalEmail(action); return Response.json({ data: await markLocalAgentOutboundEmailSent(actionId, result) }); }
  catch (error) { if (actionId && started) { const failed = await markLocalAgentOutboundEmailFailed(actionId, error instanceof Error ? error.message : "Falha no Gmail").catch(() => undefined); if (failed) return Response.json({ error: failed.error, data: failed }, { status: 502 }); } return collectionApiError(error); }
}

export async function rejectAgentEmail(request: Request, context: { params: Promise<{ id: string }> }, kind: "support_reply" | "sales_followup") {
  try { assertLocalCollectionApi(request); const id = (await context.params).id; const existing = await getLocalAgentOutboundEmail(id); if (!existing || existing.kind !== kind) return Response.json({ error: "Mensagem não encontrada" }, { status: 404 }); const body = await request.json().catch(() => ({})) as { actor?: unknown }; const actor = typeof body.actor === "string" && body.actor.trim() ? body.actor.trim().slice(0, 120) : "Gestor local"; return Response.json({ data: await rejectLocalAgentOutboundEmail(id, actor) }); } catch (error) { return collectionApiError(error); }
}
