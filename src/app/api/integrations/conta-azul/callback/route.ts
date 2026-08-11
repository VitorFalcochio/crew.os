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
    let tokens: Awaited<ReturnType<typeof exchangeContaAzulAuthorizationCode>>;
    try {
      tokens = await exchangeContaAzulAuthorizationCode({ code, clientId, clientSecret, redirectUri: contaAzulRedirectUri() });
    } catch (error) {
      console.error("Conta Azul OAuth token exchange failed", error);
      return finish("token_exchange_failed");
    }

    // Company data is useful metadata, but it is not part of the OAuth
    // contract. A temporary failure in this endpoint must not discard valid
    // tokens and force the user through authorization again.
    let company: Awaited<ReturnType<typeof fetchContaAzulConnectedCompany>> = {};
    try {
      company = await fetchContaAzulConnectedCompany(tokens.access_token);
    } catch (error) {
      console.warn("Conta Azul connected company lookup failed; saving authorization without company metadata", error);
    }

    try {
      await saveContaAzulConnection({ organizationId, tokens, company });
    } catch (error) {
      console.error("Conta Azul OAuth credential storage failed", error);
      return finish("storage_failed");
    }
    return finish("connected");
  } catch (error) {
    console.error("Conta Azul OAuth callback failed", error);
    return finish("failed");
  }
}
