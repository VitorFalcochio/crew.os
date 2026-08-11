import { apiError } from "@/lib/api/responses";
import { requireOrganization } from "@/lib/auth/session";

export async function GET() {
  try {
    const { supabase, user, organizationId, membership } = await requireOrganization();
    const [organization, employees, tasks, approvals, activities, integrations, subscription, profile, financialAccounts, financialBalances] = await Promise.all([
      supabase.from("organizations").select("id,name,slug,industry,size").eq("id", organizationId).single(),
      supabase.from("digital_employees").select("*").eq("organization_id", organizationId).order("created_at"),
      supabase.from("tasks").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(100),
      supabase.from("approvals").select("*").eq("organization_id", organizationId).order("requested_at", { ascending: false }).limit(100),
      supabase.from("activities").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(100),
      supabase.from("integrations").select("id,provider,status,configuration,connected_at,capabilities,last_sync_at,health").eq("organization_id", organizationId),
      supabase.from("subscriptions").select("*").eq("organization_id", organizationId).maybeSingle(),
      supabase.from("profiles").select("full_name,avatar_url").eq("id", user.id).maybeSingle(),
      supabase.from("financial_accounts").select("*").eq("organization_id", organizationId).order("due_date").limit(1000),
      supabase.from("financial_balances").select("*").eq("organization_id", organizationId).order("balance_at", { ascending: false }).limit(200),
    ]);
    const failed = [organization, employees, tasks, approvals, activities, integrations, subscription, profile, financialAccounts, financialBalances].find((result) => result.error);
    if (failed?.error) throw failed.error;
    return Response.json({ account: { userId: user.id, email: user.email, name: profile.data?.full_name ?? user.user_metadata.full_name ?? user.email, organization: organization.data, role: membership.role }, employees: employees.data, tasks: tasks.data, approvals: approvals.data, activities: activities.data, integrations: integrations.data, subscription: subscription.data, financialAccounts: financialAccounts.data, financialBalances: financialBalances.data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
