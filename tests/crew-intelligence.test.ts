import test from "node:test";
import assert from "node:assert/strict";
import { initialDemoState } from "../src/features/demo/services/seed";
import { buildCrewBriefing, buildCrewImpactSummary } from "../src/features/crew/intelligence";
import { evaluateAutonomyAction, getAutonomyPolicyForEmployee } from "../src/features/crew/autonomy";

test("a política financeira muda conforme o valor da cobrança", () => {
  const employee = initialDemoState.employees.find((item) => item.id === "ana");
  assert.ok(employee);
  const policy = getAutonomyPolicyForEmployee(employee);
  assert.equal(policy.rules.find((rule) => rule.actionKey === "execute_payment")?.mode, "blocked");
  assert.equal(evaluateAutonomyAction({ employee, actionKey: "send_collection", amount: 300 }).mode, "autonomous");
  assert.equal(evaluateAutonomyAction({ employee, actionKey: "send_collection", amount: 900 }).mode, "approval_required");
});

test("o briefing destaca prioridades e speakers reais", () => {
  const briefing = buildCrewBriefing(initialDemoState);
  assert.equal(briefing.speakers.length >= 5, true);
  assert.equal(briefing.priorities.length >= 2, true);
  assert.match(briefing.greeting, /Crew/);
});

test("o impacto da crew é calculado a partir dos dados existentes", () => {
  const impact = buildCrewImpactSummary(initialDemoState);
  assert.equal(impact.pendingDecisions, 2);
  assert.ok(impact.moneyRecoveredOrProtected > 0);
  assert.ok(impact.timeSavedMinutes > 0);
});
