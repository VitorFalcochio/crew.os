import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { JsonObject } from "@/integrations/core/types";
import { CredentialVault, type EncryptedCredential } from "@/integrations/security/credential-vault";
import {
  contaAzulApiBaseUrl,
  contaAzulCapabilities,
  contaAzulScopes,
  refreshContaAzulAccessToken,
  type ContaAzulConnectedCompany,
  type ContaAzulTokenResponse,
} from "./oauth";

function tokenExpiry(tokens: ContaAzulTokenResponse) {
  return new Date(Date.now() + tokens.expires_in * 1000).toISOString();
}

function accountIdentifier(company: ContaAzulConnectedCompany, organizationId: string) {
  return company.idEmpresa || company.document || company.email || `organization:${organizationId}`;
}

export async function saveContaAzulConnection(input: { organizationId: string; tokens: ContaAzulTokenResponse; company: ContaAzulConnectedCompany }) {
  const admin = createAdminClient();
  const vault = new CredentialVault();
  const now = new Date().toISOString();
  const expiresAt = tokenExpiry(input.tokens);
  const { data: connection, error: connectionError } = await admin.from("integrations").upsert({
    organization_id: input.organizationId,
    provider: "conta-azul",
    status: "connected",
    account_identifier: accountIdentifier(input.company, input.organizationId),
    scopes: [...contaAzulScopes],
    capabilities: contaAzulCapabilities,
    priority: 90,
    configuration: { mode: "oauth2", apiBaseUrl: contaAzulApiBaseUrl(), syncMode: "polling" },
    metadata: { company: input.company },
    health: { status: "healthy", lastCheckedAt: now, message: "Conta Azul autorizado" },
    connected_at: now,
    token_expires_at: expiresAt,
    updated_at: now,
  }, { onConflict: "organization_id,provider" }).select("id").single();
  if (connectionError) throw connectionError;

  const { data: existing, error: existingError } = await admin.from("integration_credentials").select("id,encrypted_payload")
    .eq("organization_id", input.organizationId).eq("connection_id", connection.id).eq("credential_type", "oauth2").maybeSingle();
  if (existingError) throw existingError;
  let previous: JsonObject = {};
  if (existing?.encrypted_payload) {
    try { previous = vault.decrypt(existing.encrypted_payload as EncryptedCredential); } catch { previous = {}; }
  }
  const refreshToken = input.tokens.refresh_token ?? (typeof previous.refreshToken === "string" ? previous.refreshToken : undefined);
  if (!refreshToken) {
    await admin.from("integrations").update({ status: "requires_reauth", health: { status: "degraded", lastCheckedAt: now, message: "Conta Azul não retornou refresh token" }, updated_at: now })
      .eq("organization_id", input.organizationId).eq("id", connection.id);
    throw new Error("Conta Azul não retornou refresh token; autorize a aplicação novamente");
  }
  const encrypted = vault.encrypt({ accessToken: input.tokens.access_token, refreshToken, tokenType: input.tokens.token_type, idToken: input.tokens.id_token, scope: input.tokens.scope, expiresAt });
  const { data: credential, error: credentialError } = await admin.from("integration_credentials").upsert({
    organization_id: input.organizationId,
    connection_id: connection.id,
    credential_type: "oauth2",
    encrypted_payload: encrypted,
    key_version: encrypted.version,
    expires_at: expiresAt,
    updated_at: now,
  }, { onConflict: "organization_id,connection_id,credential_type" }).select("id").single();
  if (credentialError) throw credentialError;
  const { error: referenceError } = await admin.from("integrations").update({ credentials_reference: `vault:${credential.id}` })
    .eq("organization_id", input.organizationId).eq("id", connection.id);
  if (referenceError) throw referenceError;
  return { connectionId: connection.id, expiresAt };
}

export async function getValidContaAzulAccessToken(organizationId: string) {
  const admin = createAdminClient();
  const { data: connection, error: connectionError } = await admin.from("integrations").select("id,status")
    .eq("organization_id", organizationId).eq("provider", "conta-azul").maybeSingle();
  if (connectionError) throw connectionError;
  if (!connection || connection.status !== "connected") throw new Error("Conta Azul não está conectado");
  const { data: credential, error: credentialError } = await admin.from("integration_credentials").select("id,encrypted_payload")
    .eq("organization_id", organizationId).eq("connection_id", connection.id).eq("credential_type", "oauth2").maybeSingle();
  if (credentialError) throw credentialError;
  if (!credential) throw new Error("Credenciais do Conta Azul não foram encontradas");
  const vault = new CredentialVault();
  const current = vault.decrypt(credential.encrypted_payload as EncryptedCredential);
  const accessToken = typeof current.accessToken === "string" ? current.accessToken : undefined;
  const expiresAt = typeof current.expiresAt === "string" ? current.expiresAt : undefined;
  if (accessToken && expiresAt && new Date(expiresAt).getTime() > Date.now() + 60_000) return { accessToken, connectionId: connection.id };
  const refreshToken = typeof current.refreshToken === "string" ? current.refreshToken : undefined;
  const clientId = process.env.CONTA_AZUL_CLIENT_ID;
  const clientSecret = process.env.CONTA_AZUL_CLIENT_SECRET;
  if (!refreshToken || !clientId || !clientSecret) {
    await markContaAzulReauthRequired(organizationId, connection.id, "Reconecte o Conta Azul para renovar o acesso");
    throw new Error("A conexão do Conta Azul precisa ser autorizada novamente");
  }
  try {
    const tokens = await refreshContaAzulAccessToken({ refreshToken, clientId, clientSecret });
    const nextExpiresAt = tokenExpiry(tokens);
    const encrypted = vault.encrypt({ ...current, accessToken: tokens.access_token, refreshToken: tokens.refresh_token ?? refreshToken, tokenType: tokens.token_type, idToken: tokens.id_token ?? current.idToken, scope: tokens.scope ?? current.scope, expiresAt: nextExpiresAt });
    const now = new Date().toISOString();
    const { error: updateCredentialError } = await admin.from("integration_credentials").update({ encrypted_payload: encrypted, expires_at: nextExpiresAt, updated_at: now })
      .eq("organization_id", organizationId).eq("id", credential.id);
    if (updateCredentialError) throw updateCredentialError;
    const { error: updateConnectionError } = await admin.from("integrations").update({ status: "connected", token_expires_at: nextExpiresAt, updated_at: now, health: { status: "healthy", lastCheckedAt: now, message: "Token do Conta Azul renovado" } })
      .eq("organization_id", organizationId).eq("id", connection.id);
    if (updateConnectionError) throw updateConnectionError;
    return { accessToken: tokens.access_token, connectionId: connection.id };
  } catch (error) {
    await markContaAzulReauthRequired(organizationId, connection.id, "Não foi possível renovar o acesso ao Conta Azul");
    throw error;
  }
}

async function markContaAzulReauthRequired(organizationId: string, connectionId: string, message: string) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  await admin.from("integrations").update({ status: "requires_reauth", updated_at: now, health: { status: "degraded", lastCheckedAt: now, message } })
    .eq("organization_id", organizationId).eq("id", connectionId);
}

export async function disconnectContaAzul(organizationId: string) {
  const admin = createAdminClient();
  const { data: connection, error: findError } = await admin.from("integrations").select("id")
    .eq("organization_id", organizationId).eq("provider", "conta-azul").maybeSingle();
  if (findError) throw findError;
  if (!connection) return false;
  const { error: credentialError } = await admin.from("integration_credentials").delete().eq("organization_id", organizationId).eq("connection_id", connection.id);
  if (credentialError) throw credentialError;
  const now = new Date().toISOString();
  const { error: connectionError } = await admin.from("integrations").update({
    status: "disconnected",
    credentials_reference: null,
    token_expires_at: null,
    updated_at: now,
    health: { status: "unknown", lastCheckedAt: now, message: "Conta Azul desconectado pelo usuário" },
  }).eq("organization_id", organizationId).eq("id", connection.id);
  if (connectionError) throw connectionError;
  return true;
}
