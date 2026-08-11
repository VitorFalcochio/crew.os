import { cookies } from "next/headers";
import { apiError } from "@/lib/api/responses";
import { requireOrganization } from "@/lib/auth/session";
import { buildContaAzulAuthorizationUrl, contaAzulRedirectUri, createContaAzulOAuthState } from "@/integrations/providers/conta-azul/oauth";

const STATE_COOKIE = "crewos_conta_azul_oauth_state";
const ORGANIZATION_COOKIE = "crewos_conta_azul_oauth_org";

export async function GET() {
  try {
    const { organizationId, membership } = await requireOrganization();
    if (!["owner", "admin"].includes(String(membership.role))) return Response.json({ error: "Apenas administradores podem conectar o Conta Azul" }, { status: 403 });
    const clientId = process.env.CONTA_AZUL_CLIENT_ID?.trim();
    if (!clientId) return Response.json({ error: "CONTA_AZUL_CLIENT_ID não configurado" }, { status: 503 });
    const state = createContaAzulOAuthState();
    const cookieStore = await cookies();
    const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/api/integrations/conta-azul", maxAge: 600 };
    cookieStore.set(STATE_COOKIE, state, options);
    cookieStore.set(ORGANIZATION_COOKIE, organizationId, options);
    return Response.redirect(buildContaAzulAuthorizationUrl({ clientId, redirectUri: contaAzulRedirectUri(), state }));
  } catch (error) {
    return apiError(error);
  }
}
