import { assertLocalCollectionApi, collectionApiError } from "@/features/finance/collection-api-security";
import { getLocalSupplierQuoteRequest, updateLocalSupplierQuoteRequestDraft } from "@/features/procurement/local-quote-request-store";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try { assertLocalCollectionApi(request, false); const action = await getLocalSupplierQuoteRequest((await context.params).id); if (!action) throw new Error("Solicitação de cotação não encontrada"); return Response.json({ data: action }, { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { return collectionApiError(error); }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try { assertLocalCollectionApi(request); const body = await request.json() as { subject?: unknown; body?: unknown; actor?: unknown }; if (typeof body.subject !== "string" || typeof body.body !== "string") throw new Error("Assunto e mensagem são obrigatórios"); return Response.json({ data: await updateLocalSupplierQuoteRequestDraft((await context.params).id, { subject: body.subject, body: body.body, actor: typeof body.actor === "string" ? body.actor.slice(0, 120) : undefined }) }); }
  catch (error) { return collectionApiError(error); }
}
