import { randomBytes } from "node:crypto";
import type { Capability, JsonObject } from "../../core/types";

export const CONTA_AZUL_AUTHORIZATION_ENDPOINT = "https://auth.contaazul.com/login";
export const CONTA_AZUL_TOKEN_ENDPOINT = "https://auth.contaazul.com/oauth2/token";
export const CONTA_AZUL_DEFAULT_API_BASE_URL = "https://api-v2.contaazul.com";
export const contaAzulScopes = ["openid", "profile", "aws.cognito.signin.user.admin"] as const;
export const contaAzulCapabilities: Capability[] = [
  "finance.transactions.list",
  "finance.accountsPayable.list",
  "finance.accountsReceivable.list",
  "finance.cashFlow.read",
  "finance.balance.read",
  "finance.invoices.list",
  "finance.customers.list",
  "finance.suppliers.list",
];

export interface ContaAzulTokenResponse extends JsonObject {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  token_type: string;
  id_token?: string;
  scope?: string;
}

export interface ContaAzulConnectedCompany {
  idEmpresa?: string;
  document?: string;
  email?: string;
  tradeName?: string;
  legalName?: string;
  foundedAt?: string;
}

export function createContaAzulOAuthState() {
  return randomBytes(32).toString("base64url");
}

export function contaAzulApiBaseUrl() {
  return (process.env.CONTA_AZUL_API_BASE_URL?.trim() || CONTA_AZUL_DEFAULT_API_BASE_URL).replace(/\/$/, "");
}

export function contaAzulRedirectUri() {
  const configured = process.env.CONTA_AZUL_REDIRECT_URI?.trim();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");
  const redirect = new URL(configured || `${appUrl}/api/integrations/conta-azul/callback`);
  if (process.env.NODE_ENV === "production" && redirect.protocol !== "https:") {
    throw new Error("CONTA_AZUL_REDIRECT_URI deve usar HTTPS em produção");
  }
  return redirect.toString();
}

export function buildContaAzulAuthorizationUrl(input: { clientId: string; redirectUri: string; state: string }) {
  const url = new URL(CONTA_AZUL_AUTHORIZATION_ENDPOINT);
  url.search = new URLSearchParams({ response_type: "code", client_id: input.clientId, redirect_uri: input.redirectUri, state: input.state, scope: contaAzulScopes.join(" ") }).toString();
  return url;
}

async function requestTokens(input: { clientId: string; clientSecret: string; body: URLSearchParams }) {
  const basic = Buffer.from(`${input.clientId}:${input.clientSecret}`, "utf8").toString("base64");
  const response = await fetch(CONTA_AZUL_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: input.body,
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as Partial<ContaAzulTokenResponse> & { error?: string; error_description?: string };
  if (!response.ok || !payload.access_token || !payload.expires_in || !payload.token_type) {
    throw new Error(payload.error_description ?? payload.error ?? "Conta Azul não retornou os tokens de acesso");
  }
  return payload as ContaAzulTokenResponse;
}

export function exchangeContaAzulAuthorizationCode(input: { code: string; clientId: string; clientSecret: string; redirectUri: string }) {
  return requestTokens({ clientId: input.clientId, clientSecret: input.clientSecret, body: new URLSearchParams({ code: input.code, grant_type: "authorization_code", redirect_uri: input.redirectUri }) });
}

export function refreshContaAzulAccessToken(input: { refreshToken: string; clientId: string; clientSecret: string }) {
  return requestTokens({ clientId: input.clientId, clientSecret: input.clientSecret, body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: input.refreshToken }) });
}

export async function fetchContaAzulConnectedCompany(accessToken: string): Promise<ContaAzulConnectedCompany> {
  const response = await fetch(`${contaAzulApiBaseUrl()}/v1/pessoas/conta-conectada`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }, cache: "no-store" });
  const payload = await response.json().catch(() => ({})) as { id_empresa?: string; documento?: string; email?: string; nome_fantasia?: string; razao_social?: string; data_fundacao?: string; error?: string; message?: string };
  if (!response.ok) throw new Error(payload.message ?? payload.error ?? "Não foi possível identificar a empresa conectada no Conta Azul");
  return { idEmpresa: payload.id_empresa, document: payload.documento, email: payload.email, tradeName: payload.nome_fantasia, legalName: payload.razao_social, foundedAt: payload.data_fundacao };
}
