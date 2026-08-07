import { z } from "zod";
import { apiError } from "@/lib/api/responses";
import { requireOrganization } from "@/lib/auth/session";

const accountSchema = z.object({ externalId: z.string().trim().min(1).max(120), customerName: z.string().trim().min(2).max(180), document: z.string().trim().max(80).optional(), amount: z.number().nonnegative().max(999_999_999), dueDate: z.iso.date(), direction: z.enum(["receivable", "payable"]), status: z.enum(["open", "paid", "overdue", "cancelled"]), source: z.string().trim().min(2).max(80).default("api"), metadata: z.record(z.string(), z.unknown()).default({}) });
export async function GET() { try { const { supabase, organizationId } = await requireOrganization(); const { data, error } = await supabase.from("financial_accounts").select("*").eq("organization_id", organizationId).order("due_date").limit(500); if (error) throw error; return Response.json({ data }); } catch (error) { return apiError(error); } }
export async function POST(request: Request) {
  try {
    const { supabase, organizationId, membership } = await requireOrganization();
    if (!(["owner", "admin", "manager"] as string[]).includes(String(membership.role))) return Response.json({ error: "Sem permissão para importar contas" }, { status: 403 });
    const parsed = z.object({ accounts: z.array(accountSchema).min(1).max(1000) }).parse(await request.json());
    const rows = parsed.accounts.map((account) => ({ organization_id: organizationId, external_id: account.externalId, customer_name: account.customerName, document: account.document ?? null, amount: account.amount, due_date: account.dueDate, direction: account.direction, status: account.status, source: account.source, metadata: account.metadata }));
    const { data, error } = await supabase.from("financial_accounts").upsert(rows, { onConflict: "organization_id,source,external_id" }).select("id");
    if (error) throw error;
    return Response.json({ imported: data.length }, { status: 201 });
  } catch (error) { return apiError(error); }
}
