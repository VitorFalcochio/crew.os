import { answerFinancialQuestion, buildFinancialOverview } from "@/features/finance/financial-operations";
import type { DemoState, Employee } from "@/types/domain";

type ChatState = Pick<DemoState, "tasks" | "approvals" | "financialEntries" | "financialDocuments" | "procurementRequests" | "supplierQuotes"> & Partial<Pick<DemoState, "financialAccounts" | "financialBalances">>;

const normalize = (value: string) => value.trim().toLocaleLowerCase("pt-BR");
const brl = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function anaFinancialEntries(state: ChatState) {
  const today = new Date().toISOString().slice(0, 10);
  return [...state.financialEntries, ...(state.financialAccounts ?? []).filter((account) => account.status !== "cancelled").map((account) => ({
    id: `synced-${account.id}`,
    direction: account.direction ?? "receivable" as const,
    counterparty: account.customerName,
    description: account.document,
    amount: account.amount,
    paidAmount: account.status === "paid" ? account.amount : 0,
    dueDate: account.dueDate,
    status: account.status === "paid" ? "paid" as const : account.status === "overdue" || account.dueDate < today ? "overdue" as const : "open" as const,
    category: account.direction === "payable" ? "Despesas operacionais" : "Receitas operacionais",
    sourceDocumentIds: [],
    createdAt: account.createdAt,
  }))];
}

function socialReply(employee: Employee, question: string) {
  const query = normalize(question).replace(/[!?.,]+/g, " ").replace(/\s+/g, " ").trim();
  const specialty = employee.id === "ana" ? "o financeiro" : employee.id === "carlos" ? "suas compras" : employee.department.toLocaleLowerCase("pt-BR");
  if (/^(oi+|olá|ola|e aí|e ai|bom dia|boa tarde|boa noite)\b/.test(query) || /^(tudo bem|como você está|como voce esta)\b/.test(query)) {
    return `Oi! Tudo bem por aqui. Estou pronta para ajudar com ${specialty}. O que você gostaria de saber?`;
  }
  if (/^(obrigad[oa]|valeu|agradeço|agradeco)\b/.test(query)) return `Por nada! Quando precisar, estou por aqui para ajudar com ${specialty}.`;
  if (/^(tchau|até mais|ate mais|falou|até logo|ate logo)\b/.test(query)) return "Até mais! Se surgir alguma dúvida ou decisão, é só me chamar.";
  if (/(quem é você|quem e voce|qual (é|e) seu nome|se apresente)/.test(query)) return `Eu sou ${employee.name}, especialista de ${employee.department} da sua equipe digital. Posso analisar os dados da minha área, explicar o que encontrei e preparar recomendações para sua decisão.`;
  return null;
}

export function employeeGreeting(employee: Employee) {
  if (employee.id === "ana") return "Olá! Sou a Ana. Posso explicar contas, documentos, atrasos, projeções de caixa e riscos usando os dados do seu Financeiro.";
  if (employee.id === "carlos") return "Olá! Sou o Carlos. Posso ajudar com requisições, cotações, fornecedores, prazos, riscos e recomendações de compra.";
  return `Olá! Sou ${employee.name}. Posso responder dúvidas sobre ${employee.department.toLocaleLowerCase("pt-BR")}, minhas tarefas e minhas funcionalidades.`;
}

export function buildEmployeeChatContext(employee: Employee, state: ChatState, organization: string) {
  const employeeTasks = state.tasks.filter((task) => task.employeeId === employee.id).slice(0, 15);
  const employeeApprovals = state.approvals.filter((approval) => approval.employeeId === employee.id).slice(0, 15);
  const base = {
    organization,
    employee: { id: employee.id, name: employee.name, role: employee.role, department: employee.department, skills: employee.skills, responsibilities: employee.responsibilities },
    tasks: employeeTasks,
    approvals: employeeApprovals,
  };
  if (employee.id === "ana") return JSON.stringify({ ...base, financialEntries: anaFinancialEntries(state).slice(0, 200), financialBalances: (state.financialBalances ?? []).slice(0, 100), financialDocuments: state.financialDocuments.slice(0, 80) });
  if (employee.id === "carlos") return JSON.stringify({ ...base, procurementRequests: state.procurementRequests.slice(0, 50), supplierQuotes: state.supplierQuotes.slice(0, 100) });
  return JSON.stringify(base);
}

function answerProcurementQuestion(question: string, state: ChatState) {
  const query = normalize(question);
  const requests = state.procurementRequests;
  const pending = requests.filter((request) => request.status === "quoting");
  const awaiting = requests.filter((request) => request.status === "awaiting_approval");
  const approved = requests.filter((request) => request.status === "approved");
  const recommendedQuotes = requests.flatMap((request) => {
    const quote = state.supplierQuotes.find((item) => item.id === request.recommendedQuoteId);
    return quote ? [{ request, quote }] : [];
  });
  if (/pendente|andamento|status|requisi/.test(query)) return `Tenho ${requests.length} requisição(ões): ${pending.length} em cotação, ${awaiting.length} aguardando aprovação e ${approved.length} aprovada(s).${pending[0] ? ` A próxima comparação é “${pending[0].title}”.` : ""}`;
  if (/aprova|decis/.test(query)) return awaiting.length ? `${awaiting.length} compra(s) aguardam sua decisão: ${awaiting.map((item) => item.title).join(", ")}. Você pode decidir na área de Aprovações.` : "Não há recomendações de compra aguardando sua aprovação agora.";
  if (/econom|orçamento|orcamento|valor|custo/.test(query)) {
    const budget = requests.reduce((sum, item) => sum + item.budget, 0);
    const recommended = recommendedQuotes.reduce((sum, item) => sum + item.quote.total, 0);
    return `O orçamento informado soma ${brl(budget)}. As propostas recomendadas somam ${brl(recommended)}, com economia estimada de ${brl(Math.max(0, budget - recommended))}.`;
  }
  if (/fornecedor|proposta|cota/.test(query)) {
    if (!recommendedQuotes.length) return "Ainda não há propostas comparadas. Cadastre uma requisição em Compras e use a ação Comparar.";
    const latest = recommendedQuotes[0];
    return `Para “${latest.request.title}”, recomendo ${latest.quote.supplierName}: ${brl(latest.quote.total)}, entrega em ${latest.quote.leadTimeDays} dias, pagamento em ${latest.quote.paymentTerms} e risco ${latest.quote.risk}.`;
  }
  if (/prazo|entrega|urgente/.test(query)) {
    const fastest = [...state.supplierQuotes].sort((a, b) => a.leadTimeDays - b.leadTimeDays)[0];
    return fastest ? `A entrega mais rápida disponível é da ${fastest.supplierName}, em ${fastest.leadTimeDays} dias, por ${brl(fastest.total)}. Antes de escolher, também considero custo total e risco.` : "Ainda não há prazos de fornecedores para comparar.";
  }
  return `Posso responder sobre requisições, fornecedores, cotações, orçamento, prazo, risco e aprovações. Hoje tenho ${requests.length} requisição(ões) registrada(s).`;
}

export function answerEmployeeQuestion(employee: Employee, question: string, state: ChatState) {
  const conversational = socialReply(employee, question);
  if (conversational) return conversational;
  if (employee.id === "ana") {
    const overview = buildFinancialOverview(anaFinancialEntries(state), state.financialDocuments, new Date().toISOString().slice(0, 10));
    return answerFinancialQuestion(question, overview);
  }
  if (employee.id === "carlos") return answerProcurementQuestion(question, state);
  const query = normalize(question);
  const employeeTasks = state.tasks.filter((task) => task.employeeId === employee.id);
  if (/tarefa|fazendo|andamento|status/.test(query)) return employeeTasks.length ? `Tenho ${employeeTasks.length} tarefa(s) registrada(s). A mais recente é “${employeeTasks[0].title}”, com status ${employeeTasks[0].status}.` : "Ainda não tenho tarefas registradas neste ambiente.";
  if (/pode|função|funcao|ajuda|especial/.test(query)) return `Atuo em ${employee.department}. Minhas especialidades incluem ${employee.skills.join(", ")}. Posso analisar o contexto e preparar recomendações, respeitando suas permissões e aprovações.`;
  return `Posso ajudar com dúvidas de ${employee.department.toLocaleLowerCase("pt-BR")} e explicar minhas tarefas, responsabilidades e limites. Para uma resposta baseada em inteligência generativa, configure a chave da OpenAI no servidor.`;
}
