import { apiError } from "@/lib/api/responses";
import { requireOrganization } from "@/lib/auth/session";

export async function GET() {
  try {
    const { user, organizationId, membership } = await requireOrganization();
    return Response.json({ user: { id: user.id, email: user.email, name: user.user_metadata.full_name }, organizationId, membership });
  } catch (error) { return apiError(error); }
}
