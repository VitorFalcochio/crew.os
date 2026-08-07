import { z } from "zod";
import { apiError } from "@/lib/api/responses";
import { requireOrganization } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";

const eventSchema = z.object({ source: z.string().trim().min(2).max(80), eventType: z.string().trim().min(2).max(120), idempotencyKey: z.string().trim().min(4).max(180), employeeId: z.uuid(), task: z.object({ title: z.string().trim().min(4).max(160), description: z.string().trim().min(10).max(10_000), priority: z.enum(["baixa", "media", "alta", "urgente"]).default("media"), requiresApproval: z.boolean().default(true) }), payload: z.record(z.string(), z.unknown()).default({}) });

export async function POST(request: Request) {
  try {
    const { supabase, user, organizationId } = await requireOrganization();
    if (!rateLimit(`event:${user.id}`, 60).allowed) return Response.json({ error: "Limite de eventos atingido" }, { status: 429 });
    const input = eventSchema.parse(await request.json());
    const { data: employee } = await supabase.from("digital_employees").select("id").eq("id", input.employeeId).eq("organization_id", organizationId).maybeSingle();
    if (!employee) return Response.json({ error: "Funcionário inválido" }, { status: 403 });
    const { data: event, error: eventError } = await supabase.from("automation_events").insert({ organization_id: organizationId, source: input.source, event_type: input.eventType, idempotency_key: input.idempotencyKey, payload: input.payload }).select().maybeSingle();
    if (eventError?.code === "23505") { const { data: existing } = await supabase.from("automation_events").select("id,status").eq("organization_id", organizationId).eq("source", input.source).eq("idempotency_key", input.idempotencyKey).single(); return Response.json({ duplicate: true, event: existing }); }
    if (eventError || !event) throw eventError;
    const { data: task, error: taskError } = await supabase.from("tasks").insert({ organization_id: organizationId, employee_id: input.employeeId, title: input.task.title, description: input.task.description, priority: input.task.priority, status: "recebida", requires_approval: input.task.requiresApproval, created_by: user.id, input_data: { automation_event_id: event.id, ...input.payload } }).select().single();
    if (taskError) throw taskError;
    await supabase.from("automation_events").update({ status: "processed", processed_at: new Date().toISOString() }).eq("id", event.id);
    return Response.json({ duplicate: false, eventId: event.id, task }, { status: 202 });
  } catch (error) { return apiError(error); }
}
