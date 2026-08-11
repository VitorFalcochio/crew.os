import { getLocalGoogleConnection } from "@/integrations/providers/google/local-credential-store";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  if (isSupabaseConfigured()) return Response.json({ local: false, connected: false });
  if (process.env.NODE_ENV === "production") return Response.json({ local: true, connected: false }, { status: 403 });
  const connection = await getLocalGoogleConnection();
  const requiresReauth = Boolean(connection && !connection.scopes.includes("https://www.googleapis.com/auth/gmail.send"));
  return Response.json({ local: true, connected: Boolean(connection) && !requiresReauth, requiresReauth, connection });
}
