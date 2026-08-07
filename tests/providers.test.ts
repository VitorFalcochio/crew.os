import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { OpenAIResponsesProvider } from "../src/agents/providers/openai-responses-provider";
import { resolvedModelForTask } from "../src/agents/orchestration/continuous-worker";

test("provider usa Responses API sem armazenar conteúdo", async () => {
  let requestBody: Record<string, unknown> = {};
  const fetcher: typeof fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ id: "resp_123", output: [{ type: "message", content: [{ type: "output_text", text: "Plano concluído" }] }], usage: { input_tokens: 12, output_tokens: 4 } }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const provider = new OpenAIResponsesProvider("gpt-test", "test-key", fetcher);
  const result = await provider.generateText({ system: "Política", prompt: "Planeje", safetyIdentifier: "safe-company", reasoningEffort: "low" });
  assert.equal(result.text, "Plano concluído");
  assert.deepEqual(result.usage, { input: 12, output: 4 });
  assert.equal(requestBody.model, "gpt-test");
  assert.equal(requestBody.store, false);
  assert.equal(requestBody.safety_identifier, "safe-company");
});

test("provider valida saída estruturada com Zod", async () => {
  const fetcher: typeof fetch = async () => new Response(JSON.stringify({ output: [{ content: [{ type: "output_text", text: '{"summary":"ok","count":3}' }] }] }), { status: 200, headers: { "Content-Type": "application/json" } });
  const provider = new OpenAIResponsesProvider("gpt-test", "test-key", fetcher);
  const result = await provider.generateStructured({ system: "", prompt: "", schema: z.object({ summary: z.string(), count: z.number() }) });
  assert.deepEqual(result, { summary: "ok", count: 3 });
});

test("roteamento preserva custo baixo e reserva maior capacidade para casos complexos", () => {
  assert.equal(resolvedModelForTask({ priority: "baixa", descriptionLength: 80, employeeRole: "Atendimento" }).route, "fast");
  assert.equal(resolvedModelForTask({ priority: "media", descriptionLength: 600, employeeRole: "Financeiro" }).route, "standard");
  assert.equal(resolvedModelForTask({ priority: "urgente", descriptionLength: 100, employeeRole: "Financeiro" }).route, "complex");
});
