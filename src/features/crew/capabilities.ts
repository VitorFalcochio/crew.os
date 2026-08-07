import type { Employee } from "@/types/domain";

export type CapabilityStage = "available" | "validation" | "planned";

export interface EmployeeCapability {
  key: string;
  title: string;
  description: string;
  stage: CapabilityStage;
  actions: string[];
  href?: string;
}

export interface EmployeeCapabilityCatalog {
  summary: string;
  capabilities: EmployeeCapability[];
}

const catalogs: Record<string, EmployeeCapabilityCatalog> = {
  ana: {
    summary: "A Ana transforma dados financeiros em prioridades, recomendações e ações sempre rastreáveis pelo gestor.",
    capabilities: [
      { key: "receivables", title: "Analisar contas a receber", description: "Importa lançamentos, identifica títulos vencidos e calcula o valor financeiro exposto.", stage: "validation", actions: ["Ler lançamentos manuais", "Separar pagos, abertos e vencidos", "Somar o total em atraso"], href: "/financeiro" },
      { key: "collection", title: "Preparar cobranças", description: "Organiza os clientes em atraso e prepara uma ação para aprovação humana antes de qualquer envio.", stage: "validation", actions: ["Priorizar vencimentos", "Criar solicitação de aprovação", "Registrar a decisão no histórico"], href: "/financeiro" },
      { key: "cash-flow", title: "Projetar fluxo de caixa", description: "Consolida entradas e saídas previstas para antecipar falta ou sobra de caixa.", stage: "planned", actions: ["Projeção diária e mensal", "Cenários otimista e conservador", "Alerta de saldo crítico"] },
      { key: "payables", title: "Controlar contas a pagar", description: "Organiza compromissos, vencimentos e aprovações sem executar pagamentos por conta própria.", stage: "planned", actions: ["Calendário de vencimentos", "Priorização por risco", "Solicitação de aprovação"] },
      { key: "reconciliation", title: "Fazer conciliação bancária", description: "Compara o extrato com o ERP e destaca valores ausentes, duplicados ou divergentes.", stage: "planned", actions: ["Cruzar movimentações", "Detectar divergências", "Preparar ajustes"] },
      { key: "financial-brief", title: "Gerar briefing financeiro", description: "Resume caixa, atrasos, compromissos e exceções para uma decisão rápida do gestor.", stage: "planned", actions: ["Resumo semanal", "Indicadores financeiros", "Recomendações priorizadas"] },
    ],
  },
  carlos: {
    summary: "Carlos atua em compras estratégicas, comparando custo total, prazo, qualidade e risco de fornecimento.",
    capabilities: [
      { key: "quote", title: "Comparar cotações", description: "Normaliza propostas e compara preço, prazo, frete e condição de pagamento.", stage: "planned", actions: ["Ler propostas", "Normalizar itens", "Criar mapa comparativo"] },
      { key: "supplier", title: "Avaliar fornecedores", description: "Mantém histórico de desempenho e sinaliza riscos antes da compra.", stage: "planned", actions: ["Avaliar atrasos", "Comparar qualidade", "Sinalizar concentração"] },
      { key: "recommend", title: "Recomendar uma compra", description: "Prepara a melhor combinação de fornecedores com justificativa verificável.", stage: "planned", actions: ["Calcular custo total", "Explicar trade-offs", "Solicitar aprovação"] },
      { key: "order", title: "Acompanhar pedidos", description: "Monitora confirmação, prazo e entrega dos pedidos aprovados.", stage: "planned", actions: ["Cobrar confirmação", "Alertar atrasos", "Registrar recebimento"] },
    ],
  },
  sofia: {
    summary: "Sofia organiza o atendimento, responde casos seguros e encaminha exceções com todo o contexto.",
    capabilities: [
      { key: "triage", title: "Fazer triagem", description: "Classifica mensagens por assunto, urgência e sentimento.", stage: "planned", actions: ["Identificar intenção", "Definir prioridade", "Encaminhar responsável"] },
      { key: "answer", title: "Responder dúvidas frequentes", description: "Produz respostas consistentes com as políticas e o tom da empresa.", stage: "planned", actions: ["Consultar base de conhecimento", "Preparar resposta", "Pedir revisão quando necessário"] },
      { key: "sla", title: "Acompanhar SLA", description: "Monitora conversas sem resposta e evita que solicitações sejam esquecidas.", stage: "planned", actions: ["Controlar prazo", "Alertar atrasos", "Escalar casos críticos"] },
      { key: "insights", title: "Encontrar causas recorrentes", description: "Agrupa reclamações e dúvidas para revelar oportunidades de melhoria.", stage: "planned", actions: ["Agrupar temas", "Medir recorrência", "Criar resumo de causas"] },
    ],
  },
  julia: {
    summary: "Júlia transforma objetivos de marketing em um calendário de conteúdo coerente, revisável e mensurável.",
    capabilities: [
      { key: "planning", title: "Planejar conteúdo", description: "Converte objetivos e público em pautas organizadas por canal.", stage: "planned", actions: ["Sugerir pautas", "Montar calendário", "Definir objetivo por peça"] },
      { key: "draft", title: "Produzir rascunhos", description: "Cria textos com o tom e as referências aprovadas pela marca.", stage: "planned", actions: ["Escrever versões", "Adaptar por canal", "Preparar para revisão"] },
      { key: "campaign", title: "Preparar campanhas", description: "Organiza peças, público, cronograma e checklist de lançamento.", stage: "planned", actions: ["Estruturar campanha", "Coordenar entregas", "Solicitar aprovação"] },
      { key: "performance", title: "Analisar desempenho", description: "Resume resultados e sugere hipóteses para a próxima rodada.", stage: "planned", actions: ["Consolidar métricas", "Comparar formatos", "Sugerir testes"] },
    ],
  },
  lucas: {
    summary: "Lucas mantém o funil comercial atualizado e conduz cada oportunidade ao próximo passo adequado.",
    capabilities: [
      { key: "qualification", title: "Qualificar leads", description: "Organiza informações e avalia aderência, momento e potencial.", stage: "planned", actions: ["Coletar contexto", "Aplicar critérios", "Priorizar oportunidades"] },
      { key: "follow-up", title: "Preparar follow-ups", description: "Sugere contatos relevantes com base no histórico da oportunidade.", stage: "planned", actions: ["Detectar leads parados", "Redigir mensagem", "Agendar próximo passo"] },
      { key: "pipeline", title: "Manter o pipeline", description: "Atualiza etapas e sinaliza negócios sem avanço ou informação.", stage: "planned", actions: ["Revisar etapas", "Encontrar gargalos", "Alertar riscos"] },
      { key: "proposal", title: "Preparar propostas", description: "Monta uma proposta a partir do diagnóstico e das condições autorizadas.", stage: "planned", actions: ["Consolidar escopo", "Aplicar condições", "Solicitar aprovação"] },
    ],
  },
  fiscal: {
    summary: "Marta organiza a operação fiscal e destaca inconsistências para revisão especializada.",
    capabilities: [
      { key: "documents", title: "Revisar documentos fiscais", description: "Confere dados essenciais e separa documentos com inconsistências.", stage: "planned", actions: ["Validar campos", "Detectar duplicidades", "Organizar evidências"] },
      { key: "obligations", title: "Mapear obrigações", description: "Mantém calendário de entregas, responsáveis e documentos necessários.", stage: "planned", actions: ["Controlar prazos", "Cobrar documentos", "Alertar pendências"] },
      { key: "risk", title: "Sinalizar riscos fiscais", description: "Identifica divergências e prepara o caso para análise humana.", stage: "planned", actions: ["Cruzar informações", "Classificar risco", "Registrar justificativa"] },
      { key: "report", title: "Gerar relatório fiscal", description: "Resume obrigações, pendências e evidências em um relatório rastreável.", stage: "planned", actions: ["Consolidar status", "Anexar evidências", "Destacar decisões"] },
    ],
  },
  imob: {
    summary: "Rafael qualifica compradores e mantém o relacionamento imobiliário disciplinado do interesse à proposta.",
    capabilities: [
      { key: "buyer", title: "Qualificar compradores", description: "Mapeia objetivo, orçamento, região e momento de compra.", stage: "planned", actions: ["Coletar preferências", "Validar perfil", "Definir prioridade"] },
      { key: "match", title: "Encontrar imóveis aderentes", description: "Cruza o perfil com o estoque disponível e explica a compatibilidade.", stage: "planned", actions: ["Filtrar estoque", "Comparar opções", "Preparar seleção"] },
      { key: "visit", title: "Organizar visitas", description: "Coordena disponibilidade e mantém todas as partes informadas.", stage: "planned", actions: ["Sugerir horários", "Confirmar participantes", "Registrar retorno"] },
      { key: "negotiation", title: "Acompanhar proposta", description: "Organiza documentos, contrapropostas e próximos passos da negociação.", stage: "planned", actions: ["Preparar proposta", "Registrar condições", "Solicitar aprovação"] },
    ],
  },
};

export function getEmployeeCapabilities(employee: Pick<Employee, "id" | "name" | "role" | "department">): EmployeeCapabilityCatalog {
  return catalogs[employee.id] ?? {
    summary: `${employee.name} terá um catálogo próprio de capacidades para ${employee.department}.`,
    capabilities: employee.role ? [{ key: "specialty", title: `Atuar como ${employee.role}`, description: "Capacidade aguardando definição e validação operacional.", stage: "planned", actions: ["Definir entradas", "Validar decisões", "Medir resultados"] }] : [],
  };
}

