import type { JsonObject } from "../core/types";

const secretPattern = /(access.?token|refresh.?token|api.?key|authorization|password|secret|credential|cookie)/i;

export function sanitize<T>(value: T, depth = 0): T {
  if (depth > 8) return "[MAX_DEPTH]" as T;
  if (Array.isArray(value)) return value.map((item) => sanitize(item, depth + 1)) as T;
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as JsonObject).map(([key, item]) => [key, secretPattern.test(key) ? "[REDACTED]" : sanitize(item, depth + 1)])) as T;
}

export function assertNoSecurityOverrides(input: JsonObject) {
  const forbidden = /^(organizationId|employeeId|permissions?|autonomy|policy|credentials?|systemPrompt|security)$/i;
  const key = Object.keys(input).find((item) => forbidden.test(item));
  if (key) throw new Error(`Campo de segurança não aceito no payload: ${key}`);
}
