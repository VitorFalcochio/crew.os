import { z } from "zod";
import { apiError } from "@/lib/api/responses";
import { requireOrganization } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";

const createTaskSchema = z.object({
  employeeId: z.uuid(), title: z.string().trim().min(4).max(160), description: z.string().trim().min(10).max(10_000),
  priority: z.enum(["baixa", "media", "alta", "urgente"]), dueAt: z.iso.datetime().nullable().optional(), requiresApproval: z.boolean().default(true),
});

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();
    const { data, error } = await supabase.from("tasks").select("*, digital_employees(id,name,role_name,department)").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return Response.json({ data });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const { supabase, user, organizationId } = await requireOrganization();
    if (!rateLimit(`task:${user.id}`, 20).allowed) return Response.json({ error: "Muitas delegações. Aguarde um minuto." }, { status: 429 });
    const input = createTaskSchema.parse(await request.json());
    const { data: employee } = await supabase.from("digital_employees").select("id").eq("id", input.employeeId).eq("organization_id", organizationId).maybeSingle();
    if (!employee) return Response.json({ error: "Funcionário não pertence à sua empresa" }, { status: 403 });
    const { data, error } = await supabase.from("tasks").insert({ organization_id: organizationId, employee_id: input.employeeId, title: input.title, description: input.description, priority: input.priority, due_at: input.dueAt ?? null, requires_approval: input.requiresApproval, created_by: user.id, status: "recebida", input_data: {} }).select().single();
    if (error) throw error;
    await supabase.from("activities").insert({ organization_id: organizationId, employee_id: input.employeeId, task_id: data.id, activity_type: "task_created", title: "Nova delegação recebida", description: input.title, metadata: { priority: input.priority } });
    return Response.json({ data }, { status: 201 });
  } catch (error) { return apiError(error); }
}
