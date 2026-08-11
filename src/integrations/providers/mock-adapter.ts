import { randomUUID } from "node:crypto";
import type { Capability, CrewIntegrationAdapter, JsonObject, ProviderActionRequest } from "../core/types";
import { IntegrationError } from "../core/errors";

export class MockProviderAdapter implements CrewIntegrationAdapter {
  readonly capabilities: ReadonlySet<Capability>;
  readonly calls: ProviderActionRequest[] = [];
  constructor(readonly key: string, readonly name: string, capabilities: Capability[], private readonly handler?: (request: ProviderActionRequest) => Promise<JsonObject> | JsonObject) { this.capabilities = new Set(capabilities); }
  async testConnection() { return { ok: true, message: "Provider mock saudável" }; }
  async executeAction(request: ProviderActionRequest) {
    if ((process.env.INTEGRATION_MODE ?? "mock") !== "mock") throw new IntegrationError("PROVIDER_UNAVAILABLE", `${this.name} possui somente adapter mock; configure o adapter oficial`, false, 503);
    if (!this.capabilities.has(request.capability)) throw new IntegrationError("CAPABILITY_NOT_SUPPORTED", `${this.name} não suporta ${request.capability}`, false, 422);
    this.calls.push(request);
    const data = this.handler ? await this.handler(request) : { simulated: true, capability: request.capability, input: request.input };
    return { externalId: `mock-${randomUUID()}`, data };
  }
}

const gmailCapabilities: Capability[] = ["email.read", "email.search", "email.send", "email.reply", "email.downloadAttachment"];
const driveCapabilities: Capability[] = ["files.search", "files.read", "files.upload", "files.createFolder", "files.move"];
const calendarCapabilities: Capability[] = ["calendar.events.list", "calendar.event.create", "calendar.event.update", "calendar.event.delete"];
const financeCapabilities: Capability[] = ["finance.transactions.list", "finance.accountsPayable.list", "finance.accountsPayable.create", "finance.accountsReceivable.list", "finance.accountsReceivable.create", "finance.cashFlow.read", "finance.balance.read", "finance.invoices.list", "finance.customers.list", "finance.suppliers.list"];
const crmCapabilities: Capability[] = ["crm.leads.list", "crm.lead.create", "crm.lead.update", "crm.deals.list", "crm.deal.create", "crm.deal.update", "crm.deal.move", "crm.note.create", "crm.followUp.create"];

export function createV1MockAdapters() {
  return [
    new MockProviderAdapter("google-workspace", "Google Workspace", [...gmailCapabilities, ...calendarCapabilities]),
    new MockProviderAdapter("gmail", "Gmail", gmailCapabilities),
    new MockProviderAdapter("google-drive", "Google Drive", driveCapabilities),
    new MockProviderAdapter("google-calendar", "Google Calendar", calendarCapabilities),
    new MockProviderAdapter("whatsapp", "WhatsApp", ["messages.send"]),
    new MockProviderAdapter("conta-azul", "Conta Azul", financeCapabilities),
    new MockProviderAdapter("omie", "Omie", financeCapabilities),
    new MockProviderAdapter("asaas", "Asaas", financeCapabilities),
    new MockProviderAdapter("hubspot", "HubSpot", crmCapabilities),
  ];
}
