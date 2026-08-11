import { prepareAgentEmail } from "@/features/customer-operations/outbound-email-api";
export async function POST(request: Request) { return prepareAgentEmail(request, "sales_followup"); }
