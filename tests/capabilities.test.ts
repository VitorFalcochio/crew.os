import test from "node:test";
import assert from "node:assert/strict";
import { getEmployeeCapabilities } from "../src/features/crew/capabilities";
import type { Employee } from "../src/types/domain";

function employee(id: string, name: string, department: string): Pick<Employee, "id" | "name" | "role" | "department"> {
  return { id, name, department, role: `Especialista de ${department}` };
}

test("Ana separa capacidades em validação das capacidades planejadas", () => {
  const catalog = getEmployeeCapabilities(employee("ana", "Ana", "Financeiro"));

  assert.ok(catalog.capabilities.some((item) => item.key === "receivables" && item.stage === "validation" && item.href === "/financeiro"));
  assert.ok(catalog.capabilities.some((item) => item.key === "cash-flow" && item.stage === "planned"));
});

test("cada especialidade conhecida possui um catálogo útil e sem chaves duplicadas", () => {
  for (const [id, name, department] of [["carlos", "Carlos", "Compras"], ["sofia", "Sofia", "Atendimento"], ["julia", "Júlia", "Marketing"], ["lucas", "Lucas", "Comercial"], ["fiscal", "Marta", "Fiscal"], ["imob", "Rafael", "Comercial"]]) {
    const capabilities = getEmployeeCapabilities(employee(id, name, department)).capabilities;
    assert.ok(capabilities.length >= 4, `${name} deveria ter ao menos quatro capacidades`);
    assert.equal(new Set(capabilities.map((item) => item.key)).size, capabilities.length);
  }
});

