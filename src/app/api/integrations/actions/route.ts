import { z } from "zod";
import { apiError } from "@/lib/api/responses";
import { requireOrganization } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { SupabaseIntegrationStore } from "@/integrations/persistence/supabase-store";
import { createIntegrationRuntime } from "@/integrations/runtime";
import { capabilityRegistry } from "@/integrations/core/capability-registry";
import type { Capability } from "@/integrations/core/types";

const schema = z.object({ taskId: z.uuid(), capability: z.string().min(3).max(120), input: z.record(z.string(), z.unknown()).default({}), idempotencyKey: z.string().min(8).max(180) });

export async function POST(request: Request) {
  try {
    const { user, organizationId } = await requireOrganization();
    if (!rateLimit(`integration-action:${organizationId}:${user.id}`, 60).allowed) return Response.json({ error: { code: "RATE_LIMITED", message: "Limite de ações atingido" } }, { status: 429 });
    const input = schema.parse(await request.json()); const capability = input.capability as Capability; capabilityRegistry.get(capability);
    const admin = createAdminClient();
    const { data: task } = await admin.from("tasks").select("id,employee_id").eq("organization_id", organizationId).eq("id", input.taskId).maybeSingle();
    if (!task?.employee_id) return Response.json({ error: { code: "PERMISSION_DENIED", message: "Tarefa ou funcionário inválido" } }, { status: 403 });
    const runtime = createIntegrationRuntime(new SupabaseIntegrationStore(admin));
    const result = await runtime.gateway.execute({ organizationId, employeeId: task.employee_id, taskId: task.id, capability, input: input.input, idempotencyKey: input.idempotencyKey, context: { requestedBy: user.id } });
    return Response.json(result, { status: result.success ? 200 : result.requiresApproval ? 202 : 400 });
  } catch (error) { return apiError(error); }
}
