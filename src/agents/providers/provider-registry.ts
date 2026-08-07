import type { AIProvider } from "../core/contracts";

type TaskComplexity = "rápida" | "padrão" | "complexa";
export class ProviderRegistry {
  private providers = new Map<string, AIProvider>();
  register(provider: AIProvider) { this.providers.set(provider.key, provider); }
  select(input: { preferred?: string; complexity: TaskComplexity; prioritizeCost: boolean }): AIProvider {
    const preferred = input.preferred && this.providers.get(input.preferred);
    if (preferred) return preferred;
    const first = this.providers.values().next().value as AIProvider | undefined;
    if (!first) throw new Error("Nenhum provedor de inteligência configurado");
    return first;
  }
}
