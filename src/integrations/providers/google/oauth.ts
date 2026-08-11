import { createHash, randomBytes } from "node:crypto";
import type { Capability, JsonObject } from "../../core/types";

export const GOOGLE_AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
export const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

export const googleWorkspaceScopes = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar.events",
] as const;

export const googleWorkspaceCapabilities: Capability[] = [
  "email.read",
  "email.search",
  "email.downloadAttachment",
  "email.send",
  "calendar.events.list",
  "calendar.event.create",
  "calendar.event.update",
  "calendar.event.delete",
];

export function googleCapabilitiesForScopes(scopes: readonly string[]): Capability[] {
  const granted = new Set(scopes);
  return googleWorkspaceCapabilities.filter((capability) => capability !== "email.send" || granted.has("https://www.googleapis.com/auth/gmail.send"));
}

export function createGoogleOAuthChallenge() {
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(64).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { state, verifier, challenge };
}

export function buildGoogleAuthorizationUrl(input: { clientId: string; redirectUri: string; state: string; challenge: string; loginHint?: string }) {
  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
  url.search = new URLSearchParams({ client_id: input.clientId, redirect_uri: input.redirectUri, response_type: "code", scope: googleWorkspaceScopes.join(" "), access_type: "offline", include_granted_scopes: "true", prompt: "consent select_account", state: input.state, code_challenge: input.challenge, code_challenge_method: "S256", ...(input.loginHint ? { login_hint: input.loginHint } : {}) }).toString();
  return url;
}

export interface GoogleTokenResponse extends JsonObject { access_token: string; expires_in: number; refresh_token?: string; refresh_token_expires_in?: number; scope: string; token_type: string; id_token?: string }

export async function exchangeGoogleAuthorizationCode(input: { code: string; verifier: string; clientId: string; clientSecret: string; redirectUri: string }) {
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code: input.code, client_id: input.clientId, client_secret: input.clientSecret, redirect_uri: input.redirectUri, grant_type: "authorization_code", code_verifier: input.verifier }), cache: "no-store" });
  const payload = await response.json() as GoogleTokenResponse & { error?: string; error_description?: string };
  if (!response.ok || !payload.access_token) throw new Error(payload.error_description ?? payload.error ?? "Google não retornou um access token");
  return payload;
}

export async function fetchGoogleUserInfo(accessToken: string) {
  const response = await fetch(GOOGLE_USERINFO_ENDPOINT, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  const payload = await response.json() as { sub?: string; email?: string; email_verified?: boolean; name?: string; picture?: string; hd?: string; error?: string };
  if (!response.ok || !payload.sub || !payload.email || !payload.email_verified) throw new Error(payload.error ?? "Não foi possível validar a conta Google");
  return { sub: payload.sub, email: payload.email, name: payload.name, picture: payload.picture, hostedDomain: payload.hd };
}
