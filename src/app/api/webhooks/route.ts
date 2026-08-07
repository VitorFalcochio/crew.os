import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { apiError } from "@/lib/api/responses";
import { requireOrganization } from "@/lib/auth/session";

const webhookSchema = z.object({ name: z.string().trim().min(2).max(100), employeeId: z.uuid(), eventType: z.string().trim().min(2).max(100), taskTitle: z.string().trim().min(4).max(160), taskDescription: z.string().trim().min(10).max(2000), priority: z.enum(["baixa", "media", "alta", "urgente"]).default("media"), requiresApproval: z.boolean().default(true) });
export async function GET() { try { const { supabase, organizationId } = await requireOrganization(); const { data, error } = await supabase.from("webhook_endpoints").select("id,endpoint_key,name,event_type,active,last_received_at,created_at,employee_id").eq("organization_id", organizationId).order("created_at", { ascending: false }); if (error) throw error; return Response.json({ data }); } catch (error) { return apiError(error); } }
export async function POST(request: Request) {
  try {
    const { supabase, user, organizationId, membership } = await requireOrganization();
    if (!(["owner", "admin", "manager"] as string[]).includes(String(membership.role))) return Response.json({ error: "Sem permissão para criar webhooks" }, { status: 403 });
    const input = webhookSchema.parse(await request.json());
    const { data: employee } = await supabase.from("digital_employees").select("id").eq("id", input.employeeId).eq("organization_id", organizationId).maybeSingle();
    if (!employee) return Response.json({ error: "Funcionário inválido" }, { status: 403 });
    const secret = randomBytes(32).toString("hex"); const secretHash = createHash("sha256").update(secret).digest("hex");
    const { data, error } = await supabase.from("webhook_endpoints").insert({ organization_id: organizationId, employee_id: input.employeeId, name: input.name, event_type: input.eventType, secret_hash: secretHash, task_template: { title: input.taskTitle, description: input.taskDescription, priority: input.priority, requires_approval: input.requiresApproval }, created_by: user.id }).select("id,endpoint_key,name,event_type").single();
    if (error) throw error;
    return Response.json({ data, endpoint: `/api/webhooks/${data.endpoint_key}`, secret, warning: "Este segredo será exibido apenas uma vez." }, { status: 201 });
  } catch (error) { return apiError(error); }
}
