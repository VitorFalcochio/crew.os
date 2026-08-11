import { sendAgentEmail } from "@/features/customer-operations/outbound-email-api";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { return sendAgentEmail(request, context, "support_reply", true); }
