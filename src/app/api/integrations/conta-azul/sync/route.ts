import { apiError } from "@/lib/api/responses";
import { requireOrganization } from "@/lib/auth/session";
import { synchronizeContaAzul } from "@/integrations/providers/conta-azul/sync";

export async function POST() {
  try {
    const { user, organizationId, membership } = await requireOrganization();
    if (!(new Set(["owner", "admin", "manager"])).has(String(membership.role))) {
      return Response.json({ error: "Sem permissão para sincronizar o Conta Azul" }, { status: 403 });
    }
    return Response.json(await synchronizeContaAzul({ organizationId, initiatedBy: user.id }));
  } catch (error) {
    return apiError(error);
  }
}
