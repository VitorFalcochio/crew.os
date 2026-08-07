"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const templateIds: Record<string, string> = {
  ana: "10000000-0000-0000-0000-000000000001", carlos: "10000000-0000-0000-0000-000000000002",
  sofia: "10000000-0000-0000-0000-000000000003", julia: "10000000-0000-0000-0000-000000000004", lucas: "10000000-0000-0000-0000-000000000005",
};
const schema = z.object({ name: z.string().trim().min(2).max(120), industry: z.string().trim().min(2).max(100), size: z.string().max(30), departments: z.string().max(500), difficulties: z.string().max(3000), employees: z.array(z.string()).min(1).max(3) });
function slugify(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 55); }

export async function onboardOrganization(input: unknown) {
  if (!isSupabaseConfigured()) redirect("/central");
  const parsed = schema.parse(input);
  const { supabase } = await requireUser();
  const selectedTemplates = parsed.employees.map((id) => templateIds[id]).filter(Boolean);
  const { data, error } = await supabase.rpc("create_organization_with_owner", {
    p_name: parsed.name, p_slug: `${slugify(parsed.name)}-${crypto.randomUUID().slice(0, 6)}`,
    p_industry: parsed.industry, p_size: parsed.size, p_template_ids: selectedTemplates,
    p_context: { departments: parsed.departments, difficulties: parsed.difficulties },
  });
  if (error || !data) throw new Error(error?.message ?? "Não foi possível criar a empresa");
  const cookieStore = await cookies();
  cookieStore.set("crewos_organization_id", String(data), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/central");
}
