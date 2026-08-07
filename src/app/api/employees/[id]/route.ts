import { z } from "zod";
import { apiError } from "@/lib/api/responses";
import { requireOrganization } from "@/lib/auth/session";

const statusSchema = z.object({ status: z.enum(["trabalhando", "aguardando_aprovacao", "disponivel", "pausado", "com_erro", "configurando"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, organizationId, membership } = await requireOrganization();
    if (!( ["owner", "admin", "manager"] as string[]).includes(String(membership.role))) return Response.json({ error: "Seu perfil não pode alterar funcionários" }, { status: 403 });
    const { id } = await context.params;
    const { status } = statusSchema.parse(await request.json());
    const { data, error } = await supabase.from("digital_employees").update({ status }).eq("id", id).eq("organization_id", organizationId).select("id,status").maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ error: "Funcionário não encontrado" }, { status: 404 });
    return Response.json({ data });
  } catch (error) { return apiError(error); }
}
