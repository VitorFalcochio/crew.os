import { assertLocalCollectionApi, collectionApiError } from "@/features/finance/collection-api-security";
import { prepareLocalSupplierQuoteRequests } from "@/features/procurement/local-quote-request-store";
import type { ProcurementRequest, SupplierContact } from "@/types/domain";

export async function POST(request: Request) {
  try {
    assertLocalCollectionApi(request);
    const body = await request.json() as { taskId?: unknown; companyName?: unknown; request?: unknown; suppliers?: unknown };
    if (typeof body.taskId !== "string" || typeof body.companyName !== "string" || !body.request || typeof body.request !== "object" || !Array.isArray(body.suppliers)) throw new Error("Dados da solicitação de cotação inválidos");
    const procurement = body.request as ProcurementRequest;
    if (typeof procurement.id !== "string" || typeof procurement.title !== "string" || typeof procurement.quantity !== "number" || procurement.quantity <= 0 || typeof procurement.neededBy !== "string") throw new Error("Requisição de compra inválida");
    const suppliers = body.suppliers as SupplierContact[];
    if (suppliers.some((supplier) => typeof supplier.id !== "string" || typeof supplier.name !== "string" || typeof supplier.email !== "string")) throw new Error("Cadastro de fornecedor inválido");
    return Response.json({ data: await prepareLocalSupplierQuoteRequests({ taskId: body.taskId, companyName: body.companyName, request: procurement, suppliers }) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return collectionApiError(error); }
}
