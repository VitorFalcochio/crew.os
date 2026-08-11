import { cookies } from "next/headers";
import { requireOrganization } from "@/lib/auth/session";
import { apiError } from "@/lib/api/responses";
import { buildGoogleAuthorizationUrl, createGoogleOAuthChallenge } from "@/integrations/providers/google/oauth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const STATE_COOKIE = "crewos_google_oauth_state";
const VERIFIER_COOKIE = "crewos_google_oauth_verifier";

function redirectUri() { return process.env.GOOGLE_OAUTH_REDIRECT_URI ?? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/integrations/google/callback`; }

export async function GET() {
  try {
    let loginHint: string | undefined;
    if (isSupabaseConfigured()) { const { user, membership } = await requireOrganization(); if (!['owner', 'admin'].includes(String(membership.role))) return Response.json({ error: "Apenas administradores podem conectar o Google Workspace" }, { status: 403 }); loginHint = user.email; }
    else if (process.env.NODE_ENV === "production") return Response.json({ error: "O modo OAuth local é bloqueado em produção" }, { status: 503 });
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID; if (!clientId) return Response.json({ error: "GOOGLE_OAUTH_CLIENT_ID não configurado" }, { status: 503 });
    const challenge = createGoogleOAuthChallenge(); const cookieStore = await cookies(); const secure = process.env.NODE_ENV === "production";
    cookieStore.set(STATE_COOKIE, challenge.state, { httpOnly: true, secure, sameSite: "lax", path: "/api/integrations/google", maxAge: 600 });
    cookieStore.set(VERIFIER_COOKIE, challenge.verifier, { httpOnly: true, secure, sameSite: "lax", path: "/api/integrations/google", maxAge: 600 });
    return Response.redirect(buildGoogleAuthorizationUrl({ clientId, redirectUri: redirectUri(), state: challenge.state, challenge: challenge.challenge, loginHint }));
  } catch (error) { return apiError(error); }
}
