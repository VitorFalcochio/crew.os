import { z } from "zod";
import { apiError } from "@/lib/api/responses";
import { requireOrganization } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { SupabaseIntegrationStore } from "@/integrations/persistence/supabase-store";
import { createIntegrationRuntime } from "@/integrations/runtime";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try { const { organizationId, membership } = await requireOrganization(); if (!['owner','admin','manager'].includes(String(membership.role))) return Response.json({ error: "Sem permissão para executar aprovações" }, { status: 403 }); const { id } = await context.params; z.uuid().parse(id); const admin = createAdminClient(); const runtime = createIntegrationRuntime(new SupabaseIntegrationStore(admin)); const result = await runtime.gateway.executeApproved({ organizationId, approvalId: id }); return Response.json(result, { status: result.success ? 200 : 409 }); } catch (error) { return apiError(error); }
}
