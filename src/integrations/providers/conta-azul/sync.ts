import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getValidContaAzulAccessToken } from "./credential-store";
import { ContaAzulClient, ContaAzulHttpError } from "./client";
import { normalizeContaAzulBalance, normalizeContaAzulContact, normalizeContaAzulFinancialEvent } from "./normalizers";

const resources = ["customers", "suppliers", "receivables", "payables", "balances"] as const;
type SyncCounts = Record<(typeof resources)[number], number>;

async function upsertChunks(table: string, rows: Record<string, unknown>[], onConflict: string) {
  const admin = createAdminClient();
  for (let index = 0; index < rows.length; index += 500) {
    const { error } = await admin.from(table).upsert(rows.slice(index, index + 500), { onConflict });
    if (error) throw error;
  }
}

async function setSyncStates(input: { organizationId: string; connectionId: string; status: "running" | "idle" | "error"; at?: string; error?: string }) {
  const admin = createAdminClient();
  const rows = resources.map((resource) => ({
    organization_id: input.organizationId,
    connection_id: input.connectionId,
    resource,
    status: input.status,
    last_success_at: input.status === "idle" ? input.at : undefined,
    last_error: input.error ? { message: input.error } : null,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await admin.from("integration_sync_states").upsert(rows, { onConflict: "organization_id,connection_id,resource" });
  if (error) throw error;
}

async function mapConcurrent<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>) {
  const result: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      result[index] = await mapper(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return result;
}

export async function synchronizeContaAzul(input: { organizationId: string; initiatedBy?: string }) {
  const admin = createAdminClient();
  const { accessToken, connectionId } = await getValidContaAzulAccessToken(input.organizationId);
  const startedAt = new Date().toISOString();
  const { data: run, error: runError } = await admin.from("integration_sync_runs").insert({
    organization_id: input.organizationId,
    connection_id: connectionId,
    provider: "conta-azul",
    status: "running",
    initiated_by: input.initiatedBy ?? null,
    started_at: startedAt,
  }).select("id").single();
  if (runError?.code === "23505") throw new Error("Uma sincronização do Conta Azul já está em andamento");
  if (runError) throw runError;

  await setSyncStates({ organizationId: input.organizationId, connectionId, status: "running" });
  const client = new ContaAzulClient(accessToken);
  try {
    const [customersRaw, suppliersRaw, receivablesRaw, payablesRaw, accountsRaw] = await Promise.all([
      client.listPeople("Cliente"),
      client.listPeople("Fornecedor"),
      client.listFinancialEvents("receivable"),
      client.listFinancialEvents("payable"),
      client.listFinancialAccounts(),
    ]);
    const contactMap = new Map<string, Record<string, unknown>>();
    for (const [items, profile] of [[customersRaw, "customer"], [suppliersRaw, "supplier"]] as const) {
      for (const item of items) {
        const normalized = normalizeContaAzulContact(item, profile);
        if (!normalized) continue;
        const previous = contactMap.get(normalized.external_id);
        contactMap.set(normalized.external_id, previous ? { ...previous, ...normalized, profile: "both", email: normalized.email ?? previous.email } : normalized);
      }
    }
    const contacts = [...contactMap.values()].map((row) => ({ ...row, organization_id: input.organizationId, provider: "conta-azul", synced_at: startedAt }));
    const obligations = [
      ...receivablesRaw.map((item) => normalizeContaAzulFinancialEvent(item, "receivable")),
      ...payablesRaw.map((item) => normalizeContaAzulFinancialEvent(item, "payable")),
    ].filter((row): row is NonNullable<typeof row> => Boolean(row)).map((row) => {
      const contactId = typeof row.metadata.contactExternalId === "string" ? row.metadata.contactExternalId : "";
      const contact = contactId ? contactMap.get(contactId) : undefined;
      return {
        ...row,
        customer_name: contact && typeof contact.name === "string" ? contact.name : row.customer_name,
        organization_id: input.organizationId,
        updated_at: startedAt,
        metadata: { ...row.metadata, customerEmail: row.metadata.customerEmail ?? contact?.email ?? undefined },
      };
    });
    const balances = (await mapConcurrent(accountsRaw.slice(0, 100), 3, async (account) => {
      const accountId = String(account.id ?? account.uuid ?? account.id_conta_financeira ?? "");
      if (!accountId) return null;
      return normalizeContaAzulBalance(account, await client.getCurrentBalance(accountId), startedAt);
    })).filter((row): row is NonNullable<typeof row> => Boolean(row)).map((row) => ({ ...row, organization_id: input.organizationId, provider: "conta-azul" }));

    await upsertChunks("financial_contacts", contacts, "organization_id,provider,external_id");
    await upsertChunks("financial_accounts", obligations, "organization_id,source,external_id");
    await upsertChunks("financial_balances", balances, "organization_id,provider,external_account_id");

    const counts: SyncCounts = { customers: customersRaw.length, suppliers: suppliersRaw.length, receivables: receivablesRaw.length, payables: payablesRaw.length, balances: balances.length };
    const completedAt = new Date().toISOString();
    await setSyncStates({ organizationId: input.organizationId, connectionId, status: "idle", at: completedAt });
    const { error: completeError } = await admin.from("integration_sync_runs").update({ status: "succeeded", counts, completed_at: completedAt }).eq("id", run.id);
    if (completeError) throw completeError;
    await admin.from("integrations").update({ last_sync_at: completedAt, updated_at: completedAt, health: { status: "healthy", lastCheckedAt: completedAt, message: "Dados financeiros sincronizados", counts } }).eq("organization_id", input.organizationId).eq("id", connectionId);
    await admin.from("activities").insert({ organization_id: input.organizationId, activity_type: "tool.sync", title: "Conta Azul sincronizado", description: `${counts.receivables} conta(s) a receber, ${counts.payables} conta(s) a pagar e ${counts.balances} saldo(s) atualizados.`, metadata: { provider: "conta-azul", runId: run.id, counts } });
    await admin.from("audit_logs").insert({ organization_id: input.organizationId, actor_id: input.initiatedBy ?? null, action: "integration.sync", entity_type: "integration_sync_run", entity_id: run.id, after_data: { provider: "conta-azul", counts } });
    return { runId: run.id, counts, completedAt };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida na sincronização";
    const completedAt = new Date().toISOString();
    await Promise.all([
      setSyncStates({ organizationId: input.organizationId, connectionId, status: "error", error: message }),
      admin.from("integration_sync_runs").update({ status: "failed", error_message: message.slice(0, 1000), completed_at: completedAt }).eq("id", run.id),
      admin.from("integrations").update({ status: error instanceof ContaAzulHttpError && error.status === 401 ? "requires_reauth" : "connected", updated_at: completedAt, health: { status: "degraded", lastCheckedAt: completedAt, message } }).eq("organization_id", input.organizationId).eq("id", connectionId),
    ]);
    throw error;
  }
}
