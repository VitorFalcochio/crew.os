import { z } from "zod";
import { apiError } from "@/lib/api/responses";
import { requireOrganization } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { SupabaseIntegrationStore } from "@/integrations/persistence/supabase-store";
import { createIntegrationRuntime } from "@/integrations/runtime";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try { const { organizationId } = await requireOrganization(); const { id } = await context.params; z.uuid().parse(id); const admin = createAdminClient(); const store = new SupabaseIntegrationStore(admin); const connection = (await store.listConnections(organizationId)).find((item) => item.id === id); if (!connection) return Response.json({ error: "Conexão não encontrada" }, { status: 404 }); const runtime = createIntegrationRuntime(store); const health = await runtime.providers.get(connection.provider).testConnection(connection); await admin.from("integrations").update({ health: { status: health.ok ? "healthy" : "down", lastCheckedAt: new Date().toISOString(), message: health.message }, updated_at: new Date().toISOString() }).eq("organization_id", organizationId).eq("id", id); return Response.json({ data: health }); } catch (error) { return apiError(error); }
}
