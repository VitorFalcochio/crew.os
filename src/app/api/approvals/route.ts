import { apiError } from "@/lib/api/responses";
import { requireOrganization } from "@/lib/auth/session";

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();
    const { data, error } = await supabase.from("approvals").select("*, digital_employees(id,name,role_name), tasks(id,title,status)").eq("organization_id", organizationId).order("requested_at", { ascending: false }).limit(100);
    if (error) throw error;
    return Response.json({ data });
  } catch (error) { return apiError(error); }
}
