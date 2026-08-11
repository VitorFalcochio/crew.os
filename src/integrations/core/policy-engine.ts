import type { AutonomyPolicy, Capability, JsonObject } from "./types";

function amountFrom(input: JsonObject) { const amount = Number(input.amount ?? input.total ?? 0); return Number.isFinite(amount) ? amount : 0; }

export function decideAutonomy(input: { capability: Capability; payload: JsonObject; policies: AutonomyPolicy[]; critical: boolean }) {
  const sorted = [...input.policies].sort((a, b) => Number(Boolean(b.employeeId)) - Number(Boolean(a.employeeId)) || Number(b.capability !== "*") - Number(a.capability !== "*"));
  const policy = sorted[0];
  if (!policy) return { level: input.critical ? "approval_required" as const : "automatic" as const, requiresApproval: input.critical, reason: input.critical ? "Ação crítica sem política explícita" : "Ação de leitura com política segura padrão" };
  if (["observe_only", "suggest", "approval_required"].includes(policy.level)) return { level: policy.level, requiresApproval: true, reason: `Política ${policy.level}` };
  if (policy.level === "automatic_with_limits" && policy.limits?.amount !== undefined && amountFrom(input.payload) > policy.limits.amount) return { level: policy.level, requiresApproval: true, reason: `Valor acima do limite automático de ${policy.limits.amount}` };
  return { level: policy.level, requiresApproval: false, reason: "Permitido pela política de autonomia" };
}
