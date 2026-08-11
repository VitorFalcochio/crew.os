import { assertLocalCollectionApi, collectionApiError } from "@/features/finance/collection-api-security";
import { beginLocalSupplierQuoteRequestSend, markLocalSupplierQuoteRequestFailed, markLocalSupplierQuoteRequestSent } from "@/features/procurement/local-quote-request-store";
import { sendGoogleExternalEmail } from "@/integrations/providers/google/workspace-client";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let actionId: string | undefined; let started = false;
  try { assertLocalCollectionApi(request); actionId = (await context.params).id; const body = await request.json().catch(() => ({})) as { actor?: unknown }; const actor = typeof body.actor === "string" && body.actor.trim() ? body.actor.trim().slice(0, 120) : "Gestor local"; const action = await beginLocalSupplierQuoteRequestSend(actionId, { actor, retry: false }); if (action.status === "sent") return Response.json({ data: action }); started = true; const result = await sendGoogleExternalEmail(action); return Response.json({ data: await markLocalSupplierQuoteRequestSent(actionId, result) }); }
  catch (error) { if (actionId && started) { const failed = await markLocalSupplierQuoteRequestFailed(actionId, error instanceof Error ? error.message : "Falha no Gmail").catch(() => undefined); if (failed) return Response.json({ error: failed.error, data: failed }, { status: 502 }); } return collectionApiError(error); }
}
