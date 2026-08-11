import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { CredentialVault, type EncryptedCredential } from "@/integrations/security/credential-vault";
import { exchangeGoogleAuthorizationCode, fetchGoogleUserInfo, googleCapabilitiesForScopes } from "@/integrations/providers/google/oauth";
import type { JsonObject } from "@/integrations/core/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { saveLocalGoogleConnection } from "@/integrations/providers/google/local-credential-store";

const STATE_COOKIE = "crewos_google_oauth_state";
const VERIFIER_COOKIE = "crewos_google_oauth_verifier";
const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const redirectUri = () => process.env.GOOGLE_OAUTH_REDIRECT_URI ?? `${appUrl()}/api/integrations/google/callback`;
const returnToWorkspace = (status: string) => new URL(`/workspace?google=${encodeURIComponent(status)}`, appUrl());

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const finish = (status: string) => { const response = NextResponse.redirect(returnToWorkspace(status)); response.cookies.set(STATE_COOKIE, "", { path: "/api/integrations/google", maxAge: 0 }); response.cookies.set(VERIFIER_COOKIE, "", { path: "/api/integrations/google", maxAge: 0 }); return response; };
  try {
    const url = new URL(request.url); const error = url.searchParams.get("error"); if (error) return finish(error);
    const code = url.searchParams.get("code"); const state = url.searchParams.get("state"); const expectedState = cookieStore.get(STATE_COOKIE)?.value; const verifier = cookieStore.get(VERIFIER_COOKIE)?.value;
    if (!code || !state || !expectedState || state !== expectedState || !verifier) return finish("invalid_state");
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID; const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET; if (!clientId || !clientSecret) return finish("not_configured");
    const tokens = await exchangeGoogleAuthorizationCode({ code, verifier, clientId, clientSecret, redirectUri: redirectUri() }); const profile = await fetchGoogleUserInfo(tokens.access_token); const now = new Date(); const expiresAt = new Date(now.getTime() + tokens.expires_in * 1000).toISOString();
    if (!isSupabaseConfigured()) { await saveLocalGoogleConnection({ tokens, profile, expiresAt }); return finish("connected"); }
    const { organizationId, membership } = await requireOrganization(); if (!['owner', 'admin'].includes(String(membership.role))) return finish("forbidden"); const admin = createAdminClient();
    const grantedScopes = tokens.scope.split(" ");
    const { data: connection, error: connectionError } = await admin.from("integrations").upsert({ organization_id: organizationId, provider: "google-workspace", status: "connected", account_identifier: profile.sub, scopes: grantedScopes, capabilities: googleCapabilitiesForScopes(grantedScopes), priority: 100, configuration: { mode: "oauth2", services: ["gmail", "calendar"] }, metadata: { email: profile.email, name: profile.name, picture: profile.picture, hostedDomain: profile.hostedDomain }, health: { status: "healthy", lastCheckedAt: now.toISOString(), message: "Google Workspace autorizado" }, connected_at: now.toISOString(), token_expires_at: expiresAt, updated_at: now.toISOString() }, { onConflict: "organization_id,provider" }).select("id").single(); if (connectionError) throw connectionError;
    const vault = new CredentialVault(); const { data: existing } = await admin.from("integration_credentials").select("id,encrypted_payload").eq("organization_id", organizationId).eq("connection_id", connection.id).eq("credential_type", "oauth2").maybeSingle();
    let previous: JsonObject = {}; if (existing?.encrypted_payload) { try { previous = vault.decrypt(existing.encrypted_payload as EncryptedCredential); } catch { previous = {}; } }
    const encrypted = vault.encrypt({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token ?? previous.refreshToken, tokenType: tokens.token_type, scope: tokens.scope, idToken: tokens.id_token, expiresAt, refreshTokenExpiresAt: tokens.refresh_token_expires_in ? new Date(now.getTime() + tokens.refresh_token_expires_in * 1000).toISOString() : previous.refreshTokenExpiresAt });
    const { data: credential, error: credentialError } = await admin.from("integration_credentials").upsert({ organization_id: organizationId, connection_id: connection.id, credential_type: "oauth2", encrypted_payload: encrypted, key_version: encrypted.version, expires_at: expiresAt, updated_at: now.toISOString() }, { onConflict: "organization_id,connection_id,credential_type" }).select("id").single(); if (credentialError) throw credentialError;
    await admin.from("integrations").update({ credentials_reference: `vault:${credential.id}` }).eq("organization_id", organizationId).eq("id", connection.id);
    return finish("connected");
  } catch (error) { console.error("Google OAuth callback failed", error instanceof Error ? error.message : "unknown"); return finish("failed"); }
}
