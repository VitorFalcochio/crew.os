import { getGoogleWorkspaceOverview } from "@/integrations/providers/google/workspace-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  if (isSupabaseConfigured()) return Response.json({ error: "A leitura do Google Workspace com Supabase ainda não está configurada" }, { status: 501 });
  if (process.env.NODE_ENV === "production") return Response.json({ error: "Credenciais locais são bloqueadas em produção" }, { status: 403 });
  try {
    return Response.json({ data: await getGoogleWorkspaceOverview() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível consultar o Google Workspace";
    return Response.json({ error: message }, { status: message.includes("não está conectado") ? 404 : 502 });
  }
}
