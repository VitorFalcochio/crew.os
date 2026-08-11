import { assertLocalCollectionApi, collectionApiError } from "@/features/finance/collection-api-security";
import { beginLocalCollectionSend, markLocalCollectionFailed, markLocalCollectionSent } from "@/features/finance/local-collection-store";
import { sendGoogleCollectionEmail } from "@/integrations/providers/google/workspace-client";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let actionId: string | undefined;
  let started = false;
  try {
    assertLocalCollectionApi(request);
    actionId = (await context.params).id;
    const body = await request.json().catch(() => ({})) as { actor?: unknown };
    const actor = typeof body.actor === "string" && body.actor.trim() ? body.actor.trim().slice(0, 120) : "Gestor local";
    const action = await beginLocalCollectionSend(actionId, { actor, retry: false });
    if (action.status === "sent") return Response.json({ data: action });
    started = true;
    const result = await sendGoogleCollectionEmail(action);
    return Response.json({ data: await markLocalCollectionSent(actionId, result) });
  } catch (error) {
    if (actionId && started) {
      const failed = await markLocalCollectionFailed(actionId, error instanceof Error ? error.message : "Falha no Gmail").catch(() => undefined);
      if (failed) return Response.json({ error: failed.error, data: failed }, { status: 502 });
    }
    return collectionApiError(error);
  }
}
