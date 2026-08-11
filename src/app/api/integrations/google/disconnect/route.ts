import { disconnectLocalGoogleConnection } from "@/integrations/providers/google/local-credential-store";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function DELETE() {
  if (isSupabaseConfigured()) return Response.json({ error: "Use o gerenciador de conexões da organização" }, { status: 409 });
  if (process.env.NODE_ENV === "production") return Response.json({ error: "Modo local bloqueado" }, { status: 403 });
  await disconnectLocalGoogleConnection(); return Response.json({ disconnected: true });
}
