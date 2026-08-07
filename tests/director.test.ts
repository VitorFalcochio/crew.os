import test from "node:test";
import assert from "node:assert/strict";
import { buildDirectorPlan, buildDirectorSnapshot } from "../src/features/crew/director";
import type { DemoState, Employee } from "../src/types/domain";

const employee = (id: string, name: string, department: string): Employee => ({
  id,
  name,
  initials: name.slice(0, 2).toUpperCase(),
  role: `Especialista de ${department}`,
  department,
  level: "Especialista",
  description: `Responsável por ${department}`,
  color: "#efff3d",
  status: "disponível",
  hired: true,
  currentTask: "Disponível para novas tarefas",
  tasksCompleted: 0,
  performance: 100,
  successRate: 100,
  averageTime: "—",
  savings: 0,
  monthlyPrice: 0,
  skills: ["Análise", "Execução", "Monitoramento"],
  responsibilities: ["Executar tarefas do departamento"],
  tools: [],
});

test("Diretor divide um objetivo entre os especialistas corretos", () => {
  const employees = [employee("ana", "Ana", "Financeiro"), employee("carlos", "Carlos", "Compras")];
  const plan = buildDirectorPlan("Revise o caixa e compre materiais urgentes", employees);

  assert.deepEqual(plan.assignments.map((item) => item.employee.id), ["ana", "carlos"]);
  assert.equal(plan.assignments.every((item) => item.priority === "urgente"), true);
  assert.equal(plan.requiresApproval, true);
  assert.deepEqual(plan.unavailableDepartments, []);
});

test("Diretor sinaliza departamentos sem especialista ativo", () => {
  const plan = buildDirectorPlan("Revise o financeiro e a campanha de marketing", [employee("ana", "Ana", "Financeiro")]);
  assert.equal(plan.assignments.length, 1);
  assert.deepEqual(plan.unavailableDepartments, ["Marketing"]);
});

test("snapshot do Diretor prioriza falhas, aprovações e handoffs", () => {
  const state = {
    employees: [employee("ana", "Ana", "Financeiro")],
    tasks: [{ id: "t1", employeeId: "ana", title: "Conciliação", description: "", priority: "alta", status: "falhou", createdAt: "2026-08-07", updatedAt: "2026-08-07" }],
    approvals: [{ id: "a1", employeeId: "ana", title: "Pagar fornecedor", summary: "", impact: "Saída de caixa", status: "pendente", requestedAt: "2026-08-07", context: [], kind: "payment" }],
    activities: [],
    financialHandoffs: [{ id: "h1", title: "Renegociar contrato", reason: "Preço alto", fromDepartment: "Financeiro", toDepartment: "Compras", status: "open", createdAt: "2026-08-07" }],
  } as unknown as Pick<DemoState, "employees" | "tasks" | "approvals" | "activities" | "financialHandoffs">;

  const snapshot = buildDirectorSnapshot(state);
  assert.deepEqual(snapshot.priorities.map((item) => item.type), ["error", "approval", "handoff"]);
  assert.equal(snapshot.failedTasks.length, 1);
  assert.equal(snapshot.pendingApprovals.length, 1);
});
