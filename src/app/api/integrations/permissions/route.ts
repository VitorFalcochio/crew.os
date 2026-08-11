import { z } from "zod";
import { apiError } from "@/lib/api/responses";
import { requireOrganization } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { capabilityRegistry } from "@/integrations/core/capability-registry";
import type { Capability } from "@/integrations/core/types";

const schema = z.object({ employeeId: z.uuid(), capability: z.string().min(3).max(120), allowed: z.boolean().default(true), autonomy: z.enum(["observe_only", "suggest", "approval_required", "automatic", "automatic_with_limits"]).default("approval_required"), limits: z.object({ amount: z.number().positive().optional(), currency: z.string().length(3).default("BRL"), perDay: z.number().int().positive().optional() }).default({ currency: "BRL" }) });

export async function POST(request: Request) {
  try {
    const { organizationId, membership } = await requireOrganization(); if (!['owner','admin'].includes(String(membership.role))) return Response.json({ error: "Apenas administradores podem alterar permissões" }, { status: 403 });
    const input = schema.parse(await request.json()); const capability = input.capability as Capability; const definition = capabilityRegistry.get(capability); const admin = createAdminClient();
    const { data: employee } = await admin.from("digital_employees").select("id").eq("organization_id", organizationId).eq("id", input.employeeId).maybeSingle(); if (!employee) return Response.json({ error: "Funcionário inválido" }, { status: 403 });
    const { error: permissionError } = await admin.from("employee_permissions").upsert({ organization_id: organizationId, employee_id: input.employeeId, capability, allowed: input.allowed, constraints: {} }, { onConflict: "organization_id,employee_id,capability" }); if (permissionError) throw permissionError;
    const { error: autonomyError } = await admin.from("employee_autonomy_policies").upsert({ organization_id: organizationId, employee_id: input.employeeId, action_key: capability, action_label: definition.description, mode: input.autonomy, limits: input.limits, active: true }, { onConflict: "organization_id,employee_id,action_key" }); if (autonomyError) throw autonomyError;
    return Response.json({ data: { employeeId: input.employeeId, capability, allowed: input.allowed, autonomy: input.autonomy, limits: input.limits } });
  } catch (error) { return apiError(error); }
}
