import type { CrewEvent } from "../core/types";

export type EventHandler = (event: CrewEvent) => Promise<void> | void;

export class CrewEventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>();
  on(type: string, handler: EventHandler) { const bucket = this.handlers.get(type) ?? new Set<EventHandler>(); bucket.add(handler); this.handlers.set(type, bucket); return () => bucket.delete(handler); }
  async publish(event: CrewEvent) { const handlers = [...(this.handlers.get(event.type) ?? []), ...(this.handlers.get("*") ?? [])]; await Promise.all(handlers.map((handler) => handler(event))); }
}
