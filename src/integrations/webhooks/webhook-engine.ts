import { randomUUID } from "node:crypto";
import { IntegrationError } from "../core/errors";
import type { CrewEvent, IntegrationConnection } from "../core/types";
import type { ProviderRegistry } from "../core/provider-registry";
import type { CrewEventBus } from "../events/event-bus";

export interface WebhookReceiptStore { reserve(input: { organizationId: string; provider: string; connectionId: string; externalId: string; payloadHash: string }): Promise<boolean>; record(event: CrewEvent): Promise<void> }

export class WebhookEngine {
  constructor(private readonly providers: ProviderRegistry, private readonly receipts: WebhookReceiptStore, private readonly bus: CrewEventBus) {}
  async receive(input: { connection: IntegrationConnection; rawBody: string; headers: Headers; externalId: string; payloadHash: string }) {
    const adapter = this.providers.get(input.connection.provider);
    if (!adapter.verifyWebhook || !adapter.normalizeWebhook) throw new IntegrationError("CAPABILITY_NOT_SUPPORTED", "Provider não implementa webhooks", false, 422);
    if (!await adapter.verifyWebhook({ rawBody: input.rawBody, headers: input.headers, connection: input.connection })) throw new IntegrationError("WEBHOOK_INVALID", "Assinatura de webhook inválida", false, 401);
    if (!await this.receipts.reserve({ organizationId: input.connection.organizationId, provider: adapter.key, connectionId: input.connection.id, externalId: input.externalId, payloadHash: input.payloadHash })) return { duplicate: true, events: [] };
    const normalized = await adapter.normalizeWebhook({ rawBody: input.rawBody, headers: input.headers, connection: input.connection });
    const events = normalized.map((event) => ({ ...event, id: event.id || randomUUID(), organizationId: input.connection.organizationId, provider: adapter.key, connectionId: input.connection.id, untrusted: true }));
    for (const event of events) { await this.receipts.record(event); await this.bus.publish(event); }
    return { duplicate: false, events };
  }
}
