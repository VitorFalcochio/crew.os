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
      { key: "inbox", title: "Caixa de entrada financeira", description: "Centraliza documentos processados, pendências, duplicidades e itens não identificados.", stage: "validation", actions: ["Receber até 20 arquivos", "Separar por status", "Encaminhar para revisão"], href: "/financeiro" },
      { key: "upload", title: "Upload inteligente", description: "Processa PDFs, imagens, TXT e CSV sem armazenar o arquivo original.", stage: "validation", actions: ["Arrastar arquivos", "Processar em lote", "Preservar privacidade"], href: "/financeiro" },
      { key: "extraction", title: "Leitura e extração", description: "Extrai texto de PDF, aplica OCR em imagens e reconhece os principais campos financeiros.", stage: "validation", actions: ["Identificar valor e vencimento", "Ler CNPJ ou CPF", "Encontrar documento e linha digitável"], href: "/financeiro" },
      { key: "relationships", title: "Relacionar documentos", description: "Vincula nota, boleto e comprovante quando pertencem à mesma operação.", stage: "validation", actions: ["Comparar valor e empresa", "Vincular evidências", "Atualizar pagamento"], href: "/financeiro" },
      { key: "categories", title: "Organizar e categorizar", description: "Sugere categorias financeiras e permite confirmação humana quando necessário.", stage: "validation", actions: ["Classificar receita ou despesa", "Organizar por empresa", "Confirmar categoria"], href: "/financeiro" },
      { key: "payables", title: "Contas a pagar", description: "Organiza fornecedores, valores, vencimentos e atrasos.", stage: "validation", actions: ["Criar lançamento", "Ordenar vencimentos", "Sinalizar atraso"], href: "/financeiro" },
      { key: "receivables", title: "Contas a receber", description: "Acompanha valores de clientes, pagamentos e inadimplência.", stage: "validation", actions: ["Controlar valores abertos", "Registrar parciais", "Priorizar atrasos"], href: "/financeiro" },
      { key: "collection", title: "Cobranças", description: "Classifica risco e prepara cobranças que exigem decisão do gestor.", stage: "validation", actions: ["Priorizar clientes", "Pedir aprovação", "Registrar decisão"], href: "/financeiro" },
      { key: "reconciliation", title: "Conciliação financeira", description: "Relaciona comprovantes com lançamentos para verificar pagamentos e recebimentos.", stage: "validation", actions: ["Cruzar documentos", "Marcar operação paga", "Apontar divergências"], href: "/financeiro" },
      { key: "calendar", title: "Agenda financeira", description: "Ordena compromissos e mostra entradas e saídas próximas.", stage: "validation", actions: ["Listar vencimentos", "Resumir sete dias", "Alertar atrasos"], href: "/financeiro" },
      { key: "cash-flow", title: "Fluxo de caixa", description: "Consolida entradas, saídas e resultado líquido previsto.", stage: "validation", actions: ["Somar entradas", "Somar saídas", "Explicar resultado"], href: "/financeiro" },
      { key: "projection", title: "Projeção de caixa", description: "Projeta compromissos em 7, 15, 30, 60 e 90 dias.", stage: "validation", actions: ["Calcular horizontes", "Comparar entradas e saídas", "Destacar saldo projetado"], href: "/financeiro" },
      { key: "radar", title: "Radar financeiro", description: "Procura duplicidades, atrasos, documentos incertos e riscos operacionais.", stage: "validation", actions: ["Detectar anomalias", "Definir severidade", "Sugerir responsável"], href: "/financeiro" },
      { key: "recurring", title: "Despesas recorrentes", description: "Encontra padrões repetidos por fornecedor e categoria.", stage: "validation", actions: ["Agrupar lançamentos", "Calcular média", "Exibir recorrência"], href: "/financeiro" },
      { key: "duplicates", title: "Detectar duplicidades", description: "Compara hash, documento, valor e empresa antes de gerar lançamentos.", stage: "validation", actions: ["Detectar arquivo idêntico", "Encontrar provável repetição", "Bloquear novo lançamento"], href: "/financeiro" },
      { key: "budget", title: "Orçado × realizado", description: "Compara limites mensais por categoria com pagamentos realizados.", stage: "validation", actions: ["Definir orçamento", "Medir realizado", "Sinalizar limite"], href: "/financeiro" },
      { key: "history", title: "Histórico organizado", description: "Mantém documentos, análises e decisões em timelines rastreáveis.", stage: "validation", actions: ["Preservar relações", "Registrar decisões", "Consultar contexto"], href: "/financeiro" },
      { key: "conversation", title: "Conversar com o financeiro", description: "Responde perguntas usando somente os dados financeiros locais.", stage: "validation", actions: ["Consultar contas", "Explicar projeção", "Resumir riscos"], href: "/financeiro" },
      { key: "daily", title: "Resumo diário", description: "Resume vencimentos, recebimentos previstos e atrasos do dia.", stage: "validation", actions: ["Consolidar agenda", "Exibir valores", "Destacar pendências"], href: "/financeiro" },
      { key: "weekly", title: "Resumo semanal", description: "Consolida entradas, saídas, inadimplência e principais alertas.", stage: "validation", actions: ["Resumir sete dias", "Listar anomalias", "Alimentar briefing"], href: "/financeiro" },
      { key: "crew", title: "Colaboração com a Crew", description: "Cria handoffs financeiros para Comercial, Compras ou Atendimento.", stage: "validation", actions: ["Preservar contexto", "Escolher setor", "Registrar handoff"], href: "/financeiro" },
      { key: "autonomy", title: "Autonomia financeira", description: "Separa observação automática de decisões que exigem aprovação.", stage: "validation", actions: ["Observar automaticamente", "Pedir confirmação", "Bloquear ação externa"], href: "/financeiro" },
      { key: "audit", title: "Auditoria das ações", description: "Registra ação, motivo, dados utilizados e nível de autonomia.", stage: "validation", actions: ["Registrar processamento", "Registrar confirmação", "Registrar colaboração"], href: "/financeiro" },
      { key: "gmail", title: "Gmail financeiro", description: "Entrada OAuth para documentos recebidos por e-mail.", stage: "planned", actions: ["Autorizar Gmail", "Buscar anexos", "Enviar à caixa financeira"] },
    ],
  },
  carlos: {
    summary: "Carlos atua em compras estratégicas, comparando custo total, prazo, qualidade e risco de fornecimento.",
    capabilities: [
      { key: "quote", title: "Comparar cotações", description: "Normaliza propostas e compara preço, prazo, frete e condição de pagamento.", stage: "validation", actions: ["Ler propostas", "Normalizar itens", "Criar mapa comparativo"], href: "/compras" },
      { key: "supplier", title: "Avaliar fornecedores", description: "Mantém histórico de desempenho e sinaliza riscos antes da compra.", stage: "validation", actions: ["Avaliar atrasos", "Comparar qualidade", "Sinalizar concentração"], href: "/compras" },
      { key: "recommend", title: "Recomendar uma compra", description: "Prepara a melhor combinação de fornecedores com justificativa verificável.", stage: "validation", actions: ["Calcular custo total", "Explicar trade-offs", "Solicitar aprovação"], href: "/compras" },
      { key: "order", title: "Acompanhar pedidos", description: "Monitora confirmação, prazo e entrega dos pedidos aprovados.", stage: "planned", actions: ["Cobrar confirmação", "Alertar atrasos", "Registrar recebimento"] },
    ],
  },
  sofia: {
    summary: "Sofia organiza o atendimento, responde casos seguros e encaminha exceções com todo o contexto.",
    capabilities: [
      { key: "triage", title: "Fazer triagem", description: "Classifica mensagens por assunto, urgência e sentimento.", stage: "validation", actions: ["Identificar intenção", "Definir prioridade", "Encaminhar responsável"], href: "/atendimento" },
      { key: "answer", title: "Responder dúvidas frequentes", description: "Produz respostas consistentes com as políticas e o tom da empresa.", stage: "validation", actions: ["Consultar base de conhecimento", "Preparar resposta", "Pedir revisão quando necessário"], href: "/atendimento" },
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
      { key: "qualification", title: "Qualificar leads", description: "Organiza informações e avalia aderência, momento e potencial.", stage: "validation", actions: ["Coletar contexto", "Aplicar critérios", "Priorizar oportunidades"], href: "/comercial" },
      { key: "follow-up", title: "Preparar follow-ups", description: "Sugere contatos relevantes com base no histórico da oportunidade.", stage: "validation", actions: ["Detectar leads parados", "Redigir mensagem", "Agendar próximo passo"], href: "/comercial" },
      { key: "pipeline", title: "Manter o pipeline", description: "Atualiza etapas e sinaliza negócios sem avanço ou informação.", stage: "validation", actions: ["Revisar etapas", "Encontrar gargalos", "Alertar riscos"], href: "/comercial" },
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
