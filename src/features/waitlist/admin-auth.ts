import "server-only";

import { requireOrganization } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export class WaitlistAdminAccessError extends Error {}

export async function requireWaitlistAdmin() {
  if (!isSupabaseConfigured()) {
    throw new WaitlistAdminAccessError(
      "O painel administrativo exige Supabase configurado",
    );
  }

  const context = await requireOrganization();

  if (!["owner", "admin"].includes(String(context.membership.role))) {
    throw new WaitlistAdminAccessError(
      "Somente proprietários e administradores podem consultar a lista de espera",
    );
  }

  return {
    actor: context.user.email ?? context.user.id,
    mode: "supabase" as const,
  };
}
