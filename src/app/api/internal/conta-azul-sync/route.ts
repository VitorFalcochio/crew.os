import { authorizeInternal } from "@/lib/auth/internal";
import { createAdminClient } from "@/lib/supabase/admin";
import { synchronizeContaAzul } from "@/integrations/providers/conta-azul/sync";

export const maxDuration = 300;

export async function GET(request: Request) {
  if (!authorizeInternal(request)) return Response.json({ error: "Sincronização não autorizada" }, { status: 401 });
  const admin = createAdminClient();
  const staleBefore = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin.from("integrations").select("organization_id,last_sync_at")
    .eq("provider", "conta-azul").eq("status", "connected").or(`last_sync_at.is.null,last_sync_at.lt.${staleBefore}`).order("last_sync_at", { ascending: true, nullsFirst: true }).limit(5);
  if (error) throw error;
  const results: Array<{ organizationId: string; ok: boolean; error?: string }> = [];
  for (const connection of data ?? []) {
    try {
      await synchronizeContaAzul({ organizationId: String(connection.organization_id) });
      results.push({ organizationId: String(connection.organization_id), ok: true });
    } catch (syncError) {
      results.push({ organizationId: String(connection.organization_id), ok: false, error: syncError instanceof Error ? syncError.message : "Falha desconhecida" });
    }
  }
  return Response.json({ processed: results.length, results });
}
