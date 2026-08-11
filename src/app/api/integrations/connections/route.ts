import { z } from "zod";
import { apiError } from "@/lib/api/responses";
import { requireOrganization } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createIntegrationRuntime } from "@/integrations/runtime";
import { SupabaseIntegrationStore } from "@/integrations/persistence/supabase-store";

const createSchema = z.object({ provider: z.string().min(2).max(80), accountIdentifier: z.string().max(180).optional(), priority: z.number().int().min(0).max(100).default(0) });

export async function GET() {
  try { const { supabase, organizationId } = await requireOrganization(); const store = new SupabaseIntegrationStore(supabase); return Response.json({ data: await store.listConnections(organizationId), mode: process.env.INTEGRATION_MODE ?? "mock" }); } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const { organizationId, membership } = await requireOrganization(); if (!['owner','admin'].includes(String(membership.role))) return Response.json({ error: "Apenas administradores podem conectar integrações" }, { status: 403 });
    const input = createSchema.parse(await request.json()); const admin = createAdminClient(); const runtime = createIntegrationRuntime(new SupabaseIntegrationStore(admin)); const adapter = runtime.providers.get(input.provider);
    if ((process.env.INTEGRATION_MODE ?? "mock") !== "mock") return Response.json({ error: "O adapter oficial ainda não está configurado. Nenhuma conexão externa foi criada." }, { status: 501 });
    const now = new Date().toISOString();
    const { data, error } = await admin.from("integrations").upsert({ organization_id: organizationId, provider: adapter.key, status: "connected", account_identifier: input.accountIdentifier ?? `mock:${adapter.key}`, scopes: [], capabilities: [...adapter.capabilities], priority: input.priority, configuration: { mode: "mock" }, metadata: { simulated: true }, health: { status: "healthy", lastCheckedAt: now, message: "Conexão simulada" }, connected_at: now, updated_at: now }, { onConflict: "organization_id,provider" }).select("id,provider,status,account_identifier,capabilities,priority,last_sync_at,health,connected_at,updated_at").single();
    if (error) throw error; return Response.json({ data, mock: true }, { status: 201 });
  } catch (error) { return apiError(error); }
}
