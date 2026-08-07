import "server-only";
import { OpenAIResponsesProvider } from "./openai-responses-provider";

export type ModelRoute = "fast" | "standard" | "complex";
const models: Record<ModelRoute, string> = {
  fast: process.env.OPENAI_MODEL_FAST ?? "gpt-5.6-luna",
  standard: process.env.OPENAI_MODEL_STANDARD ?? "gpt-5.6-terra",
  complex: process.env.OPENAI_MODEL_COMPLEX ?? "gpt-5.6-sol",
};
export function selectModelRoute(input: { priority: string; descriptionLength: number; employeeRole: string; preferredReasoning?: "low" | "medium" | "high" }): ModelRoute {
  if (input.preferredReasoning === "high" || input.priority === "urgente" || input.descriptionLength > 3000 || /jurídico|fiscal|estratég/i.test(input.employeeRole)) return "complex";
  if (input.descriptionLength < 300 && input.priority === "baixa") return "fast";
  return "standard";
}
export function createOpenAIProvider(route: ModelRoute) { return new OpenAIResponsesProvider(models[route]); }
export function modelForRoute(route: ModelRoute) { return models[route]; }
