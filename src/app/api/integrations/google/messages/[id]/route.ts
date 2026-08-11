import { getGoogleWorkspaceMessage } from "@/integrations/providers/google/workspace-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  if (isSupabaseConfigured()) return Response.json({ error: "A leitura do Gmail com Supabase ainda não está configurada" }, { status: 501 });
  if (process.env.NODE_ENV === "production") return Response.json({ error: "Credenciais locais são bloqueadas em produção" }, { status: 403 });
  try {
    const { id } = await context.params;
    if (!/^[A-Za-z0-9_-]{4,200}$/.test(id)) return Response.json({ error: "Identificador de mensagem inválido" }, { status: 400 });
    return Response.json({ data: await getGoogleWorkspaceMessage(id) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar o e-mail";
    return Response.json({ error: message }, { status: message.includes("não está conectado") ? 404 : 502 });
  }
}
