import { rejectAgentEmail } from "@/features/customer-operations/outbound-email-api";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { return rejectAgentEmail(request, context, "support_reply"); }
