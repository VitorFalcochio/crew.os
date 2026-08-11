import { prepareAgentEmail } from "@/features/customer-operations/outbound-email-api";
export async function POST(request: Request) { return prepareAgentEmail(request, "support_reply"); }
