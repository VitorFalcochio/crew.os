import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WaitlistLead, WaitlistSubmission } from "./waitlist";

interface WaitlistStoreFile { version: 1; leads: WaitlistLead[] }
interface WaitlistQuery { query?: string; limit?: number }

export class WaitlistStorageUnavailableError extends Error {}

const dataDirectory = () => path.join(process.cwd(), ".crewos-data");
const dataFile = () => path.join(dataDirectory(), "waitlist-leads.json");
let queue: Promise<void> = Promise.resolve();

function exclusive<T>(operation: () => Promise<T>) {
  const result = queue.then(operation, operation);
  queue = result.then(() => undefined, () => undefined);
  return result;
}
function hasSupabaseStore() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function allowLocalStore() {
  return process.env.NODE_ENV !== "production" || process.env.CREWOS_WAITLIST_STORAGE === "local";
}

export function getWaitlistStorageMode(): "supabase" | "local" | "unavailable" {
  if (hasSupabaseStore()) return "supabase";
  return allowLocalStore() ? "local" : "unavailable";
}

async function readLocalStore(): Promise<WaitlistStoreFile> {
  try {
    const parsed = JSON.parse(await readFile(dataFile(), "utf8")) as WaitlistStoreFile;
    return parsed.version === 1 && Array.isArray(parsed.leads) ? parsed : { version: 1, leads: [] };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("Falha ao ler a lista de espera local", error);
    return { version: 1, leads: [] };
  }
}

async function writeLocalStore(store: WaitlistStoreFile) {
  await mkdir(dataDirectory(), { recursive: true });
  const temporary = `${dataFile()}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(store, null, 2), { encoding: "utf8", mode: 0o600 });
  await rename(temporary, dataFile());
}

function fromSupabase(row: Record<string, unknown>): WaitlistLead {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    company: row.company ? String(row.company) : undefined,
    role: row.role ? String(row.role) : undefined,
    source: String(row.source),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function saveWaitlistLead(submission: WaitlistSubmission) {
  const mode = getWaitlistStorageMode();
  if (mode === "unavailable") throw new WaitlistStorageUnavailableError("Configure o Supabase para receber cadastros em produção");

  if (mode === "supabase") {
    const admin = createAdminClient();
    const now = new Date().toISOString();
    const row = { name: submission.name, email: submission.email, company: submission.company ?? null, role: submission.role ?? null, source: submission.source, updated_at: now };
    const { data: existing, error: lookupError } = await admin.from("waitlist_leads").select("*").eq("email", submission.email).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) {
      const { data, error } = await admin.from("waitlist_leads").update(row).eq("id", existing.id).select("*").single();
      if (error) throw error;
      return { lead: fromSupabase(data), created: false };
    }
    const { data, error } = await admin.from("waitlist_leads").insert(row).select("*").single();
    if (error) {
      if (error.code === "23505") {
        const { data: duplicate, error: duplicateError } = await admin.from("waitlist_leads").select("*").eq("email", submission.email).single();
        if (duplicateError) throw duplicateError;
        return { lead: fromSupabase(duplicate), created: false };
      }
      throw error;
    }
    return { lead: fromSupabase(data), created: true };
  }

  return exclusive(async () => {
    const store = await readLocalStore();
    const index = store.leads.findIndex((lead) => lead.email === submission.email);
    const now = new Date().toISOString();
    if (index >= 0) {
      const lead = { ...store.leads[index], name: submission.name, company: submission.company, role: submission.role, source: submission.source, updatedAt: now };
      store.leads[index] = lead;
      await writeLocalStore(store);
      return { lead, created: false };
    }
    const lead: WaitlistLead = { id: randomUUID(), name: submission.name, email: submission.email, company: submission.company, role: submission.role, source: submission.source, createdAt: now, updatedAt: now };
    store.leads.unshift(lead);
    await writeLocalStore(store);
    return { lead, created: true };
  });
}

export async function listWaitlistLeads(input: WaitlistQuery = {}) {
  const mode = getWaitlistStorageMode();
  if (mode === "unavailable") throw new WaitlistStorageUnavailableError("Configure o Supabase para consultar a lista em produção");
  const query = input.query?.trim().toLocaleLowerCase("pt-BR") ?? "";
  const limit = Math.min(Math.max(input.limit ?? 500, 1), 1000);

  if (mode === "supabase") {
    const admin = createAdminClient();
    const { data, error } = await admin.from("waitlist_leads").select("*").order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    const leads = data.map(fromSupabase);
    if (!query) return leads;
    return leads.filter((lead) => [lead.name, lead.email, lead.company, lead.role, lead.source].some((value) => value?.toLocaleLowerCase("pt-BR").includes(query)));
  }

  await queue;
  const leads = (await readLocalStore()).leads;
  if (!query) return leads.slice(0, limit);
  return leads.filter((lead) => [lead.name, lead.email, lead.company, lead.role, lead.source].some((value) => value?.toLocaleLowerCase("pt-BR").includes(query))).slice(0, limit);
}
