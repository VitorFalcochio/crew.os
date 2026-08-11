import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth/session";
import { exchangeContaAzulAuthorizationCode, fetchContaAzulConnectedCompany, contaAzulRedirectUri } from "@/integrations/providers/conta-azul/oauth";
import { saveContaAzulConnection } from "@/integrations/providers/conta-azul/credential-store";

const STATE_COOKIE = "crewos_conta_azul_oauth_state";
const ORGANIZATION_COOKIE = "crewos_conta_azul_oauth_org";
const appUrl = () => process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
const returnToSettings = (status: string) => new URL(`/configuracoes?tab=integracoes&contaAzul=${encodeURIComponent(status)}`, appUrl());

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const finish = (status: string) => {
    const response = NextResponse.redirect(returnToSettings(status));
    response.cookies.set(STATE_COOKIE, "", { path: "/api/integrations/conta-azul", maxAge: 0 });
    response.cookies.set(ORGANIZATION_COOKIE, "", { path: "/api/integrations/conta-azul", maxAge: 0 });
    return response;
  };
  try {
    const url = new URL(request.url);
    if (url.searchParams.get("error")) return finish("denied");
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const expectedState = cookieStore.get(STATE_COOKIE)?.value;
    const expectedOrganizationId = cookieStore.get(ORGANIZATION_COOKIE)?.value;
    if (!code || !state || !expectedState || state !== expectedState || !expectedOrganizationId) return finish("invalid_state");
    const clientId = process.env.CONTA_AZUL_CLIENT_ID?.trim();
    const clientSecret = process.env.CONTA_AZUL_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) return finish("not_configured");
    const { organizationId, membership } = await requireOrganization();
    if (organizationId !== expectedOrganizationId || !["owner", "admin"].includes(String(membership.role))) return finish("forbidden");
    const tokens = await exchangeContaAzulAuthorizationCode({ code, clientId, clientSecret, redirectUri: contaAzulRedirectUri() });
    const company = await fetchContaAzulConnectedCompany(tokens.access_token);
    await saveContaAzulConnection({ organizationId, tokens, company });
    return finish("connected");
  } catch (error) {
    console.error("Conta Azul OAuth callback failed", error instanceof Error ? error.message : "unknown");
    return finish("failed");
  }
}
