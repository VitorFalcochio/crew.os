import { z } from "zod";
import { apiError } from "@/lib/api/responses";
import { requireOrganization } from "@/lib/auth/session";

const settingsSchema = z.object({ name: z.string().trim().min(2).max(160), industry: z.string().trim().min(2).max(120) });

export async function PATCH(request: Request) {
  try {
    const { supabase, organizationId, membership } = await requireOrganization();
    if (!( ["owner", "admin"] as string[]).includes(String(membership.role))) return Response.json({ error: "Seu perfil não pode alterar a empresa" }, { status: 403 });
    const input = settingsSchema.parse(await request.json());
    const { data, error } = await supabase.from("organizations").update(input).eq("id", organizationId).select("id,name,industry").single();
    if (error) throw error;
    return Response.json({ data });
  } catch (error) { return apiError(error); }
}
