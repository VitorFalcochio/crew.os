import type { Employee } from "@/types/domain";

export type AutonomyMode = "observe" | "approval_required" | "autonomous" | "blocked";

export interface AutonomyRule {
  actionKey: string;
  label: string;
  mode: AutonomyMode;
  rationale: string;
  limits: string[];
  threshold?: number;
}

export interface EmployeeAutonomyPolicy {
  employeeId?: string;
  employeeName: string;
  role: string;
  department: string;
  summary: string;
  rules: AutonomyRule[];
}

export interface AutonomyDecision {
  mode: AutonomyMode;
  requiresApproval: boolean;
  rule: AutonomyRule;
  reason: string;
}

const financeRules: AutonomyRule[] = [
  {
    actionKey: "analyze_movements",
    label: "Analisar movimentações",
    mode: "autonomous",
    rationale: "Leitura e diagnóstico são atividades observacionais e de baixo risco.",
    limits: ["Sem limite monetário"],
  },
  {
    actionKey: "generate_report",
    label: "Gerar relatórios",
    mode: "autonomous",
    rationale: "Relatórios consolidados podem ser emitidos sem impacto externo.",
    limits: ["Sem limite monetário"],
  },
  {
    actionKey: "send_collection",
    label: "Enviar cobrança",
    mode: "autonomous",
    rationale: "Cobranças pequenas podem ser disparadas automaticamente dentro da política.",
    limits: ["Até R$ 500,00"],
    threshold: 500,
  },
  {
    actionKey: "update_financial_data",
    label: "Alterar dados financeiros",
    mode: "approval_required",
    rationale: "Alterações em dados financeiros precisam de revisão humana.",
    limits: ["Somente com aprovação"],
  },
  {
    actionKey: "execute_payment",
    label: "Realizar pagamentos",
    mode: "blocked",
    rationale: "Pagamentos permanecem bloqueados para execução direta.",
    limits: ["Bloqueado"],
  },
];

const procurementRules: AutonomyRule[] = [
  {
    actionKey: "compare_proposals",
    label: "Comparar propostas",
    mode: "autonomous",
    rationale: "Comparação e ranking de propostas é uma tarefa analítica.",
    limits: ["Sem limite monetário"],
  },
  {
    actionKey: "prepare_purchase",
    label: "Preparar compra",
    mode: "approval_required",
    rationale: "A recomendação de compra precisa de decisão humana.",
    limits: ["Somente sugestão"],
  },
  {
    actionKey: "place_order",
    label: "Emitir pedido",
    mode: "blocked",
    rationale: "Pedidos de compra ficam bloqueados até nova política empresarial.",
    limits: ["Bloqueado"],
  },
];

const supportRules: AutonomyRule[] = [
  {
    actionKey: "triage_messages",
    label: "Classificar mensagens",
    mode: "autonomous",
    rationale: "Triagem de mensagens é observacional e operacional.",
    limits: ["Sem limite monetário"],
  },
  {
    actionKey: "respond_simple",
    label: "Responder dúvidas simples",
    mode: "autonomous",
    rationale: "Respostas padronizadas e objetivas podem sair automaticamente.",
    limits: ["FAQ e mensagens recorrentes"],
  },
  {
    actionKey: "issue_refund",
    label: "Liberar reembolso",
    mode: "approval_required",
    rationale: "Reembolsos sempre exigem validação humana.",
    limits: ["Somente com aprovação"],
  },
];

const marketingRules: AutonomyRule[] = [
  {
    actionKey: "draft_campaign",
    label: "Montar campanha",
    mode: "autonomous",
    rationale: "Rascunhos e ideias podem ser preparados sem impacto externo.",
    limits: ["Sem limite monetário"],
  },
  {
    actionKey: "publish_campaign",
    label: "Publicar campanha",
    mode: "approval_required",
    rationale: "Publicações precisam de revisão da empresa.",
    limits: ["Somente com aprovação"],
  },
];

const commercialRules: AutonomyRule[] = [
  {
    actionKey: "qualify_leads",
    label: "Qualificar leads",
    mode: "autonomous",
    rationale: "Qualificação e priorização podem acontecer de forma automática.",
    limits: ["Sem limite monetário"],
  },
  {
    actionKey: "send_proposal",
    label: "Enviar proposta",
    mode: "approval_required",
    rationale: "Propostas comerciais seguem para aprovação humana.",
    limits: ["Somente com aprovação"],
  },
];

const fiscalRules: AutonomyRule[] = [
  {
    actionKey: "review_documents",
    label: "Revisar documentos",
    mode: "observe",
    rationale: "A função fiscal começa observando e sinalizando riscos.",
    limits: ["Leitura autorizada"],
  },
  {
    actionKey: "prepare_fiscal_action",
    label: "Preparar ação fiscal",
    mode: "approval_required",
    rationale: "Ações fiscais precisam de supervisão especializada.",
    limits: ["Somente com aprovação"],
  },
  {
    actionKey: "change_fiscal_record",
    label: "Alterar dados fiscais",
    mode: "blocked",
    rationale: "Alterações fiscais diretas permanecem bloqueadas.",
    limits: ["Bloqueado"],
  },
];

const realEstateRules: AutonomyRule[] = [
  {
    actionKey: "qualify_buyers",
    label: "Qualificar compradores",
    mode: "autonomous",
    rationale: "Triagem e qualificação de leads é uma tarefa analítica.",
    limits: ["Sem limite monetário"],
  },
  {
    actionKey: "schedule_visit",
    label: "Agendar visita",
    mode: "autonomous",
    rationale: "Agendamentos operacionais podem ser automatizados.",
    limits: ["Agenda autorizada"],
  },
  {
    actionKey: "send_offer",
    label: "Enviar proposta",
    mode: "approval_required",
    rationale: "Propostas seguem revisão humana antes do envio.",
    limits: ["Somente com aprovação"],
  },
];

const genericRules: AutonomyRule[] = [
  {
    actionKey: "observe_context",
    label: "Observar contexto",
    mode: "observe",
    rationale: "A primeira camada sempre lê e analisa antes de agir.",
    limits: ["Leitura autorizada"],
  },
  {
    actionKey: "prepare_action",
    label: "Preparar ação",
    mode: "approval_required",
    rationale: "Ações externas aguardam revisão humana.",
    limits: ["Somente com aprovação"],
  },
  {
    actionKey: "execute_action",
    label: "Executar ação",
    mode: "blocked",
    rationale: "A execução direta fica bloqueada até existir política específica.",
    limits: ["Bloqueado"],
  },
];

function normalize(value: string) {
  return value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function cloneRules(rules: AutonomyRule[]) {
  return rules.map((rule) => ({ ...rule, limits: [...rule.limits] }));
}

export function getAutonomyPolicyForEmployee(employee: Pick<Employee, "name" | "role" | "department"> & Partial<Pick<Employee, "id">>): EmployeeAutonomyPolicy {
  const normalizedRole = normalize(employee.role);
  const normalizedDepartment = normalize(employee.department);
  const normalizedName = normalize(employee.name);

  let rules = genericRules;
  let summary = "A política padrão pede revisão humana em ações externas.";

  if (normalizedDepartment.includes("finance") || normalizedRole.includes("finance") || normalizedName.includes("ana")) {
    rules = financeRules;
    summary = "Financeiro observa, analisa e envia cobranças pequenas automaticamente. Pagamentos seguem bloqueados.";
  } else if (normalizedDepartment.includes("compr")) {
    rules = procurementRules;
    summary = "Compras compara propostas sozinho, mas pedidos e contratações seguem revisão humana.";
  } else if (normalizedDepartment.includes("atend")) {
    rules = supportRules;
    summary = "Atendimento responde dúvidas simples sozinho e escala casos sensíveis para aprovação.";
  } else if (normalizedDepartment.includes("marketing")) {
    rules = marketingRules;
    summary = "Marketing rascunha campanhas de forma autônoma e publica apenas após revisão.";
  } else if (normalizedDepartment.includes("comercial")) {
    rules = commercialRules;
    summary = "Comercial qualifica leads sozinho e envia propostas somente após validação.";
  } else if (normalizedRole.includes("fiscal") || normalizedName.includes("marta")) {
    rules = fiscalRules;
    summary = "Fiscal trabalha em modo observador com ações sensíveis sempre bloqueadas ou aprovadas.";
  } else if (normalizedRole.includes("imob") || normalizedName.includes("rafael")) {
    rules = realEstateRules;
    summary = "Imobiliário qualifica e agenda sozinho, mas propostas pedem aprovação.";
  }

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    role: employee.role,
    department: employee.department,
    summary,
    rules: cloneRules(rules),
  };
}

export function evaluateAutonomyAction(input: {
  employee: Pick<Employee, "name" | "role" | "department"> & Partial<Pick<Employee, "id">>;
  actionKey: string;
  amount?: number;
  count?: number;
}) : AutonomyDecision {
  const policy = getAutonomyPolicyForEmployee(input.employee);
  const fallbackRule: AutonomyRule = {
    actionKey: input.actionKey,
    label: "Ação não catalogada",
    mode: "approval_required",
    rationale: "A política não conhece essa ação ainda, então ela pede revisão humana.",
    limits: ["Somente com aprovação"],
  };
  const rule = policy.rules.find((item) => item.actionKey === input.actionKey) ?? fallbackRule;

  if (rule.mode === "blocked") {
    return { mode: "blocked", requiresApproval: false, rule, reason: `${rule.label} está bloqueada pela política atual.` };
  }

  if (rule.threshold !== undefined && typeof input.amount === "number" && input.amount > rule.threshold) {
    return {
      mode: "approval_required",
      requiresApproval: true,
      rule,
      reason: `${rule.label} acima de R$ ${rule.threshold.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} exige aprovação.`,
    };
  }

  if (rule.mode === "approval_required") {
    return { mode: "approval_required", requiresApproval: true, rule, reason: `${rule.label} precisa da sua validação.` };
  }

  if (rule.mode === "observe") {
    return { mode: "observe", requiresApproval: false, rule, reason: `${rule.label} fica no modo observador.` };
  }

  return { mode: "autonomous", requiresApproval: false, rule, reason: `${rule.label} pode acontecer automaticamente dentro da política.` };
}
