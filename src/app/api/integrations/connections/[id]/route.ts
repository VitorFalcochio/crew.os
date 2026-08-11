import { z } from "zod";
import { apiError } from "@/lib/api/responses";
import { requireOrganization } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try { const { organizationId, membership } = await requireOrganization(); if (!['owner','admin'].includes(String(membership.role))) return Response.json({ error: "Apenas administradores podem desconectar integrações" }, { status: 403 }); const { id } = await context.params; z.uuid().parse(id); const admin = createAdminClient(); const { data, error } = await admin.from("integrations").update({ status: "disconnected", updated_at: new Date().toISOString(), health: { status: "unknown", message: "Desconectada pelo usuário" } }).eq("organization_id", organizationId).eq("id", id).select("id,provider,status").maybeSingle(); if (error) throw error; if (!data) return Response.json({ error: "Conexão não encontrada" }, { status: 404 }); return Response.json({ data }); } catch (error) { return apiError(error); }
}
