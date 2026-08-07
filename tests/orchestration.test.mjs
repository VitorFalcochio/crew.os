import test from "node:test";
import assert from "node:assert/strict";

async function runSensitiveTool({ approved, events }) {
  if (!approved) {
    events.push("approval_created", "task_waiting_approval");
    return { status: "approval_required" };
  }
  events.push("task_executing", "tool_executed", "activity_recorded", "task_completed");
  return { status: "completed", sent: 3 };
}

test("uma ação financeira sensível para antes da autorização", async () => {
  const events = [];
  const result = await runSensitiveTool({ approved: false, events });
  assert.equal(result.status, "approval_required");
  assert.deepEqual(events, ["approval_created", "task_waiting_approval"]);
  assert.ok(!events.includes("tool_executed"));
});

test("a ação continua e registra a conclusão depois da aprovação", async () => {
  const events = [];
  const result = await runSensitiveTool({ approved: true, events });
  assert.deepEqual(result, { status: "completed", sent: 3 });
  assert.deepEqual(events, ["task_executing", "tool_executed", "activity_recorded", "task_completed"]);
});
