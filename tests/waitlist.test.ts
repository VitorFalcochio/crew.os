import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { consumeWaitlistAttempt } from "../src/features/waitlist/rate-limit";
import { parseWaitlistSubmission } from "../src/features/waitlist/waitlist";

test("normaliza e valida uma inscrição", () => {
  const submission = parseWaitlistSubmission({ name: "  Vitor Falcochio  ", email: "  VITOR@EXAMPLE.COM ", company: " CrewOS ", role: " Gestão ", source: "instagram" });
  assert.deepEqual(submission, { name: "Vitor Falcochio", email: "vitor@example.com", company: "CrewOS", role: "Gestão", source: "instagram" });
  assert.throws(() => parseWaitlistSubmission({ name: "V", email: "inválido", source: "instagram" }));
  assert.throws(() => parseWaitlistSubmission({ name: "Vitor", email: "vitor@example.com", source: "instagram", createdAt: new Date().toISOString() }));
});

test("limita tentativas repetidas pelo mesmo identificador", () => {
  const key = `test-${crypto.randomUUID()}`;
  for (let attempt = 0; attempt < 6; attempt += 1) assert.equal(consumeWaitlistAttempt(key, 1_000 + attempt).allowed, true);
  assert.equal(consumeWaitlistAttempt(key, 1_010).allowed, false);
  assert.equal(consumeWaitlistAttempt(key, 1_000 + 10 * 60 * 1000).allowed, true);
});

test("persiste localmente e atualiza e-mails duplicados sem criar uma segunda entrada", async () => {
  const originalDirectory = process.cwd();
  const directory = await mkdtemp(path.join(os.tmpdir(), "crewos-waitlist-"));
  try {
    process.chdir(directory);
    const { listWaitlistLeads, saveWaitlistLead } = await import("../src/features/waitlist/waitlist-store");
    const first = await saveWaitlistLead(parseWaitlistSubmission({ name: "Primeiro Nome", email: "lead@example.com", company: "Empresa A", source: "instagram" }));
    const duplicate = await saveWaitlistLead(parseWaitlistSubmission({ name: "Nome Atualizado", email: "LEAD@example.com", company: "Empresa B", source: "lista-de-espera" }));
    const leads = await listWaitlistLeads();
    assert.equal(first.created, true);
    assert.equal(duplicate.created, false);
    assert.equal(leads.length, 1);
    assert.equal(leads[0].name, "Nome Atualizado");
    assert.equal(leads[0].company, "Empresa B");
    const persisted = JSON.parse(await readFile(path.join(directory, ".crewos-data", "waitlist-leads.json"), "utf8"));
    assert.equal(persisted.leads.length, 1);
  } finally {
    process.chdir(originalDirectory);
    await rm(directory, { recursive: true, force: true });
  }
});

test("a API pública registra o cadastro e não devolve dados pessoais", async () => {
  const originalDirectory = process.cwd();
  const directory = await mkdtemp(path.join(os.tmpdir(), "crewos-waitlist-api-"));
  try {
    process.chdir(directory);
    const { POST } = await import("../src/app/api/waitlist/route");
    const response = await POST(new Request("http://localhost:3000/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:3000", "x-real-ip": `test-${crypto.randomUUID()}` },
      body: JSON.stringify({ name: "Lead da API", email: "api@example.com", company: "CrewOS", role: "Gestão", source: "instagram" }),
    }));
    const body = await response.json();
    assert.equal(response.status, 201);
    assert.equal(body.ok, true);
    assert.equal(body.email, undefined);
    const persisted = JSON.parse(await readFile(path.join(directory, ".crewos-data", "waitlist-leads.json"), "utf8"));
    assert.equal(persisted.leads[0].email, "api@example.com");
  } finally {
    process.chdir(originalDirectory);
    await rm(directory, { recursive: true, force: true });
  }
});
