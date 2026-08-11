import { apiError } from "@/lib/api/responses";
import { requireOrganization } from "@/lib/auth/session";

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();
    const { data, error } = await supabase.from("integrations")
      .select("id,status,account_identifier,capabilities,metadata,health,connected_at,last_sync_at,token_expires_at")
      .eq("organization_id", organizationId)
      .eq("provider", "conta-azul")
      .maybeSingle();
    if (error) throw error;
    return Response.json({ connected: data?.status === "connected", requiresReauth: data?.status === "requires_reauth", connection: data ?? null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
