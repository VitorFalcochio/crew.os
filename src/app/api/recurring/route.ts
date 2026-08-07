import { z } from "zod";
import { apiError } from "@/lib/api/responses";
import { requireOrganization } from "@/lib/auth/session";

const recurringSchema = z.object({ employeeId: z.uuid(), title: z.string().trim().min(4).max(160), description: z.string().trim().min(10).max(10_000), priority: z.enum(["baixa", "media", "alta", "urgente"]).default("media"), requiresApproval: z.boolean().default(true), cadenceMinutes: z.number().int().min(15).max(525600), timezone: z.string().min(3).max(80).default("America/Sao_Paulo"), nextRunAt: z.iso.datetime().optional() });
export async function GET() { try { const { supabase, organizationId } = await requireOrganization(); const { data, error } = await supabase.from("recurring_delegations").select("*").eq("organization_id", organizationId).order("next_run_at"); if (error) throw error; return Response.json({ data }); } catch (error) { return apiError(error); } }
export async function POST(request: Request) {
  try {
    const { supabase, user, organizationId, membership } = await requireOrganization();
    if (!(["owner", "admin", "manager"] as string[]).includes(String(membership.role))) return Response.json({ error: "Seu perfil não pode criar recorrências" }, { status: 403 });
    const input = recurringSchema.parse(await request.json());
    const { data: employee } = await supabase.from("digital_employees").select("id").eq("id", input.employeeId).eq("organization_id", organizationId).maybeSingle();
    if (!employee) return Response.json({ error: "Funcionário inválido" }, { status: 403 });
    const { data, error } = await supabase.from("recurring_delegations").insert({ organization_id: organizationId, employee_id: input.employeeId, title: input.title, description: input.description, priority: input.priority, requires_approval: input.requiresApproval, cadence_minutes: input.cadenceMinutes, timezone: input.timezone, next_run_at: input.nextRunAt ?? new Date().toISOString(), created_by: user.id }).select().single();
    if (error) throw error;
    return Response.json({ data }, { status: 201 });
  } catch (error) { return apiError(error); }
}
