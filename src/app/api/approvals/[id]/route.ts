import { z } from "zod";
import { apiError } from "@/lib/api/responses";
import { requireOrganization } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";

const resolutionSchema = z.object({ status: z.enum(["aprovada", "recusada", "ajuste_solicitado"]), note: z.string().trim().max(2000).optional() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const approvalId = z.uuid().parse(id);
    const { supabase, user, organizationId, membership } = await requireOrganization();
    if (!rateLimit(`approval:${user.id}`, 40).allowed) return Response.json({ error: "Muitas decisões em sequência." }, { status: 429 });
    if (!(["owner", "admin", "manager"] as string[]).includes(String(membership.role))) return Response.json({ error: "Seu perfil não pode resolver aprovações" }, { status: 403 });
    const input = resolutionSchema.parse(await request.json());
    const { data, error } = await supabase.rpc("resolve_task_approval", { p_approval_id: approvalId, p_organization_id: organizationId, p_status: input.status, p_note: input.note ?? null });
    if (error) throw error;
    return Response.json({ data });
  } catch (error) { return apiError(error); }
}
