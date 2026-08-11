import { assertLocalCollectionApi, collectionApiError } from "@/features/finance/collection-api-security";
import { rejectLocalSupplierQuoteRequest } from "@/features/procurement/local-quote-request-store";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { assertLocalCollectionApi(request); const body = await request.json().catch(() => ({})) as { actor?: unknown }; const actor = typeof body.actor === "string" && body.actor.trim() ? body.actor.trim().slice(0, 120) : "Gestor local"; return Response.json({ data: await rejectLocalSupplierQuoteRequest((await context.params).id, actor) }); }
  catch (error) { return collectionApiError(error); }
}
