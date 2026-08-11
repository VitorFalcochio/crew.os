import { z } from "zod";
import { apiError } from "@/lib/api/responses";
import { requireOrganization } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { SupabaseIntegrationStore } from "@/integrations/persistence/supabase-store";
import { createIntegrationRuntime } from "@/integrations/runtime";
import { processAnaFinancialInbox } from "@/integrations/flows/ana-financial-inbox";
import { sanitize } from "@/integrations/security/sanitize";

const schema = z.object({ employeeId: z.uuid(), messageId: z.string().min(4).max(180), from: z.email(), subject: z.string().min(1).max(300), attachment: z.object({ id: z.string().min(1).max(180), fileName: z.string().min(1).max(255), mimeType: z.literal("application/pdf"), size: z.number().int().positive().max(10_000_000), extractedText: z.string().min(20).max(100_000) }) });

export async function POST(request: Request) {
  try {
    if ((process.env.INTEGRATION_MODE ?? "mock") !== "mock") return Response.json({ error: "Simulação desabilitada fora do modo mock" }, { status: 403 });
    const { organizationId, user } = await requireOrganization(); const input = schema.parse(await request.json()); const admin = createAdminClient();
    const { data: employee } = await admin.from("digital_employees").select("id,name").eq("organization_id", organizationId).eq("id", input.employeeId).maybeSingle(); if (!employee) return Response.json({ error: "Funcionário inválido" }, { status: 403 });
    const payload = sanitize({ messageId: input.messageId, from: input.from, subject: input.subject, hasPdf: true, attachments: [{ id: input.attachment.id, name: input.attachment.fileName, mimeType: input.attachment.mimeType, size: input.attachment.size }], untrustedExternalContent: true });
    const { data: event, error: eventError } = await admin.from("automation_events").insert({ organization_id: organizationId, source: "mock:gmail", event_type: "email.received", idempotency_key: `gmail:${input.messageId}`, payload }).select("id").maybeSingle();
    if (eventError?.code === "23505") return Response.json({ duplicate: true }, { status: 200 }); if (eventError || !event) throw eventError;
    const { data: task, error: taskError } = await admin.from("tasks").insert({ organization_id: organizationId, employee_id: employee.id, title: "Analisar documento financeiro recebido", description: `Documento recebido de ${input.from}. Conteúdo externo tratado como dado não confiável.`, priority: "alta", status: "recebida", requires_approval: true, created_by: user.id, input_data: { automation_event_id: event.id, gmail_message_id: input.messageId } }).select("id").single(); if (taskError) throw taskError;
    const runtime = createIntegrationRuntime(new SupabaseIntegrationStore(admin)); const flow = await processAnaFinancialInbox({ organizationId, employeeId: employee.id, taskId: task.id, messageId: input.messageId, gateway: runtime.gateway, attachments: [{ id: input.attachment.id, fileName: input.attachment.fileName, mimeType: input.attachment.mimeType, size: input.attachment.size, text: input.attachment.extractedText }] });
    await Promise.all([admin.from("automation_events").update({ status: "processed", processed_at: new Date().toISOString() }).eq("organization_id", organizationId).eq("id", event.id), admin.from("activities").insert({ organization_id: organizationId, employee_id: employee.id, task_id: task.id, activity_type: "email_received", title: `${employee.name} recebeu um documento pelo Gmail`, description: input.subject, metadata: { eventId: event.id, messageId: input.messageId }, source: "integration_engine" })]);
    return Response.json({ duplicate: false, eventId: event.id, taskId: task.id, flow }, { status: 202 });
  } catch (error) { return apiError(error); }
}
