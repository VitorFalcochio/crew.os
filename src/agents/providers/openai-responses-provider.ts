import "server-only";
import { z } from "zod";
import type { AIProvider, GenerateTextInput, GenerateTextResult, StreamInput, StructuredInput } from "../core/contracts";

interface ResponsesPayload { id?: string; output_text?: string; output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>; usage?: { input_tokens?: number; output_tokens?: number }; error?: { message?: string; code?: string } }

function extractText(payload: ResponsesPayload) {
  if (payload.output_text) return payload.output_text;
  return payload.output?.flatMap((item) => item.content ?? []).filter((item) => item.type === "output_text").map((item) => item.text ?? "").join("") ?? "";
}

export class OpenAIResponsesProvider implements AIProvider {
  readonly key = "openai";
  constructor(private readonly model: string, private readonly apiKey = process.env.OPENAI_API_KEY, private readonly fetcher: typeof fetch = fetch) {}

  private async request(body: Record<string, unknown>) {
    if (!this.apiKey) throw new Error("OPENAI_API_KEY não configurada");
    const response = await this.fetcher("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: this.model, store: false, ...body }) });
    const payload = await response.json() as ResponsesPayload;
    if (!response.ok) throw new Error(payload.error?.message ?? `OpenAI respondeu com HTTP ${response.status}`);
    return payload;
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const payload = await this.request({ instructions: input.system, input: input.prompt, max_output_tokens: input.maxOutputTokens ?? 1600, reasoning: { effort: input.reasoningEffort ?? "low" }, text: { verbosity: "low" }, ...(input.safetyIdentifier ? { safety_identifier: input.safetyIdentifier } : {}) });
    return { text: extractText(payload), usage: payload.usage ? { input: payload.usage.input_tokens ?? 0, output: payload.usage.output_tokens ?? 0 } : undefined, providerRequestId: payload.id };
  }

  async generateStructured<T>(input: StructuredInput<T>): Promise<T> {
    const payload = await this.request({ instructions: input.system, input: input.prompt, max_output_tokens: input.maxOutputTokens ?? 2200, reasoning: { effort: input.reasoningEffort ?? "low" }, text: { format: { type: "json_schema", name: input.schemaName ?? "crewos_result", strict: true, schema: z.toJSONSchema(input.schema) }, verbosity: "low" }, ...(input.safetyIdentifier ? { safety_identifier: input.safetyIdentifier } : {}) });
    return input.schema.parse(JSON.parse(extractText(payload)));
  }

  async streamText(input: StreamInput): Promise<ReadableStream<Uint8Array>> {
    if (!this.apiKey) throw new Error("OPENAI_API_KEY não configurada");
    const response = await this.fetcher("https://api.openai.com/v1/responses", { method: "POST", signal: input.signal, headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: this.model, store: false, stream: true, instructions: input.system, input: input.prompt, max_output_tokens: input.maxOutputTokens ?? 1600, reasoning: { effort: input.reasoningEffort ?? "low" }, ...(input.safetyIdentifier ? { safety_identifier: input.safetyIdentifier } : {}) }) });
    if (!response.ok || !response.body) throw new Error(`Não foi possível iniciar streaming: HTTP ${response.status}`);
    return response.body;
  }
}
