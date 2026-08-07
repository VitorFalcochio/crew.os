import test from "node:test";
import assert from "node:assert/strict";
import { isDemoModeAllowed } from "../src/lib/supabase/config";

test("modo demo permanece disponível no desenvolvimento", () => {
  assert.equal(isDemoModeAllowed({ environment: "development" }), true);
  assert.equal(isDemoModeAllowed({ environment: "test" }), true);
});

test("modo demo falha fechado em produção", () => {
  assert.equal(isDemoModeAllowed({ environment: "production" }), false);
  assert.equal(isDemoModeAllowed({ environment: "production", explicitFlag: "false" }), false);
});

test("preview de produção exige liberação explícita do demo", () => {
  assert.equal(isDemoModeAllowed({ environment: "production", explicitFlag: "true" }), true);
});
