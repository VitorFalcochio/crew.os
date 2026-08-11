import "server-only";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { CredentialVault, type EncryptedCredential } from "../../security/credential-vault";
import { googleCapabilitiesForScopes, type GoogleTokenResponse } from "./oauth";

interface LocalGoogleRecord {
  version: 1;
  provider: "google-workspace";
  status: "connected";
  accountIdentifier: string;
  email: string;
  name?: string;
  picture?: string;
  hostedDomain?: string;
  scopes: string[];
  capabilities: string[];
  tokenExpiresAt: string;
  updatedAt: string;
  encryptedCredentials: EncryptedCredential;
}

const dataDirectory = () => path.join(process.cwd(), ".crewos-data");
const dataFile = () => path.join(dataDirectory(), "google-workspace.json");

async function readRecord() {
  try { return JSON.parse(await readFile(dataFile(), "utf8")) as LocalGoogleRecord; } catch { return undefined; }
}

async function writeRecord(record: LocalGoogleRecord) {
  await mkdir(dataDirectory(), { recursive: true });
  const temporary = `${dataFile()}.tmp`;
  await writeFile(temporary, JSON.stringify(record, null, 2), { encoding: "utf8", mode: 0o600 });
  await rename(temporary, dataFile());
}

export async function saveLocalGoogleConnection(input: { tokens: GoogleTokenResponse; profile: { sub: string; email: string; name?: string; picture?: string; hostedDomain?: string }; expiresAt: string }) {
  if (process.env.NODE_ENV === "production") throw new Error("Credenciais locais são bloqueadas em produção");
  const vault = new CredentialVault(); const previousRecord = await readRecord(); let previousRefreshToken: unknown;
  if (previousRecord) { try { previousRefreshToken = vault.decrypt(previousRecord.encryptedCredentials).refreshToken; } catch { previousRefreshToken = undefined; } }
  const encryptedCredentials = vault.encrypt({ accessToken: input.tokens.access_token, refreshToken: input.tokens.refresh_token ?? previousRefreshToken, tokenType: input.tokens.token_type, scope: input.tokens.scope, idToken: input.tokens.id_token, expiresAt: input.expiresAt });
  const scopes = input.tokens.scope.split(" ");
  const record: LocalGoogleRecord = { version: 1, provider: "google-workspace", status: "connected", accountIdentifier: input.profile.sub, email: input.profile.email, name: input.profile.name, picture: input.profile.picture, hostedDomain: input.profile.hostedDomain, scopes, capabilities: googleCapabilitiesForScopes(scopes), tokenExpiresAt: input.expiresAt, updatedAt: new Date().toISOString(), encryptedCredentials };
  await writeRecord(record);
  return localGoogleConnectionView(record);
}

function localGoogleConnectionView(record: LocalGoogleRecord) { return { provider: record.provider, status: record.status, accountIdentifier: record.accountIdentifier, email: record.email, name: record.name, picture: record.picture, scopes: record.scopes, capabilities: record.capabilities, tokenExpiresAt: record.tokenExpiresAt, updatedAt: record.updatedAt }; }
export async function getLocalGoogleConnection() { const record = await readRecord(); return record ? localGoogleConnectionView(record) : undefined; }

export async function getValidLocalGoogleAccessToken() {
  if (process.env.NODE_ENV === "production") throw new Error("Credenciais locais são bloqueadas em produção");
  const record = await readRecord();
  if (!record) throw new Error("Google Workspace não está conectado");

  const vault = new CredentialVault();
  const credentials = vault.decrypt(record.encryptedCredentials);
  const accessToken = typeof credentials.accessToken === "string" ? credentials.accessToken : undefined;
  const expiresAt = typeof credentials.expiresAt === "string" ? credentials.expiresAt : record.tokenExpiresAt;
  if (accessToken && new Date(expiresAt).getTime() > Date.now() + 60_000) return accessToken;

  const refreshToken = typeof credentials.refreshToken === "string" ? credentials.refreshToken : undefined;
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!refreshToken || !clientId || !clientSecret) throw new Error("A conexão do Google precisa ser autorizada novamente");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
    cache: "no-store",
  });
  const payload = await response.json() as { access_token?: string; expires_in?: number; scope?: string; token_type?: string; error?: string; error_description?: string };
  if (!response.ok || !payload.access_token) throw new Error(payload.error_description ?? payload.error ?? "Não foi possível renovar o acesso ao Google");

  const nextExpiresAt = new Date(Date.now() + (payload.expires_in ?? 3600) * 1000).toISOString();
  const nextRecord: LocalGoogleRecord = {
    ...record,
    tokenExpiresAt: nextExpiresAt,
    updatedAt: new Date().toISOString(),
    encryptedCredentials: vault.encrypt({
      ...credentials,
      accessToken: payload.access_token,
      refreshToken,
      tokenType: payload.token_type ?? credentials.tokenType,
      scope: payload.scope ?? credentials.scope,
      expiresAt: nextExpiresAt,
    }),
  };
  await writeRecord(nextRecord);
  return payload.access_token;
}

export async function disconnectLocalGoogleConnection() { if (process.env.NODE_ENV === "production") throw new Error("Credenciais locais são bloqueadas em produção"); try { await unlink(dataFile()); return true; } catch { return false; } }
