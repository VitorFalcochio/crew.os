import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

function matchesSecret(provided: string, expectedHash: string) { const actual = Buffer.from(createHash("sha256").update(provided).digest("hex")); const expected = Buffer.from(expectedHash); return actual.length === expected.length && timingSafeEqual(actual, expected); }
export async function POST(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 1_000_000) return Response.json({ error: "Payload excede 1 MB" }, { status: 413 });
  const { key } = await params; const parsedKey = z.uuid().safeParse(key);
  if (!parsedKey.success) return Response.json({ error: "Webhook inválido" }, { status: 404 });
  const secret = request.headers.get("x-crewos-secret") ?? ""; const idempotencyKey = request.headers.get("x-idempotency-key") ?? "";
  if (!secret || idempotencyKey.length < 4 || idempotencyKey.length > 180) return Response.json({ error: "Cabeçalhos x-crewos-secret e x-idempotency-key são obrigatórios" }, { status: 400 });
  const db = createAdminClient();
  const { data: endpoint } = await db.from("webhook_endpoints").select("*,organizations(owner_id)").eq("endpoint_key", parsedKey.data).eq("active", true).maybeSingle();
  if (!endpoint || !matchesSecret(secret, endpoint.secret_hash)) return Response.json({ error: "Webhook não autorizado" }, { status: 401 });
  const payload = await request.json() as Record<string, unknown>;
  const { data: event, error: eventError } = await db.from("automation_events").insert({ organization_id: endpoint.organization_id, source: `webhook:${endpoint.id}`, event_type: endpoint.event_type, idempotency_key: idempotencyKey, payload }).select().maybeSingle();
  if (eventError?.code === "23505") return Response.json({ accepted: true, duplicate: true });
  if (eventError || !event) return Response.json({ error: "Evento não pôde ser registrado" }, { status: 500 });
  const template = endpoint.task_template as { title: string; description: string; priority: string; requires_approval: boolean };
  const organization = endpoint.organizations as unknown as { owner_id: string };
  const { data: task, error: taskError } = await db.from("tasks").insert({ organization_id: endpoint.organization_id, employee_id: endpoint.employee_id, title: template.title, description: template.description, priority: template.priority, status: "recebida", requires_approval: template.requires_approval, created_by: organization.owner_id, input_data: { automation_event_id: event.id, webhook_payload: payload } }).select("id").single();
  if (taskError) return Response.json({ error: "Tarefa não pôde ser criada" }, { status: 500 });
  await Promise.all([db.from("automation_events").update({ status: "processed", processed_at: new Date().toISOString() }).eq("id", event.id), db.from("webhook_endpoints").update({ last_received_at: new Date().toISOString() }).eq("id", endpoint.id)]);
  return Response.json({ accepted: true, duplicate: false, eventId: event.id, taskId: task.id }, { status: 202 });
}
