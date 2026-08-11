import { apiError } from "@/lib/api/responses";
import { requireOrganization } from "@/lib/auth/session";
import { disconnectContaAzul } from "@/integrations/providers/conta-azul/credential-store";

export async function DELETE() {
  try {
    const { organizationId, membership } = await requireOrganization();
    if (!["owner", "admin"].includes(String(membership.role))) return Response.json({ error: "Apenas administradores podem desconectar o Conta Azul" }, { status: 403 });
    const disconnected = await disconnectContaAzul(organizationId);
    return Response.json({ disconnected });
  } catch (error) {
    return apiError(error);
  }
}
