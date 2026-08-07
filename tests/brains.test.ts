import test from "node:test";
import assert from "node:assert/strict";
import { buildBrainPrompt } from "../src/agents/brains/brain";
import { employeeBrains, resolveEmployeeBrain } from "../src/agents/brains/registry";

test("cada funcionário possui um cérebro único e completo", () => {
  assert.equal(employeeBrains.length, 8);
  assert.equal(new Set(employeeBrains.map((brain) => brain.key)).size, employeeBrains.length);
  for (const brain of employeeBrains) { assert.ok(brain.expertise.length >= 3); assert.ok(brain.workflow.length >= 3); assert.ok(brain.qualityGates.length >= 3); assert.ok(Object.keys(brain.tools).length >= 2); }
});
test("resolve configuração explícita antes do nome do cargo", () => {
  assert.equal(resolveEmployeeBrain({ brainKey: "marta-fiscal", role: "Financeiro" })?.key, "marta-fiscal");
  assert.equal(resolveEmployeeBrain({ role: "Comprador Digital" })?.key, "carlos-compras");
  assert.equal(resolveEmployeeBrain({ role: "Vendedor Imobiliário" })?.key, "rafael-imobiliario");
  assert.equal(resolveEmployeeBrain({ role: "Diretor da Crew" })?.key, "diretor-crew");
});
test("prompt do cérebro inclui especialidade, qualidade, autonomia e memória", () => {
  const brain = resolveEmployeeBrain({ role: "Financeiro Digital" }); assert.ok(brain);
  const prompt = buildBrainPrompt(brain, { employeeName: "Ana", organizationFacts: ["Moeda: BRL"] });
  assert.match(prompt, /DOMÍNIOS DE ESPECIALIDADE/); assert.match(prompt, /CRITÉRIOS DE QUALIDADE/); assert.match(prompt, /approval_required/); assert.match(prompt, /Moeda: BRL/); assert.match(prompt, /não se apresenta como humano/i);
});
