import { getAgentEmail, patchAgentEmail } from "@/features/customer-operations/outbound-email-api";
const kind = "support_reply" as const;
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) { return getAgentEmail(request, context, kind); }
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { return patchAgentEmail(request, context, kind); }
