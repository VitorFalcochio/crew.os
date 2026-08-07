import type { DemoState, Employee, Priority } from "@/types/domain";

function normalize(value: string) {
  return value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const departmentRoutes = [
  { department: "Financeiro", words: ["finance", "pagamento", "conta", "cobranca", "caixa", "receber", "boleto", "nota fiscal"] },
  { department: "Compras", words: ["compra", "comprar", "compre", "fornecedor", "cotacao", "material", "pedido", "suprimento"] },
  { department: "Atendimento", words: ["atendimento", "suporte", "reclamacao", "mensagem", "chamado", "cliente insatisfeito"] },
  { department: "Comercial", words: ["comercial", "venda", "lead", "oportunidade", "proposta", "pipeline"] },
  { department: "Marketing", words: ["marketing", "conteudo", "campanha", "post", "rede social", "marca"] },
  { department: "Fiscal", words: ["fiscal", "tribut", "imposto", "obrigacao", "sped"] },
  { department: "Imobiliário", words: ["imovel", "imobili", "visita", "comprador"] },
] as const;

export interface DirectorAssignment {
  employee: Employee;
  department: string;
  title: string;
  description: string;
  priority: Priority;
  reason: string;
}

export interface DirectorPlan {
  objective: string;
  assignments: DirectorAssignment[];
  unavailableDepartments: string[];
  requiresApproval: boolean;
}

function inferPriority(prompt: string): Priority {
  const normalized = normalize(prompt);
  if (/urgente|imediat|agora|critico|hoje/.test(normalized)) return "urgente";
  if (/importante|alto risco|atras|prazo/.test(normalized)) return "alta";
  return "média";
}

export function buildDirectorPlan(prompt: string, employees: Employee[]): DirectorPlan {
  const objective = prompt.trim();
  const normalized = normalize(objective);
  const hired = employees.filter((employee) => employee.hired && employee.status !== "pausado");
  const matchedDepartments = departmentRoutes.filter((route) => route.words.some((word) => normalized.includes(word)));
  const routes = matchedDepartments.length ? matchedDepartments : [{ department: hired[0]?.department ?? "Operação", words: [] }];
  const unavailableDepartments: string[] = [];
  const assignments = routes.flatMap((route, index) => {
    const employee = hired.find((item) => item.department === route.department);
    if (!employee) { unavailableDepartments.push(route.department); return []; }
    return [{
      employee,
      department: route.department,
      title: objective.slice(0, 90),
      description: matchedDepartments.length > 1 ? `Frente ${index + 1} de ${matchedDepartments.length} coordenada pelo Diretor. Objetivo geral: ${objective}` : objective,
      priority: inferPriority(objective),
      reason: `Especialista ativo de ${route.department}, responsável por ${employee.skills.slice(0, 2).join(" e ").toLocaleLowerCase("pt-BR")}.`,
    }];
  });
  return { objective, assignments, unavailableDepartments, requiresApproval: /pagar|comprar|compre|enviar|publicar|contratar|cancelar/.test(normalized) };
}

export function buildDirectorSnapshot(state: Pick<DemoState, "employees" | "tasks" | "approvals" | "activities" | "financialHandoffs">) {
  const hired = state.employees.filter((employee) => employee.hired);
  const activeTasks = state.tasks.filter((task) => ["recebida", "planejando", "executando", "aguardando ferramenta", "aguardando aprovação"].includes(task.status));
  const pendingApprovals = state.approvals.filter((approval) => approval.status === "pendente");
  const failedTasks = state.tasks.filter((task) => task.status === "falhou");
  const handoffs = state.financialHandoffs.filter((handoff) => handoff.status !== "resolved");
  const working = hired.filter((employee) => employee.status === "trabalhando").length;
  const waiting = hired.filter((employee) => employee.status === "aguardando aprovação").length;
  const priorities = [
    ...failedTasks.map((task) => ({ type: "error" as const, title: task.title, description: "A execução falhou e precisa de replanejamento.", href: "/delegacoes" })),
    ...pendingApprovals.map((approval) => ({ type: "approval" as const, title: approval.title, description: approval.impact, href: "/aprovacoes" })),
    ...handoffs.map((handoff) => ({ type: "handoff" as const, title: handoff.title, description: `${handoff.toDepartment} recebeu contexto do Financeiro.`, href: "/atividades" })),
  ].slice(0, 8);
  return { hired, activeTasks, pendingApprovals, failedTasks, handoffs, working, waiting, priorities, recentActivities: state.activities.slice(0, 8) };
}
