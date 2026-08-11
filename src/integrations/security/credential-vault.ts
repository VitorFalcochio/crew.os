import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { JsonObject } from "../core/types";

export interface EncryptedCredential { version: 1; algorithm: "aes-256-gcm"; iv: string; tag: string; ciphertext: string }

function keyFromEnvironment() {
  const encoded = process.env.CREWOS_CREDENTIAL_ENCRYPTION_KEY;
  if (!encoded) throw new Error("CREWOS_CREDENTIAL_ENCRYPTION_KEY não configurada");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("CREWOS_CREDENTIAL_ENCRYPTION_KEY deve ter 32 bytes em base64");
  return key;
}

export class CredentialVault {
  constructor(private readonly key = keyFromEnvironment()) {}
  encrypt(credentials: JsonObject): EncryptedCredential {
    const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(credentials), "utf8"), cipher.final()]);
    return { version: 1, algorithm: "aes-256-gcm", iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ciphertext: ciphertext.toString("base64") };
  }
  decrypt(payload: EncryptedCredential): JsonObject {
    const decipher = createDecipheriv("aes-256-gcm", this.key, Buffer.from(payload.iv, "base64"));
    decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, "base64")), decipher.final()]).toString("utf8")) as JsonObject;
  }
  publicView(reference: string) { return { reference, configured: true }; }
}
