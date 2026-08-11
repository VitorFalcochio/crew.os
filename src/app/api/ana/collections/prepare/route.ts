import { assertLocalCollectionApi, collectionApiError } from "@/features/finance/collection-api-security";
import { prepareLocalCollectionActions, type PrepareCollectionAccount } from "@/features/finance/local-collection-store";

export async function POST(request: Request) {
  try {
    assertLocalCollectionApi(request);
    const body = await request.json() as { taskId?: unknown; companyName?: unknown; accounts?: unknown };
    if (typeof body.taskId !== "string" || typeof body.companyName !== "string" || !Array.isArray(body.accounts)) throw new Error("Dados da análise de cobrança inválidos");
    const accounts: PrepareCollectionAccount[] = body.accounts.map((value) => {
      const item = value as Record<string, unknown>;
      if (typeof item.id !== "string" || typeof item.customerName !== "string" || typeof item.document !== "string" || typeof item.amount !== "number" || !Number.isFinite(item.amount) || item.amount <= 0 || typeof item.dueDate !== "string" || (item.customerEmail !== undefined && typeof item.customerEmail !== "string")) throw new Error("Um dos recebíveis possui dados inválidos");
      return { id: item.id, customerName: item.customerName, customerEmail: item.customerEmail, document: item.document, amount: item.amount, dueDate: item.dueDate };
    });
    return Response.json({ data: await prepareLocalCollectionActions({ taskId: body.taskId, companyName: body.companyName, accounts }) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return collectionApiError(error); }
}
