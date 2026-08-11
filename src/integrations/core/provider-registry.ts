import type { Capability, CrewIntegrationAdapter, IntegrationConnection } from "./types";
import { IntegrationError } from "./errors";

export class ProviderRegistry {
  private readonly adapters = new Map<string, CrewIntegrationAdapter>();
  register(adapter: CrewIntegrationAdapter) { if (this.adapters.has(adapter.key)) throw new Error(`Provider já registrado: ${adapter.key}`); this.adapters.set(adapter.key, adapter); return this; }
  get(key: string) { const adapter = this.adapters.get(key); if (!adapter) throw new IntegrationError("PROVIDER_UNAVAILABLE", `Provider não registrado: ${key}`, false, 503); return adapter; }
  list() { return [...this.adapters.values()]; }
  resolve(capability: Capability, connections: IntegrationConnection[]) {
    const eligible = connections.filter((connection) => connection.status === "connected" && connection.capabilities.includes(capability) && this.adapters.get(connection.provider)?.capabilities.has(capability)).sort((a, b) => b.priority - a.priority);
    const connection = eligible[0];
    if (!connection) throw new IntegrationError("INTEGRATION_NOT_CONNECTED", `Nenhuma conexão ativa atende ${capability}`, false, 409);
    return { connection, adapter: this.get(connection.provider) };
  }
}
