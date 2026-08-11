export const integrationErrorCodes = ["INTEGRATION_NOT_CONNECTED", "AUTH_EXPIRED", "CAPABILITY_NOT_SUPPORTED", "PERMISSION_DENIED", "APPROVAL_REQUIRED", "RATE_LIMITED", "PROVIDER_UNAVAILABLE", "INVALID_INPUT", "EXTERNAL_API_ERROR", "DUPLICATE_ACTION", "WEBHOOK_INVALID", "ORGANIZATION_MISMATCH"] as const;
export type IntegrationErrorCode = (typeof integrationErrorCodes)[number];

export class IntegrationError extends Error {
  constructor(public readonly code: IntegrationErrorCode, message: string, public readonly retryable = false, public readonly status = 400) {
    super(message);
    this.name = "IntegrationError";
  }
}

export function toIntegrationError(error: unknown) {
  if (error instanceof IntegrationError) return error;
  return new IntegrationError("EXTERNAL_API_ERROR", error instanceof Error ? error.message : "Falha desconhecida no provider", false, 502);
}
