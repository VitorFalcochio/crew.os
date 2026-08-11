import type { IntegrationStore } from "./core/store";
import { ProviderRegistry } from "./core/provider-registry";
import { ActionGateway } from "./core/action-gateway";
import { createV1MockAdapters } from "./providers/mock-adapter";

export function createIntegrationRuntime(store: IntegrationStore) {
  const providers = new ProviderRegistry();
  for (const adapter of createV1MockAdapters()) providers.register(adapter);
  return { providers, gateway: new ActionGateway(store, providers) };
}
