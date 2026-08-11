import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireOrganization } from "@/lib/auth/session";

export const WAITLIST_ADMIN_COOKIE = "crewos_waitlist_admin";

export class WaitlistAdminAccessError extends Error {}

function configuredPassword() {
  return process.env.CREWOS_WAITLIST_ADMIN_PASSWORD?.trim() ?? "";
}
export function waitlistAdminToken(password = configuredPassword()) {
  if (!password) return "";
  return createHmac("sha256", password).update("crewos:waitlist-admin:v1").digest("base64url");
}

export function validWaitlistAdminPassword(candidate: string) {
  const expected = configuredPassword();
  if (expected.length < 12 || candidate.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
}

export async function requireWaitlistAdmin() {
  if (isSupabaseConfigured()) {
    const context = await requireOrganization();
    if (!["owner", "admin"].includes(String(context.membership.role))) throw new WaitlistAdminAccessError("Somente proprietários e administradores podem consultar a lista de espera");
    return { actor: context.user.email ?? context.user.id, mode: "supabase" as const };
  }

  const password = configuredPassword();
  if (!password && process.env.NODE_ENV !== "production") return { actor: "administrador local", mode: "development" as const };
  if (password.length < 12) throw new WaitlistAdminAccessError("Configure CREWOS_WAITLIST_ADMIN_PASSWORD com pelo menos 12 caracteres");
  const cookieStore = await cookies();
  const received = cookieStore.get(WAITLIST_ADMIN_COOKIE)?.value ?? "";
  const expected = waitlistAdminToken(password);
  if (!received || received.length !== expected.length || !timingSafeEqual(Buffer.from(received), Buffer.from(expected))) throw new WaitlistAdminAccessError("Autenticação administrativa necessária");
  return { actor: "administrador local", mode: "password" as const };
}
