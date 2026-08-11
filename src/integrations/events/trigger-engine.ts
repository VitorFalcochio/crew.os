import type { CrewEvent, JsonObject, TriggerRule } from "../core/types";

function getPath(source: JsonObject, path: string) { return path.split(".").reduce<unknown>((value, part) => value && typeof value === "object" ? (value as JsonObject)[part] : undefined, source); }
function matches(rule: TriggerRule, event: CrewEvent) { return rule.eventType === event.type && rule.conditions.every((condition) => { const actual = getPath(event.data, condition.path); if (condition.operator === "exists") return actual !== undefined && actual !== null; if (condition.operator === "includes") return Array.isArray(actual) ? actual.includes(condition.value) : String(actual ?? "").includes(String(condition.value ?? "")); return actual === condition.value; }); }

export interface TaskSink { createFromTrigger(input: { organizationId: string; employeeId: string; eventId: string; title: string; description: string; priority: TriggerRule["task"]["priority"]; requiresApproval: boolean; input: JsonObject; idempotencyKey: string }): Promise<{ id: string }> }

export class TriggerEngine {
  constructor(private readonly rules: (organizationId: string, eventType: string) => Promise<TriggerRule[]>, private readonly tasks: TaskSink) {}
  async handle(event: CrewEvent) {
    const created: Array<{ id: string }> = [];
    for (const rule of (await this.rules(event.organizationId, event.type)).filter((item) => item.active && matches(item, event))) {
      created.push(await this.tasks.createFromTrigger({ organizationId: event.organizationId, employeeId: rule.employeeId, eventId: event.id, title: rule.task.title, description: rule.task.description, priority: rule.task.priority, requiresApproval: rule.task.requiresApproval, input: { crewEvent: event.data, untrustedExternalContent: event.untrusted }, idempotencyKey: `trigger:${rule.id}:${event.id}` }));
    }
    return created;
  }
}
