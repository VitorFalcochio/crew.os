import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export class AuthenticationError extends Error {}
export class OrganizationAccessError extends Error {}

export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new AuthenticationError("Sessão inválida ou expirada");
  return { supabase, user: data.user };
}

export async function requireOrganization() {
  const { supabase, user } = await requireUser();
  const cookieStore = await cookies();
  const selectedId = cookieStore.get("crewos_organization_id")?.value;
  let query = supabase.from("organization_members").select("organization_id, role, organizations(id, name, slug)").eq("user_id", user.id);
  if (selectedId) query = query.eq("organization_id", selectedId);
  const { data, error } = await query.order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (error || !data) throw new OrganizationAccessError("Usuário ainda não pertence a uma empresa");
  return { supabase, user, organizationId: data.organization_id as string, membership: data };
}
