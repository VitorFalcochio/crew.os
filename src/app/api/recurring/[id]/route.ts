import { z } from "zod";
import { apiError } from "@/lib/api/responses";
import { requireOrganization } from "@/lib/auth/session";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, organizationId, membership } = await requireOrganization();
    if (!( ["owner", "admin", "manager"] as string[]).includes(String(membership.role))) return Response.json({ error: "Seu perfil não pode alterar rotinas" }, { status: 403 });
    const { id } = await context.params;
    const { active } = z.object({ active: z.boolean() }).parse(await request.json());
    const { data, error } = await supabase.from("recurring_delegations").update({ active }).eq("id", id).eq("organization_id", organizationId).select().maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ error: "Rotina não encontrada" }, { status: 404 });
    return Response.json({ data });
  } catch (error) { return apiError(error); }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, organizationId, membership } = await requireOrganization();
    if (!( ["owner", "admin", "manager"] as string[]).includes(String(membership.role))) return Response.json({ error: "Seu perfil não pode excluir rotinas" }, { status: 403 });
    const { id } = await context.params;
    const { error } = await supabase.from("recurring_delegations").delete().eq("id", id).eq("organization_id", organizationId);
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (error) { return apiError(error); }
}
