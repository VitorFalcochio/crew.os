"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { initialDemoState } from "./services/seed";
import { adaptBootstrap, type BootstrapPayload } from "./services/backend-adapter";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { clearLocalMvp, clearLocalSession, hasLocalSession, readLocalAccount, readLocalWorkspace, writeLocalState, writeLocalWorkspace } from "@/features/local/local-workspace";
import { analyzeLocalReceivables } from "@/features/local/local-finance";
import { organizeFinancialDocuments } from "@/features/finance/financial-operations";
import type { ParsedFinancialDocument } from "@/features/finance/document-intelligence";
import type { Activity, AgentOutboundEmailAction, Approval, CollectionEmailAction, DemoState, EmployeeStatus, FinancialAccount, FinancialDirection, FinancialDocument, Priority, ProcurementRequest, SalesLead, SupplierContact, SupplierQuoteRequestEmailAction, SupportCase, Task } from "@/types/domain";

interface DelegateInput { employeeId: string; title: string; description: string; priority: Priority; requiresApproval: boolean }
interface ProcurementRequestInput { title: string; category: string; quantity: number; budget: number; neededBy: string; project: string; notes: string; supplierIds: string[] }
interface Account { name: string; organization: string; email?: string; role: string }
interface DemoContextValue extends DemoState {
  account: Account;
  backendEnabled: boolean;
  delegateTask: (input: DelegateInput) => Task;
  resolveApproval: (id: string, resolution: Approval["status"]) => void;
  saveCollectionDraft: (actionId: string, input: { subject: string; body: string }) => Promise<void>;
  approveCollection: (actionId: string) => Promise<void>;
  rejectCollection: (actionId: string) => Promise<void>;
  retryCollection: (actionId: string) => Promise<void>;
  reconcileCollectionAction: (action: CollectionEmailAction) => void;
  toggleIntegration: (id: string) => void;
  hireEmployee: (id: string) => boolean;
  setEmployeeStatus: (id: string, status: EmployeeStatus) => void;
  updateOrganization: (input: { name: string; industry: string }) => Promise<void>;
  importFinancialAccounts: (accounts: Array<Omit<FinancialAccount, "id" | "createdAt">>) => number;
  runAnaAnalysis: () => boolean;
  processFinancialDocuments: (files: File[]) => Promise<{ processed: number; duplicates: number; reviews: number }>;
  confirmFinancialDocument: (id: string, input: { direction: FinancialDirection; counterparty: string; amount: number; dueDate: string; category: string }) => boolean;
  createFinancialHandoff: (input: { toDepartment: "Comercial" | "Compras" | "Atendimento"; title: string; context: string }) => void;
  setFinancialBudget: (category: string, limit: number) => void;
  createProcurementRequest: (input: ProcurementRequestInput) => string | null;
  addSupplier: (input: Omit<SupplierContact, "id" | "createdAt" | "source">) => boolean;
  importSuppliers: (items: Array<Omit<SupplierContact, "id" | "createdAt" | "source">>) => { created: number; duplicates: number };
  requestSupplierQuotes: (id: string) => Promise<boolean>;
  saveSupplierQuoteRequestDraft: (actionId: string, input: { subject: string; body: string }) => Promise<void>;
  approveSupplierQuoteRequest: (actionId: string) => Promise<void>;
  rejectSupplierQuoteRequest: (actionId: string) => Promise<void>;
  retrySupplierQuoteRequest: (actionId: string) => Promise<void>;
  reconcileSupplierQuoteRequest: (action: SupplierQuoteRequestEmailAction) => void;
  addSupportCase: (input: Omit<SupportCase, "id" | "createdAt" | "source" | "status"> & { source?: SupportCase["source"] }) => boolean;
  prepareSupportReply: (id: string) => Promise<boolean>;
  addSalesLead: (input: Omit<SalesLead, "id" | "createdAt" | "source" | "status" | "stage">) => boolean;
  importSalesLeads: (items: Array<{ contactName: string; companyName: string; email: string; context: string; estimatedValue?: number }>) => { created: number; duplicates: number };
  updateSalesLeadStage: (id: string, stage: SalesLead["stage"]) => void;
  prepareSalesFollowup: (id: string) => Promise<boolean>;
  saveAgentOutboundDraft: (actionId: string, kind: AgentOutboundEmailAction["kind"], input: { subject: string; body: string }) => Promise<void>;
  approveAgentOutbound: (actionId: string, kind: AgentOutboundEmailAction["kind"]) => Promise<void>;
  rejectAgentOutbound: (actionId: string, kind: AgentOutboundEmailAction["kind"]) => Promise<void>;
  retryAgentOutbound: (actionId: string, kind: AgentOutboundEmailAction["kind"]) => Promise<void>;
  reconcileAgentOutbound: (action: AgentOutboundEmailAction) => void;
  logoutLocal: () => void;
  resetLocalMvp: () => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);
const hasBackend = isSupabaseConfigured();
const initialAccount: Account = { name: "Vitor Almeida", organization: "Construtora Alpha", role: "owner" };

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<DemoState>(initialDemoState);
  const [account, setAccount] = useState<Account>(initialAccount);
  const hydrated = useRef(false);

  const refreshBackend = useCallback(async () => {
    const response = await fetch("/api/bootstrap", { cache: "no-store" });
    if (response.status === 403) { router.replace("/onboarding"); return; }
    if (!response.ok) throw new Error("Não foi possível sincronizar os dados da empresa");
    const payload = await response.json() as BootstrapPayload;
    setState(adaptBootstrap(payload));
    setAccount({ name: payload.account.name, organization: payload.account.organization.name, email: payload.account.email, role: payload.account.role });
  }, [router]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (hasBackend) {
        void refreshBackend().catch(() => toast.error("Falha ao sincronizar", { description: "Verifique a conexão e tente novamente." }));
        return;
      }
      if (!hasLocalSession()) {
        router.replace(readLocalAccount() ? "/login" : "/cadastro");
        return;
      }
      const workspace = readLocalWorkspace();
      if (!workspace) {
        router.replace("/onboarding");
        return;
      }
      setState(workspace.state);
      setAccount({ name: workspace.account.name, email: workspace.account.email, organization: workspace.company.name, role: "owner" });
      hydrated.current = true;
      void fetch("/api/integrations/google/status", { cache: "no-store" }).then(async (response) => response.ok ? response.json() as Promise<{ connected: boolean; requiresReauth?: boolean; connection?: { capabilities?: string[]; updatedAt?: string } }> : undefined).then((google) => {
        if (!google) return;
        setState((current) => {
          const withoutLegacyCalendar = current.integrations.filter((item) => item.id !== "calendar");
          const hasWorkspace = withoutLegacyCalendar.some((item) => item.provider === "google-workspace" || item.id === "google-workspace");
          const connectionStatus = google.requiresReauth ? "requires_reauth" as const : google.connected ? "connected" as const : "disconnected" as const;
          const normalized = hasWorkspace ? withoutLegacyCalendar.map((item) => item.provider === "google-workspace" || item.id === "google-workspace" ? { ...item, id: "google-workspace", provider: "google-workspace", name: "Google Workspace", description: "Gmail e Google Calendar em uma única conexão", category: "Produtividade", initials: "GW", connected: google.connected, status: connectionStatus, capabilities: google.connection?.capabilities, lastSyncAt: google.connection?.updatedAt, healthMessage: google.requiresReauth ? "Reconecte para autorizar o envio de e-mails" : item.healthMessage } : item) : [{ id: "google-workspace", provider: "google-workspace", name: "Google Workspace", description: "Gmail e Google Calendar em uma única conexão", category: "Produtividade", initials: "GW", connected: google.connected, status: connectionStatus, capabilities: google.connection?.capabilities, lastSyncAt: google.connection?.updatedAt, healthMessage: google.requiresReauth ? "Reconecte para autorizar o envio de e-mails" : undefined }, ...withoutLegacyCalendar.filter((item) => item.id !== "gmail")];
          return { ...current, integrations: normalized };
        });
      }).catch(() => { /* status local best effort */ });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [refreshBackend, router]);

  useEffect(() => {
    if (!hasBackend) return;
    const interval = window.setInterval(() => {
      void refreshBackend().catch(() => {
        /* polling best effort */
      });
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [refreshBackend]);

  useEffect(() => { if (!hasBackend && hydrated.current) writeLocalState(state); }, [state]);

  const delegateTask = useCallback((input: DelegateInput) => {
    const task: Task = { id: crypto.randomUUID(), ...input, status: "planejando", dueAt: "Sem prazo", createdAt: "Agora" };
    const activity: Activity = { id: crypto.randomUUID(), employeeId: input.employeeId, taskId: task.id, title: "Nova delegação recebida", description: input.title, type: "tarefa", createdAt: "Agora" };
    setState((current) => ({ ...current, tasks: [task, ...current.tasks], activities: [activity, ...current.activities], employees: current.employees.map((employee) => employee.id === input.employeeId ? { ...employee, status: "trabalhando", currentTask: input.title } : employee) }));
    if (hasBackend) void fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...input, priority: input.priority === "média" ? "media" : input.priority, dueAt: null }) }).then(async (response) => { if (!response.ok) throw new Error((await response.json()).error); await refreshBackend(); }).catch((error: Error) => { setState((current) => ({ ...current, tasks: current.tasks.filter((item) => item.id !== task.id), activities: current.activities.filter((item) => item.taskId !== task.id) })); toast.error("A delegação não foi salva", { description: error.message }); });
    toast.success("Tarefa delegada", { description: "O funcionário já começou a montar o plano de trabalho." });
    return task;
  }, [refreshBackend]);

  const resolveApproval = useCallback((id: string, resolution: Approval["status"]) => {
    const previous = state;
    const selected = state.approvals.find((item) => item.id === id);
    if (selected?.externalActionId) {
      toast.info("Revise a cobrança antes de decidir", { description: "Ações externas são aprovadas somente na tela de Aprovações." });
      return;
    }
    if (hasBackend) {
      setState((current) => ({ ...current, approvals: current.approvals.map((item) => item.id === id ? { ...item, status: resolution } : item) }));
      void fetch(`/api/approvals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: resolution === "ajuste solicitado" ? "ajuste_solicitado" : resolution }) }).then(async (response) => { if (!response.ok) throw new Error((await response.json()).error); await refreshBackend(); }).catch((error: Error) => { setState(previous); toast.error("A decisão não foi registrada", { description: error.message }); });
    } else setState((current) => {
      const approval = current.approvals.find((item) => item.id === id); if (!approval) return current;
      const approved = resolution === "aprovada";
      const isPurchase = Boolean(approval.relatedPurchaseRequestId);
      const title = approved ? isPurchase ? "Compra aprovada" : "Cobrança simulada autorizada" : resolution === "recusada" ? "Ação recusada" : "Ajuste solicitado";
      const description = approved ? isPurchase ? "A recomendação do Carlos foi aprovada. O pedido externo continua simulado." : "A decisão foi registrada. Nenhuma mensagem externa foi enviada neste MVP local." : `O gestor definiu: ${resolution}.`;
      const decisionEvents = (approval.relatedAccountIds ?? []).flatMap((accountId) => {
        const financialAccount = current.financialAccounts.find((item) => item.id === accountId);
        if (!financialAccount) return [];
        const assessment = current.financialCollectionEvents.find((item) => item.accountId === accountId && item.eventType === "analysis");
        return [{ id: crypto.randomUUID(), accountId, customerName: financialAccount.customerName, document: financialAccount.document, eventType: approved ? "approval" as const : resolution === "recusada" ? "refusal" as const : "adjustment" as const, title, description, risk: assessment?.risk ?? "baixo" as const, priority: assessment?.priority ?? "baixa" as const, daysOverdue: assessment?.daysOverdue ?? 0, amount: financialAccount.amount, createdAt: new Date().toISOString() }];
      });
      return { ...current, approvals: current.approvals.map((item) => item.id === id ? { ...item, status: resolution } : item), tasks: current.tasks.map((task) => task.id === approval.taskId ? { ...task, status: approved ? "concluída" : "cancelada", result: description } : task), employees: current.employees.map((employee) => employee.id === approval.employeeId ? { ...employee, status: "disponível", currentTask: approved ? isPurchase ? "Compra aprovada pelo gestor" : "Cobrança simulada registrada" : "Aguardando nova orientação", tasksCompleted: approved ? employee.tasksCompleted + 1 : employee.tasksCompleted } : employee), activities: [{ id: crypto.randomUUID(), employeeId: approval.employeeId, taskId: approval.taskId, title, description, type: "aprovação", createdAt: "Agora" }, ...current.activities], financialCollectionEvents: [...decisionEvents, ...current.financialCollectionEvents], procurementRequests: current.procurementRequests.map((request) => request.id === approval.relatedPurchaseRequestId ? { ...request, status: approved ? "approved" as const : resolution === "recusada" ? "rejected" as const : "recommended" as const } : request) };
    });
    toast.success(resolution === "aprovada" ? "Ação aprovada" : resolution === "recusada" ? "Ação recusada" : "Ajuste solicitado");
  }, [refreshBackend, state]);

  const toggleIntegration = useCallback((id: string) => {
    const selectedIntegration = state.integrations.find((item) => item.id === id);
    if (selectedIntegration?.provider === "conta-azul") {
      if (!selectedIntegration.connected) { router.push("/api/integrations/conta-azul/connect"); return; }
      void fetch("/api/integrations/conta-azul/disconnect", { method: "DELETE" }).then(async (response) => {
        if (!response.ok) { const payload = await response.json() as { error?: string }; throw new Error(payload.error ?? "Não foi possível desconectar o Conta Azul"); }
        if (hasBackend) await refreshBackend();
        toast.success("Conta Azul desconectado");
      }).catch((error: Error) => toast.error("Falha na integração", { description: error.message }));
      return;
    }
    if (selectedIntegration?.provider === "google-workspace") {
      if (!selectedIntegration.connected) { router.push("/api/integrations/google/connect"); return; }
      const request = hasBackend ? fetch(`/api/integrations/connections/${selectedIntegration.id}`, { method: "DELETE" }) : fetch("/api/integrations/google/disconnect", { method: "DELETE" });
      void request.then(async (response) => { if (!response.ok) throw new Error("Não foi possível desconectar o Google Workspace"); if (hasBackend) await refreshBackend(); else setState((current) => ({ ...current, integrations: current.integrations.map((item) => item.id === id ? { ...item, connected: false, status: "disconnected" } : item) })); toast.success("Google Workspace desconectado"); }).catch((error: Error) => toast.error("Falha na integração", { description: error.message }));
      return;
    }
    if (hasBackend) {
      const integration = state.integrations.find((item) => item.id === id);
      if (!integration) return;
      const request = integration.connected
        ? fetch(`/api/integrations/connections/${integration.id}`, { method: "DELETE" })
        : fetch("/api/integrations/connections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: integration.provider }) });
      void request.then(async (response) => { if (!response.ok) { const payload = await response.json() as { error?: string }; throw new Error(typeof payload.error === "string" ? payload.error : "Não foi possível alterar a conexão"); } await refreshBackend(); toast.success(integration.connected ? `${integration.name} desconectada` : `${integration.name} conectada em modo mock`); }).catch((error: Error) => toast.error("Falha na integração", { description: error.message }));
      return;
    }
    let connected = false; let name = "Integração";
    setState((current) => ({ ...current, integrations: current.integrations.map((item) => { if (item.id !== id) return item; connected = !item.connected; name = item.name; return { ...item, connected }; }) }));
    toast.success(connected ? `${name} conectada` : `${name} desconectada`);
  }, [refreshBackend, router, state.integrations]);
  const hireEmployee = useCallback((id: string) => {
    const employee = state.employees.find((item) => item.id === id);
    if (!employee || employee.hired) return false;
    const hiredCount = state.employees.filter((item) => item.hired).length;
    if (hiredCount >= 6) {
      toast.warning("Limite de funcionários atingido", {
        description: "Seu plano permite até 6 funcionários digitais. Ajuste o plano ou remova um integrante antes de contratar outro.",
        duration: 6500,
      });
      return false;
    }
    setState((current) => ({ ...current, employees: current.employees.map((item) => item.id === id ? { ...item, hired: true, status: "configurando", currentTask: "Preparando espaço de trabalho" } : item) }));
    toast.success(`${employee.name} foi adicionado à equipe`);
    return true;
  }, [state.employees]);

  const setEmployeeStatus = useCallback((id: string, status: EmployeeStatus) => {
    const previous = state;
    setState((current) => ({ ...current, employees: current.employees.map((employee) => employee.id === id ? { ...employee, status, currentTask: status === "pausado" ? "Execuções pausadas pelo gestor" : employee.currentTask } : employee) }));
    if (hasBackend) {
      const backendStatus: Record<EmployeeStatus, string> = { "trabalhando": "trabalhando", "aguardando aprovação": "aguardando_aprovacao", "disponível": "disponivel", "pausado": "pausado", "com erro": "com_erro", "configurando": "configurando" };
      void fetch(`/api/employees/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: backendStatus[status] }) }).then(async (response) => { if (!response.ok) throw new Error((await response.json()).error); await refreshBackend(); }).catch((error: Error) => { setState(previous); toast.error("Não foi possível alterar o funcionário", { description: error.message }); });
    }
    toast.success(status === "pausado" ? "Funcionário pausado" : "Funcionário reativado");
  }, [refreshBackend, state]);

  const importFinancialAccounts = useCallback((accounts: Array<Omit<FinancialAccount, "id" | "createdAt">>) => {
    if (hasBackend) return 0;
    const created = accounts.map((item) => ({ ...item, id: crypto.randomUUID(), createdAt: "Agora" }));
    setState((current) => ({
      ...current,
      financialAccounts: [...created, ...current.financialAccounts],
      activities: [{ id: crypto.randomUUID(), employeeId: "ana", title: "Recebíveis importados", description: `${created.length} conta(s) foram adicionadas manualmente ao MVP local.`, type: "ferramenta", createdAt: "Agora" }, ...current.activities],
    }));
    toast.success(`${created.length} conta(s) importada(s)`, { description: "Os dados estão prontos para a análise local da Ana." });
    return created.length;
  }, []);

  const syncCollectionAction = useCallback((action: CollectionEmailAction) => {
    setState((current) => {
      const alreadyRecorded = current.financialCollectionEvents.some((event) => event.externalActionId === action.id && ((action.status === "sent" && event.eventType === "approval") || (action.status === "rejected" && event.eventType === "refusal")));
      const approvals = current.approvals.map((approval) => approval.externalActionId === action.id ? {
        ...approval,
        status: action.status === "rejected" ? "recusada" as const : action.approvalStatus === "approved" ? "aprovada" as const : "pendente" as const,
        externalActionStatus: action.status,
        externalError: action.error,
        externalMessageId: action.externalMessageId,
        externalThreadId: action.externalThreadId,
        externalSentAt: action.sentAt,
      } : approval);
      const related = approvals.filter((approval) => approval.taskId === action.taskId && approval.externalActionId);
      const sent = related.filter((approval) => approval.externalActionStatus === "sent").length;
      const rejected = related.filter((approval) => approval.externalActionStatus === "rejected").length;
      const failed = related.filter((approval) => approval.externalActionStatus === "failed").length;
      const active = related.filter((approval) => ["awaiting_approval", "sending"].includes(approval.externalActionStatus ?? "")).length;
      const finished = related.length > 0 && active === 0 && failed === 0;
      const taskStatus = failed ? "falhou" as const : finished ? (sent ? "concluída" as const : "cancelada" as const) : "aguardando aprovação" as const;
      const result = `${sent} enviada(s) · ${rejected} recusada(s) · ${failed} com falha · ${active} pendente(s)`;
      const decisionEvents = alreadyRecorded || !["sent", "rejected"].includes(action.status) ? [] : action.accounts.map((financialAccount) => {
        const assessment = current.financialCollectionEvents.find((event) => event.accountId === financialAccount.id && event.eventType === "analysis");
        return { id: crypto.randomUUID(), externalActionId: action.id, accountId: financialAccount.id, customerName: financialAccount.customerName, document: financialAccount.document, eventType: action.status === "sent" ? "approval" as const : "refusal" as const, title: action.status === "sent" ? "Cobrança enviada pelo Gmail" : "Cobrança recusada", description: action.status === "sent" ? `Mensagem ${action.externalMessageId ?? "confirmada"} enviada após aprovação.` : "O gestor recusou o envio externo.", risk: assessment?.risk ?? "baixo" as const, priority: assessment?.priority ?? "baixa" as const, daysOverdue: assessment?.daysOverdue ?? 0, amount: financialAccount.amount, createdAt: new Date().toISOString() };
      });
      const activity = alreadyRecorded || !["sent", "failed", "rejected"].includes(action.status) ? [] : [{ id: crypto.randomUUID(), employeeId: "ana", taskId: action.taskId, title: action.status === "sent" ? "Cobrança enviada pelo Gmail" : action.status === "failed" ? "Falha no envio da cobrança" : "Cobrança recusada", description: action.status === "sent" ? `${action.customerName} recebeu a cobrança. ID: ${action.externalMessageId}.` : action.error ?? `${action.customerName} não receberá esta cobrança.`, type: action.status === "failed" ? "ferramenta" as const : "aprovação" as const, createdAt: "Agora" }];
      return {
        ...current,
        approvals,
        tasks: current.tasks.map((task) => task.id === action.taskId ? { ...task, status: taskStatus, result } : task),
        employees: current.employees.map((employee) => employee.id === "ana" ? { ...employee, status: failed ? "com erro" as const : finished ? "disponível" as const : "aguardando aprovação" as const, currentTask: failed ? "Envio de cobrança precisa de nova tentativa" : finished ? "Ciclo de cobranças concluído" : "Aguardando decisões sobre cobranças", tasksCompleted: finished && sent > 0 && employee.status !== "disponível" ? employee.tasksCompleted + 1 : employee.tasksCompleted } : employee),
        activities: [...activity, ...current.activities],
        financialCollectionEvents: [...decisionEvents, ...current.financialCollectionEvents],
      };
    });
  }, []);

  const collectionRequest = useCallback(async (actionId: string, endpoint: string) => {
    const response = await fetch(`/api/ana/collections/${actionId}${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actor: account.name }) });
    const payload = await response.json() as { data?: CollectionEmailAction; error?: string };
    if (payload.data) syncCollectionAction(payload.data);
    if (!response.ok || !payload.data) throw new Error(payload.error ?? "Não foi possível processar a cobrança");
    return payload.data;
  }, [account.name, syncCollectionAction]);

  const saveCollectionDraft = useCallback(async (actionId: string, input: { subject: string; body: string }) => {
    const response = await fetch(`/api/ana/collections/${actionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...input, actor: account.name }) });
    const payload = await response.json() as { data?: CollectionEmailAction; error?: string };
    if (!response.ok || !payload.data) throw new Error(payload.error ?? "Não foi possível salvar o rascunho");
    syncCollectionAction(payload.data);
    toast.success("Rascunho salvo");
  }, [account.name, syncCollectionAction]);

  const approveCollection = useCallback(async (actionId: string) => { await collectionRequest(actionId, "/approve-and-send"); toast.success("Cobrança enviada pelo Gmail"); }, [collectionRequest]);
  const retryCollection = useCallback(async (actionId: string) => { await collectionRequest(actionId, "/retry"); toast.success("Cobrança enviada pelo Gmail"); }, [collectionRequest]);
  const rejectCollection = useCallback(async (actionId: string) => { await collectionRequest(actionId, "/reject"); toast.success("Cobrança recusada"); }, [collectionRequest]);

  const runAnaAnalysis = useCallback(() => {
    if (hasBackend) return false;
    const ana = state.employees.find((employee) => employee.id === "ana" && employee.hired);
    if (!ana) { toast.error("Ana não está na equipe"); return false; }
    if (state.tasks.some((task) => task.employeeId === "ana" && ["planejando", "executando", "aguardando aprovação"].includes(task.status))) { toast.error("Ana já possui uma análise em andamento"); return false; }
    const receivables = state.financialAccounts.filter((account) => (account.direction ?? "receivable") === "receivable" && account.status !== "cancelled");
    if (!receivables.length) { toast.error("Importe pelo menos uma conta a receber"); return false; }

    const taskId = crypto.randomUUID();
    const task: Task = { id: taskId, employeeId: "ana", title: "Analisar contas a receber", description: "Classificar recebíveis, identificar atrasos e preparar cobranças reais por Gmail.", priority: "alta", status: "executando", dueAt: "Agora", requiresApproval: true, createdAt: "Agora" };
    setState((current) => ({ ...current, tasks: [task, ...current.tasks], employees: current.employees.map((employee) => employee.id === "ana" ? { ...employee, status: "trabalhando", currentTask: "Analisando contas a receber..." } : employee), activities: [{ id: crypto.randomUUID(), employeeId: "ana", taskId, title: "Ana começou a análise", description: `${current.financialAccounts.length} recebível(is) entraram na análise local.`, type: "tarefa", createdAt: "Agora" }, ...current.activities] }));
    toast.success("Ana começou a trabalhar", { description: "Ela vai preparar os rascunhos e validar os destinatários." });

    window.setTimeout(() => {
      void (async () => {
        const today = new Date().toISOString().slice(0, 10);
        const analysis = analyzeLocalReceivables(receivables, today);
        const { overdue, overdueTotal: total, analyzed, assessments } = analysis;
        const baseResult = `${analyzed} conta(s) analisada(s) · ${overdue.length} vencida(s) · R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em cobrança potencial`;
        const analyzedActivity: Activity = { id: crypto.randomUUID(), employeeId: "ana", taskId, title: "Contas analisadas", description: baseResult, type: "ferramenta", createdAt: "Agora" };
        const analysisEvents = assessments.map((assessment) => ({ id: crypto.randomUUID(), accountId: assessment.account.id, customerName: assessment.account.customerName, document: assessment.account.document, eventType: "analysis" as const, title: `Risco ${assessment.risk} · prioridade ${assessment.priority}`, description: assessment.reasons.join(" · "), risk: assessment.risk, priority: assessment.priority, daysOverdue: assessment.daysOverdue, amount: assessment.account.amount, createdAt: new Date().toISOString() }));
        if (!overdue.length) {
          setState((current) => ({ ...current, tasks: current.tasks.map((item) => item.id === taskId ? { ...item, status: "concluída", result: baseResult } : item), employees: current.employees.map((employee) => employee.id === "ana" ? { ...employee, status: "disponível", currentTask: "Nenhuma cobrança vencida encontrada", tasksCompleted: employee.tasksCompleted + 1 } : employee), activities: [analyzedActivity, ...current.activities], financialCollectionEvents: [...analysisEvents, ...current.financialCollectionEvents] }));
          return;
        }
        try {
          const response = await fetch("/api/ana/collections/prepare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId, companyName: account.organization, accounts: overdue.slice(0, 20) }) });
          const payload = await response.json() as { data?: { actions: CollectionEmailAction[]; blocked: Array<{ accountIds: string[]; customerName: string; email?: string; reason: string }> }; error?: string };
          if (!response.ok || !payload.data) throw new Error(payload.error ?? "Não foi possível preparar as cobranças");
          const { actions, blocked } = payload.data;
          const blockedEvents = blocked.flatMap((item) => item.accountIds.flatMap((accountId) => {
            const financialAccount = overdue.find((account) => account.id === accountId);
            if (!financialAccount) return [];
            const assessment = assessments.find((candidate) => candidate.account.id === accountId);
            return [{ id: crypto.randomUUID(), accountId, customerName: financialAccount.customerName, document: financialAccount.document, eventType: "blocked" as const, title: "Cobrança bloqueada", description: `${item.reason}${item.email ? ` · ${item.email}` : ""}`, risk: assessment?.risk ?? "baixo" as const, priority: assessment?.priority ?? "baixa" as const, daysOverdue: assessment?.daysOverdue ?? 0, amount: financialAccount.amount, createdAt: new Date().toISOString() }];
          }));
          const approvals: Approval[] = actions.map((action) => {
            const relatedAssessments = assessments.filter((assessment) => action.accountIds.includes(assessment.account.id));
            const risk = relatedAssessments.some((item) => item.risk === "alto") ? "alto" as const : relatedAssessments.some((item) => item.risk === "médio") ? "médio" as const : "baixo" as const;
            return { id: action.approvalId, taskId, employeeId: "ana", title: `Enviar cobrança para ${action.customerName}`, description: `${action.accounts.length} título(s) serão enviados para ${action.to}.`, impact: `Recuperação potencial de ${action.totalAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}. O Gmail só será acionado após sua aprovação.`, risk, status: "pendente", amount: action.totalAmount, relatedAccountIds: action.accountIds, externalActionId: action.id, externalActionStatus: action.status, requestedAt: "Agora" };
          });
          const blockedText = blocked.length ? ` · ${blocked.length} bloqueada(s) por contato ou allowlist` : "";
          setState((current) => ({ ...current, approvals: [...approvals, ...current.approvals], tasks: current.tasks.map((item) => item.id === taskId ? { ...item, status: actions.length ? "aguardando aprovação" : "concluída", result: `${baseResult}${blockedText}` } : item), employees: current.employees.map((employee) => employee.id === "ana" ? { ...employee, status: actions.length ? "aguardando aprovação" : "disponível", currentTask: actions.length ? "Aguardando decisões sobre cobranças" : "Cobranças bloqueadas: revise os contatos" } : employee), activities: [{ id: crypto.randomUUID(), employeeId: "ana", taskId, title: actions.length ? "Cobranças aguardando aprovação" : "Nenhuma cobrança pôde ser preparada", description: `${actions.length} mensagem(ns) preparada(s)${blockedText}.${blocked.length ? ` ${blocked.map((item) => `${item.customerName}: ${item.reason}`).join("; ")}` : ""}`, type: actions.length ? "aprovação" : "ferramenta", createdAt: "Agora" }, analyzedActivity, ...current.activities], financialCollectionEvents: [...blockedEvents, ...analysisEvents, ...current.financialCollectionEvents] }));
          toast.success("Análise concluída", { description: actions.length ? "Revise os e-mails preparados pela Ana." : "Revise os contatos e a allowlist de envio." });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Falha ao preparar cobranças";
          setState((current) => ({ ...current, tasks: current.tasks.map((item) => item.id === taskId ? { ...item, status: "falhou", result: message } : item), employees: current.employees.map((employee) => employee.id === "ana" ? { ...employee, status: "com erro", currentTask: message } : employee), activities: [{ id: crypto.randomUUID(), employeeId: "ana", taskId, title: "Falha ao preparar cobranças", description: message, type: "ferramenta", createdAt: "Agora" }, analyzedActivity, ...current.activities], financialCollectionEvents: [...analysisEvents, ...current.financialCollectionEvents] }));
          toast.error("A análise não criou cobranças", { description: message });
        }
      })();
    }, 900);
    return true;
  }, [account.organization, state]);

  const processFinancialDocuments = useCallback(async (files: File[]) => {
    if (hasBackend) throw new Error("O upload local está disponível apenas no MVP sem Supabase");
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    const response = await fetch("/api/financial/documents", { method: "POST", body: formData });
    const payload = await response.json() as { documents?: ParsedFinancialDocument[]; error?: string };
    if (!response.ok || !payload.documents) throw new Error(payload.error ?? "Não foi possível processar os documentos");
    let summary = { processed: 0, duplicates: 0, reviews: 0 };
    setState((current) => {
      const organized = organizeFinancialDocuments({ parsed: payload.documents!, documents: current.financialDocuments, entries: current.financialEntries, now: new Date().toISOString(), createId: () => crypto.randomUUID() });
      summary = { processed: organized.createdDocuments.filter((document) => document.status === "processed").length, duplicates: organized.duplicates, reviews: organized.reviews };
      return { ...current, financialDocuments: organized.documents, financialEntries: organized.entries, anaAuditEvents: [organized.audit, ...current.anaAuditEvents], activities: [{ id: crypto.randomUUID(), employeeId: "ana", title: "Documentos financeiros organizados", description: `${payload.documents!.length} arquivo(s): ${summary.processed} processado(s), ${summary.duplicates} duplicidade(s) e ${summary.reviews} para revisão.`, type: "ferramenta", createdAt: "Agora" }, ...current.activities] };
    });
    toast.success("Ana terminou de organizar os documentos", { description: `${files.length} arquivo(s) analisado(s) sem armazenamento dos arquivos originais.` });
    return summary;
  }, []);

  const confirmFinancialDocument = useCallback((id: string, input: { direction: FinancialDirection; counterparty: string; amount: number; dueDate: string; category: string }) => {
    if (input.direction === "neutral" || !input.counterparty.trim() || input.amount <= 0 || !input.dueDate) return false;
    let confirmed = false;
    setState((current) => {
      const document = current.financialDocuments.find((item) => item.id === id);
      if (!document || document.status === "duplicate") return current;
      confirmed = true;
      const exists = current.financialEntries.some((entry) => entry.sourceDocumentIds.includes(id));
      const updatedDocument: FinancialDocument = { ...document, ...input, counterparty: input.counterparty.trim(), status: "processed", confidence: 1, notes: [] };
      const direction = input.direction === "payable" ? "payable" as const : "receivable" as const;
      const entry = exists ? null : { id: crypto.randomUUID(), direction, counterparty: input.counterparty.trim(), description: `${document.type === "invoice" ? "Nota fiscal" : document.type === "boleto" ? "Boleto" : "Documento"}${document.documentNumber ? ` ${document.documentNumber}` : ""}`, amount: input.amount, paidAmount: 0, dueDate: input.dueDate, status: input.dueDate < new Date().toISOString().slice(0, 10) ? "overdue" as const : "open" as const, category: input.category, sourceDocumentIds: [id], createdAt: new Date().toISOString() };
      return { ...current, financialDocuments: current.financialDocuments.map((item) => item.id === id ? updatedDocument : item), financialEntries: entry ? [entry, ...current.financialEntries] : current.financialEntries, anaAuditEvents: [{ id: crypto.randomUUID(), action: "Documento confirmado pelo gestor", reason: `${document.fileName} foi revisado e liberado para a operação financeira.`, dataUsed: [document.fileName, input.counterparty, input.category], autonomy: "aprovar", createdAt: new Date().toISOString() }, ...current.anaAuditEvents] };
    });
    if (confirmed) toast.success("Documento confirmado");
    return confirmed;
  }, []);

  const createFinancialHandoff = useCallback((input: { toDepartment: "Comercial" | "Compras" | "Atendimento"; title: string; context: string }) => {
    setState((current) => ({ ...current, financialHandoffs: [{ id: crypto.randomUUID(), fromEmployeeId: "ana", ...input, status: "created", createdAt: new Date().toISOString() }, ...current.financialHandoffs], anaAuditEvents: [{ id: crypto.randomUUID(), action: `Handoff para ${input.toDepartment}`, reason: input.context, dataUsed: [input.title], autonomy: "aprovar", createdAt: new Date().toISOString() }, ...current.anaAuditEvents], activities: [{ id: crypto.randomUUID(), employeeId: "ana", title: input.title, description: `Ana encaminhou o contexto ao setor ${input.toDepartment}.`, type: "colaboração", createdAt: "Agora" }, ...current.activities] }));
    toast.success(`Handoff criado para ${input.toDepartment}`);
  }, []);

  const setFinancialBudget = useCallback((category: string, limit: number) => {
    if (!category.trim() || limit <= 0) return;
    const period = new Date().toISOString().slice(0, 7);
    setState((current) => ({ ...current, financialBudgets: [{ id: crypto.randomUUID(), category: category.trim(), limit, period }, ...current.financialBudgets.filter((item) => !(item.category.toLocaleLowerCase("pt-BR") === category.trim().toLocaleLowerCase("pt-BR") && item.period === period))], anaAuditEvents: [{ id: crypto.randomUUID(), action: "Orçamento atualizado", reason: `Limite de ${limit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} definido para ${category}.`, dataUsed: [category, period], autonomy: "aprovar", createdAt: new Date().toISOString() }, ...current.anaAuditEvents] }));
    toast.success("Orçamento salvo");
  }, []);

  const createProcurementRequest = useCallback((input: ProcurementRequestInput) => {
    if (!input.title.trim() || !input.category.trim() || input.quantity <= 0 || input.budget <= 0 || !input.neededBy || !input.supplierIds.length) return null;
    const id = crypto.randomUUID();
    const request: ProcurementRequest = { id, ...input, title: input.title.trim(), category: input.category.trim(), project: input.project.trim() || "Geral", notes: input.notes.trim(), status: "quoting", createdAt: new Date().toISOString() };
    setState((current) => ({ ...current, procurementRequests: [request, ...current.procurementRequests], employees: current.employees.map((employee) => employee.id === "carlos" ? { ...employee, status: "trabalhando", currentTask: `Cotando ${request.title}` } : employee), activities: [{ id: crypto.randomUUID(), employeeId: "carlos", title: "Nova necessidade de compra", description: `${request.title} entrou para cotação no projeto ${request.project}.`, type: "tarefa", createdAt: "Agora" }, ...current.activities] }));
    toast.success("Necessidade enviada ao Carlos", { description: `${input.supplierIds.length} fornecedor(es) selecionado(s) para cotação.` });
    return id;
  }, []);

  const addSupplier = useCallback((input: Omit<SupplierContact, "id" | "createdAt" | "source">) => {
    const email = input.email.trim().toLowerCase();
    if (!input.name.trim() || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return false;
    if (state.suppliers.some((supplier) => supplier.email.toLowerCase() === email)) { toast.error("Este fornecedor já está cadastrado"); return false; }
    const supplier: SupplierContact = { ...input, name: input.name.trim(), email, taxId: input.taxId?.trim() || undefined, categories: input.categories.map((item) => item.trim()).filter(Boolean), notes: input.notes.trim(), id: crypto.randomUUID(), source: "manual", createdAt: new Date().toISOString() };
    setState((current) => ({ ...current, suppliers: [supplier, ...current.suppliers], activities: [{ id: crypto.randomUUID(), employeeId: "carlos", title: "Fornecedor cadastrado", description: `${supplier.name} foi adicionado à base de compras.`, type: "ferramenta", createdAt: "Agora" }, ...current.activities] }));
    toast.success("Fornecedor cadastrado"); return true;
  }, [state.suppliers]);

  const importSuppliers = useCallback((items: Array<Omit<SupplierContact, "id" | "createdAt" | "source">>) => {
    const result = { created: 0, duplicates: 0 };
    setState((current) => {
      const emails = new Set(current.suppliers.map((supplier) => supplier.email.toLowerCase()));
      const created: SupplierContact[] = [];
      for (const item of items) { const email = item.email.trim().toLowerCase(); if (emails.has(email)) { result.duplicates += 1; continue; } emails.add(email); created.push({ ...item, name: item.name.trim(), email, id: crypto.randomUUID(), source: "csv", createdAt: new Date().toISOString() }); }
      result.created = created.length;
      return { ...current, suppliers: [...created, ...current.suppliers], activities: created.length ? [{ id: crypto.randomUUID(), employeeId: "carlos", title: "Fornecedores importados", description: `${created.length} fornecedor(es) importado(s) por CSV; ${result.duplicates} duplicado(s) ignorado(s).`, type: "ferramenta", createdAt: "Agora" }, ...current.activities] : current.activities };
    });
    return result;
  }, []);

  const syncSupplierQuoteRequest = useCallback((action: SupplierQuoteRequestEmailAction) => {
    setState((current) => {
      const previous = current.approvals.find((approval) => approval.externalActionId === action.id);
      const approvals = current.approvals.map((approval) => approval.externalActionId === action.id ? { ...approval, status: action.status === "rejected" ? "recusada" as const : action.approvalStatus === "approved" ? "aprovada" as const : "pendente" as const, externalActionStatus: action.status, externalError: action.error, externalMessageId: action.externalMessageId, externalThreadId: action.externalThreadId, externalSentAt: action.sentAt } : approval);
      const related = approvals.filter((approval) => approval.relatedPurchaseRequestId === action.requestId && approval.externalActionKind === "supplier_quote_request");
      const sent = related.filter((approval) => approval.externalActionStatus === "sent").length; const rejected = related.filter((approval) => approval.externalActionStatus === "rejected").length; const failed = related.filter((approval) => approval.externalActionStatus === "failed").length; const active = related.filter((approval) => ["awaiting_approval", "sending"].includes(approval.externalActionStatus ?? "")).length;
      const done = related.length > 0 && !active && !failed; const taskStatus = failed ? "falhou" as const : done ? (sent ? "concluída" as const : "cancelada" as const) : "aguardando aprovação" as const;
      const requestStatus = done && sent ? "quotes_requested" as const : "requesting_quotes" as const;
      const recordActivity = previous?.externalActionStatus !== action.status && ["sent", "failed", "rejected"].includes(action.status);
      return { ...current, approvals, procurementRequests: current.procurementRequests.map((request) => request.id === action.requestId ? { ...request, status: requestStatus } : request), tasks: current.tasks.map((task) => task.id === action.taskId ? { ...task, status: taskStatus, result: `${sent} enviada(s) · ${rejected} recusada(s) · ${failed} com falha · ${active} pendente(s)` } : task), employees: current.employees.map((employee) => employee.id === "carlos" ? { ...employee, status: failed ? "com erro" as const : done ? "disponível" as const : "aguardando aprovação" as const, currentTask: failed ? "Solicitação precisa de nova tentativa" : done ? "Solicitações de cotação enviadas" : "Aguardando aprovação das cotações" } : employee), activities: recordActivity ? [{ id: crypto.randomUUID(), employeeId: "carlos", taskId: action.taskId, title: action.status === "sent" ? "Solicitação enviada ao fornecedor" : action.status === "failed" ? "Falha ao solicitar cotação" : "Solicitação recusada", description: action.status === "sent" ? `${action.supplierName} recebeu a solicitação. ID: ${action.externalMessageId}.` : action.error ?? `${action.supplierName} não receberá a solicitação.`, type: action.status === "failed" ? "ferramenta" : "aprovação", createdAt: "Agora" }, ...current.activities] : current.activities };
    });
  }, []);

  const supplierQuoteActionRequest = useCallback(async (actionId: string, endpoint: string) => {
    const response = await fetch(`/api/carlos/quote-requests/${actionId}${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actor: account.name }) });
    const payload = await response.json() as { data?: SupplierQuoteRequestEmailAction; error?: string }; if (payload.data) syncSupplierQuoteRequest(payload.data); if (!response.ok || !payload.data) throw new Error(payload.error ?? "Não foi possível processar a solicitação"); return payload.data;
  }, [account.name, syncSupplierQuoteRequest]);
  const saveSupplierQuoteRequestDraft = useCallback(async (actionId: string, input: { subject: string; body: string }) => { const response = await fetch(`/api/carlos/quote-requests/${actionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...input, actor: account.name }) }); const payload = await response.json() as { data?: SupplierQuoteRequestEmailAction; error?: string }; if (!response.ok || !payload.data) throw new Error(payload.error ?? "Não foi possível salvar o rascunho"); syncSupplierQuoteRequest(payload.data); toast.success("Rascunho salvo"); }, [account.name, syncSupplierQuoteRequest]);
  const approveSupplierQuoteRequest = useCallback(async (actionId: string) => { await supplierQuoteActionRequest(actionId, "/approve-and-send"); toast.success("Solicitação enviada pelo Gmail"); }, [supplierQuoteActionRequest]);
  const retrySupplierQuoteRequest = useCallback(async (actionId: string) => { await supplierQuoteActionRequest(actionId, "/retry"); toast.success("Solicitação enviada pelo Gmail"); }, [supplierQuoteActionRequest]);
  const rejectSupplierQuoteRequest = useCallback(async (actionId: string) => { await supplierQuoteActionRequest(actionId, "/reject"); toast.success("Solicitação recusada"); }, [supplierQuoteActionRequest]);

  const requestSupplierQuotes = useCallback(async (id: string) => {
    const request = state.procurementRequests.find((item) => item.id === id); if (!request || request.status !== "quoting") return false;
    const selected = state.suppliers.filter((supplier) => (request.supplierIds ?? []).includes(supplier.id)); if (!selected.length) { toast.error("Selecione pelo menos um fornecedor"); return false; }
    const taskId = crypto.randomUUID(); const task: Task = { id: taskId, employeeId: "carlos", title: `Solicitar cotações para ${request.title}`, description: `Preparar solicitações independentes para ${selected.length} fornecedor(es).`, priority: "alta", status: "executando", dueAt: "Agora", requiresApproval: true, createdAt: "Agora" };
    setState((current) => ({ ...current, tasks: [task, ...current.tasks], procurementRequests: current.procurementRequests.map((item) => item.id === id ? { ...item, status: "requesting_quotes" } : item), employees: current.employees.map((employee) => employee.id === "carlos" ? { ...employee, status: "trabalhando", currentTask: `Preparando cotações para ${request.title}` } : employee) }));
    try {
      const response = await fetch("/api/carlos/quote-requests/prepare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId, companyName: account.organization, request, suppliers: selected }) });
      const payload = await response.json() as { data?: { actions: SupplierQuoteRequestEmailAction[]; blocked: Array<{ supplierName: string; reason: string }> }; error?: string }; if (!response.ok || !payload.data) throw new Error(payload.error ?? "Não foi possível preparar as solicitações");
      const { actions, blocked } = payload.data; const approvals: Approval[] = actions.map((action) => ({ id: action.approvalId, taskId, employeeId: "carlos", title: `Solicitar cotação a ${action.supplierName}`, description: `Carlos preparou uma mensagem para ${action.to}.`, impact: `Consulta comercial para ${request.quantity} unidade(s) de ${request.title}. Não representa compromisso de compra.`, risk: "baixo", status: "pendente", relatedPurchaseRequestId: request.id, externalActionId: action.id, externalActionKind: "supplier_quote_request", externalActionStatus: action.status, requestedAt: "Agora" }));
      setState((current) => ({ ...current, approvals: [...approvals, ...current.approvals], procurementRequests: current.procurementRequests.map((item) => item.id === id ? { ...item, status: actions.length ? "requesting_quotes" : "quoting" } : item), tasks: current.tasks.map((item) => item.id === taskId ? { ...item, status: actions.length ? "aguardando aprovação" : "falhou", result: `${actions.length} preparada(s) · ${blocked.length} bloqueada(s)` } : item), employees: current.employees.map((employee) => employee.id === "carlos" ? { ...employee, status: actions.length ? "aguardando aprovação" : "com erro", currentTask: actions.length ? "Aguardando aprovação das solicitações" : "Fornecedores bloqueados pela allowlist" } : employee), activities: [{ id: crypto.randomUUID(), employeeId: "carlos", taskId, title: "Solicitações de cotação preparadas", description: `${actions.length} aguardam aprovação; ${blocked.length} foram bloqueadas.${blocked.length ? ` ${blocked.map((item) => `${item.supplierName}: ${item.reason}`).join("; ")}` : ""}`, type: actions.length ? "aprovação" : "ferramenta", createdAt: "Agora" }, ...current.activities] })); toast.success("Carlos preparou as solicitações", { description: "Revise cada e-mail em Aprovações." }); return true;
    } catch (error) { const message = error instanceof Error ? error.message : "Falha ao preparar cotações"; setState((current) => ({ ...current, procurementRequests: current.procurementRequests.map((item) => item.id === id ? { ...item, status: "quoting" } : item), tasks: current.tasks.map((item) => item.id === taskId ? { ...item, status: "falhou", result: message } : item), employees: current.employees.map((employee) => employee.id === "carlos" ? { ...employee, status: "com erro", currentTask: message } : employee) })); toast.error("Carlos não preparou as solicitações", { description: message }); return false; }
  }, [account.organization, state.procurementRequests, state.suppliers]);

  const addSupportCase = useCallback((input: Omit<SupportCase, "id" | "createdAt" | "source" | "status"> & { source?: SupportCase["source"] }) => {
    const email = input.customerEmail.trim().toLowerCase();
    if (!input.customerName.trim() || !input.subject.trim() || !input.message.trim() || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return false;
    if (input.gmailMessageId && state.supportCases.some((item) => item.gmailMessageId === input.gmailMessageId)) { toast.info("Este e-mail já virou atendimento"); return false; }
    const supportCase: SupportCase = { ...input, customerName: input.customerName.trim(), customerEmail: email, subject: input.subject.trim(), message: input.message.trim(), id: crypto.randomUUID(), source: input.source ?? "manual", status: "open", createdAt: new Date().toISOString() };
    setState((current) => ({ ...current, supportCases: [supportCase, ...current.supportCases], activities: [{ id: crypto.randomUUID(), employeeId: "sofia", title: "Atendimento recebido", description: `${supportCase.customerName}: ${supportCase.subject}`, type: "tarefa", createdAt: "Agora" }, ...current.activities] }));
    toast.success("Atendimento adicionado à Sofia"); return true;
  }, [state.supportCases]);

  const addSalesLead = useCallback((input: Omit<SalesLead, "id" | "createdAt" | "source" | "status" | "stage">) => {
    const email = input.email.trim().toLowerCase();
    if (!input.contactName.trim() || !input.companyName.trim() || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return false;
    if (state.salesLeads.some((item) => item.email.toLowerCase() === email)) { toast.error("Este lead já está cadastrado"); return false; }
    const lead: SalesLead = { ...input, contactName: input.contactName.trim(), companyName: input.companyName.trim(), email, context: input.context.trim(), id: crypto.randomUUID(), source: "manual", status: "active", stage: "novo", score: input.context.trim() ? 55 : 35, createdAt: new Date().toISOString() };
    setState((current) => ({ ...current, salesLeads: [lead, ...current.salesLeads], activities: [{ id: crypto.randomUUID(), employeeId: "lucas", title: "Novo lead cadastrado", description: `${lead.contactName} · ${lead.companyName}`, type: "tarefa", createdAt: "Agora" }, ...current.activities] }));
    toast.success("Lead adicionado ao funil"); return true;
  }, [state.salesLeads]);

  const importSalesLeads = useCallback((items: Array<{ contactName: string; companyName: string; email: string; context: string; estimatedValue?: number }>) => {
    const result = { created: 0, duplicates: 0 };
    setState((current) => { const emails = new Set(current.salesLeads.map((item) => item.email.toLowerCase())); const created: SalesLead[] = [];
      for (const item of items) { const email = item.email.trim().toLowerCase(); if (emails.has(email)) { result.duplicates += 1; continue; } emails.add(email); created.push({ ...item, contactName: item.contactName.trim(), companyName: item.companyName.trim(), email, context: item.context.trim(), id: crypto.randomUUID(), source: "csv", status: "active", stage: "novo", score: item.context.trim() ? 55 : 35, createdAt: new Date().toISOString() }); }
      result.created = created.length; return { ...current, salesLeads: [...created, ...current.salesLeads], activities: created.length ? [{ id: crypto.randomUUID(), employeeId: "lucas", title: "Leads importados", description: `${created.length} lead(s) importado(s); ${result.duplicates} duplicado(s) ignorado(s).`, type: "ferramenta", createdAt: "Agora" }, ...current.activities] : current.activities };
    }); return result;
  }, []);

  const updateSalesLeadStage = useCallback((id: string, stage: SalesLead["stage"]) => {
    setState((current) => ({ ...current, salesLeads: current.salesLeads.map((lead) => lead.id === id ? { ...lead, stage, status: ["ganho", "perdido"].includes(stage) ? "archived" : lead.status } : lead), activities: [{ id: crypto.randomUUID(), employeeId: "lucas", title: "Etapa do funil atualizada", description: `Oportunidade movida para ${stage}.`, type: "ferramenta", createdAt: "Agora" }, ...current.activities] }));
  }, []);

  const syncAgentOutbound = useCallback((action: AgentOutboundEmailAction) => {
    setState((current) => {
      const previous = current.approvals.find((approval) => approval.externalActionId === action.id);
      const approvals = current.approvals.map((approval) => approval.externalActionId === action.id ? { ...approval, status: action.status === "rejected" ? "recusada" as const : action.approvalStatus === "approved" ? "aprovada" as const : "pendente" as const, externalActionStatus: action.status, externalError: action.error, externalMessageId: action.externalMessageId, externalThreadId: action.externalThreadId, externalSentAt: action.sentAt } : approval);
      const terminal = ["sent", "rejected"].includes(action.status); const failed = action.status === "failed"; const record = previous?.externalActionStatus !== action.status && ["sent", "failed", "rejected"].includes(action.status);
      const employeeName = action.employeeId === "sofia" ? "Sofia" : "Lucas"; const sentTitle = action.kind === "support_reply" ? "Resposta enviada ao cliente" : "Follow-up enviado ao lead";
      return { ...current, approvals,
        supportCases: current.supportCases.map((item) => item.id === action.entityId ? { ...item, status: action.status === "sent" ? "replied" : action.status === "rejected" ? "open" : "awaiting_approval", repliedAt: action.sentAt, gmailThreadId: action.externalThreadId ?? item.gmailThreadId } : item),
        salesLeads: current.salesLeads.map((item) => item.id === action.entityId ? { ...item, status: action.status === "sent" ? "contacted" : action.status === "rejected" ? "active" : "awaiting_approval", lastContactAt: action.sentAt ?? item.lastContactAt } : item),
        tasks: current.tasks.map((task) => task.id === action.taskId ? { ...task, status: failed ? "falhou" : terminal ? (action.status === "sent" ? "concluída" : "cancelada") : "aguardando aprovação", result: action.status === "sent" ? `Gmail confirmou o envio · ID ${action.externalMessageId}` : action.error ?? `Ação ${action.status}` } : task),
        employees: current.employees.map((employee) => employee.id === action.employeeId ? { ...employee, status: failed ? "com erro" : terminal ? "disponível" : "aguardando aprovação", currentTask: failed ? "Envio precisa de nova tentativa" : terminal ? `${employeeName} concluiu a ação` : "Aguardando aprovação do envio", tasksCompleted: action.status === "sent" && previous?.externalActionStatus !== "sent" ? employee.tasksCompleted + 1 : employee.tasksCompleted } : employee),
        activities: record ? [{ id: crypto.randomUUID(), employeeId: action.employeeId, taskId: action.taskId, title: action.status === "sent" ? sentTitle : action.status === "failed" ? "Falha no envio pelo Gmail" : "Envio recusado", description: action.status === "sent" ? `${action.recipientName} recebeu a mensagem. ID: ${action.externalMessageId}.` : action.error ?? "O gestor recusou a mensagem.", type: action.status === "failed" ? "ferramenta" : "aprovação", createdAt: "Agora" }, ...current.activities] : current.activities };
    });
  }, []);

  const agentBase = (kind: AgentOutboundEmailAction["kind"]) => kind === "support_reply" ? "/api/sofia/replies" : "/api/lucas/follow-ups";
  const agentOutboundRequest = useCallback(async (actionId: string, kind: AgentOutboundEmailAction["kind"], endpoint: string) => { const response = await fetch(`${agentBase(kind)}/${actionId}${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actor: account.name }) }); const payload = await response.json() as { data?: AgentOutboundEmailAction; error?: string }; if (payload.data) syncAgentOutbound(payload.data); if (!response.ok || !payload.data) throw new Error(payload.error ?? "Não foi possível processar a mensagem"); return payload.data; }, [account.name, syncAgentOutbound]);
  const saveAgentOutboundDraft = useCallback(async (actionId: string, kind: AgentOutboundEmailAction["kind"], input: { subject: string; body: string }) => { const response = await fetch(`${agentBase(kind)}/${actionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...input, actor: account.name }) }); const payload = await response.json() as { data?: AgentOutboundEmailAction; error?: string }; if (!response.ok || !payload.data) throw new Error(payload.error ?? "Não foi possível salvar o rascunho"); syncAgentOutbound(payload.data); toast.success("Rascunho salvo"); }, [account.name, syncAgentOutbound]);
  const approveAgentOutbound = useCallback(async (id: string, kind: AgentOutboundEmailAction["kind"]) => { await agentOutboundRequest(id, kind, "/approve-and-send"); toast.success("Mensagem enviada pelo Gmail"); }, [agentOutboundRequest]);
  const rejectAgentOutbound = useCallback(async (id: string, kind: AgentOutboundEmailAction["kind"]) => { await agentOutboundRequest(id, kind, "/reject"); toast.success("Mensagem recusada"); }, [agentOutboundRequest]);
  const retryAgentOutbound = useCallback(async (id: string, kind: AgentOutboundEmailAction["kind"]) => { await agentOutboundRequest(id, kind, "/retry"); toast.success("Mensagem enviada pelo Gmail"); }, [agentOutboundRequest]);

  const prepareEmployeeEmail = useCallback(async (kind: AgentOutboundEmailAction["kind"], entity: SupportCase | SalesLead) => {
    const employeeId = kind === "support_reply" ? "sofia" : "lucas"; const title = kind === "support_reply" ? `Responder ${"customerName" in entity ? entity.customerName : "cliente"}` : `Follow-up com ${"contactName" in entity ? entity.contactName : "lead"}`;
    const taskId = crypto.randomUUID(); const task: Task = { id: taskId, employeeId, title, description: kind === "support_reply" ? "Preparar uma resposta segura e contextual para revisão humana." : "Preparar contato comercial relevante para revisão humana.", priority: kind === "support_reply" && "priority" in entity ? entity.priority : "média", status: "executando", dueAt: "Agora", requiresApproval: true, createdAt: "Agora" };
    setState((current) => ({ ...current, tasks: [task, ...current.tasks], employees: current.employees.map((employee) => employee.id === employeeId ? { ...employee, status: "trabalhando", currentTask: title } : employee) }));
    try { const response = await fetch(`${agentBase(kind)}/prepare`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId, companyName: account.organization, entity }) }); const payload = await response.json() as { data?: AgentOutboundEmailAction; error?: string }; if (!response.ok || !payload.data) throw new Error(payload.error ?? "Não foi possível preparar a mensagem"); const action = payload.data;
      const approval: Approval = { id: action.approvalId, taskId, employeeId, title: kind === "support_reply" ? `Responder atendimento de ${action.recipientName}` : `Enviar follow-up para ${action.recipientName}`, description: `${kind === "support_reply" ? "Sofia" : "Lucas"} preparou uma mensagem para ${action.to}.`, impact: kind === "support_reply" ? "Responder o cliente e registrar a evidência do atendimento." : "Retomar a oportunidade sem alterar preços, descontos ou condições comerciais.", risk: kind === "support_reply" && "priority" in entity && ["alta", "urgente"].includes(entity.priority) ? "médio" : "baixo", status: "pendente", externalActionId: action.id, externalActionKind: kind, externalActionStatus: action.status, requestedAt: "Agora" };
      setState((current) => ({ ...current, approvals: [approval, ...current.approvals], supportCases: current.supportCases.map((item) => item.id === action.entityId ? { ...item, status: "awaiting_approval" } : item), salesLeads: current.salesLeads.map((item) => item.id === action.entityId ? { ...item, status: "awaiting_approval" } : item), tasks: current.tasks.map((item) => item.id === taskId ? { ...item, status: "aguardando aprovação" } : item), employees: current.employees.map((employee) => employee.id === employeeId ? { ...employee, status: "aguardando aprovação", currentTask: "Aguardando aprovação da mensagem" } : employee), activities: [{ id: crypto.randomUUID(), employeeId, taskId, title: "Mensagem preparada", description: `${action.recipientName} · ${action.to}`, type: "aprovação", createdAt: "Agora" }, ...current.activities] })); toast.success("Mensagem pronta para revisar", { description: "Abra a Central de Aprovações." }); return true;
    } catch (error) { const message = error instanceof Error ? error.message : "Falha ao preparar mensagem"; setState((current) => ({ ...current, tasks: current.tasks.map((item) => item.id === taskId ? { ...item, status: "falhou", result: message } : item), employees: current.employees.map((employee) => employee.id === employeeId ? { ...employee, status: "com erro", currentTask: message } : employee) })); toast.error("Mensagem não preparada", { description: message }); return false; }
  }, [account.organization]);

  const prepareSupportReply = useCallback(async (id: string) => { const item = state.supportCases.find((candidate) => candidate.id === id); return item ? prepareEmployeeEmail("support_reply", item) : false; }, [prepareEmployeeEmail, state.supportCases]);
  const prepareSalesFollowup = useCallback(async (id: string) => { const item = state.salesLeads.find((candidate) => candidate.id === id); return item ? prepareEmployeeEmail("sales_followup", item) : false; }, [prepareEmployeeEmail, state.salesLeads]);

  const logoutLocal = useCallback(() => {
    clearLocalSession();
    router.replace("/login");
  }, [router]);

  const resetLocalMvp = useCallback(() => {
    clearLocalMvp();
    router.replace("/cadastro");
  }, [router]);

  const updateOrganization = useCallback(async (input: { name: string; industry: string }) => {
    const previous = account;
    setAccount((current) => ({ ...current, organization: input.name }));
    if (hasBackend) {
      const response = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      if (!response.ok) { setAccount(previous); throw new Error((await response.json()).error); }
      await refreshBackend();
    } else {
      const workspace = readLocalWorkspace();
      if (workspace) writeLocalWorkspace({ ...workspace, company: { ...workspace.company, ...input } });
    }
  }, [account, refreshBackend]);

  const value = useMemo(() => ({ ...state, account, backendEnabled: hasBackend, delegateTask, resolveApproval, saveCollectionDraft, approveCollection, rejectCollection, retryCollection, reconcileCollectionAction: syncCollectionAction, toggleIntegration, hireEmployee, setEmployeeStatus, updateOrganization, importFinancialAccounts, runAnaAnalysis, processFinancialDocuments, confirmFinancialDocument, createFinancialHandoff, setFinancialBudget, createProcurementRequest, addSupplier, importSuppliers, requestSupplierQuotes, saveSupplierQuoteRequestDraft, approveSupplierQuoteRequest, rejectSupplierQuoteRequest, retrySupplierQuoteRequest, reconcileSupplierQuoteRequest: syncSupplierQuoteRequest, addSupportCase, prepareSupportReply, addSalesLead, importSalesLeads, updateSalesLeadStage, prepareSalesFollowup, saveAgentOutboundDraft, approveAgentOutbound, rejectAgentOutbound, retryAgentOutbound, reconcileAgentOutbound: syncAgentOutbound, logoutLocal, resetLocalMvp }), [state, account, delegateTask, resolveApproval, saveCollectionDraft, approveCollection, rejectCollection, retryCollection, syncCollectionAction, toggleIntegration, hireEmployee, setEmployeeStatus, updateOrganization, importFinancialAccounts, runAnaAnalysis, processFinancialDocuments, confirmFinancialDocument, createFinancialHandoff, setFinancialBudget, createProcurementRequest, addSupplier, importSuppliers, requestSupplierQuotes, saveSupplierQuoteRequestDraft, approveSupplierQuoteRequest, rejectSupplierQuoteRequest, retrySupplierQuoteRequest, syncSupplierQuoteRequest, addSupportCase, prepareSupportReply, addSalesLead, importSalesLeads, updateSalesLeadStage, prepareSalesFollowup, saveAgentOutboundDraft, approveAgentOutbound, rejectAgentOutbound, retryAgentOutbound, syncAgentOutbound, logoutLocal, resetLocalMvp]);
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() { const context = useContext(DemoContext); if (!context) throw new Error("useDemo deve ser usado dentro de DemoProvider"); return context; }
