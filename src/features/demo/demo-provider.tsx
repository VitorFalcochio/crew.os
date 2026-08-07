"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { initialDemoState } from "./services/seed";
import { adaptBootstrap, type BootstrapPayload } from "./services/backend-adapter";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { clearLocalMvp, clearLocalSession, hasLocalSession, readLocalAccount, readLocalWorkspace, writeLocalState, writeLocalWorkspace } from "@/features/local/local-workspace";
import { analyzeLocalReceivables } from "@/features/local/local-finance";
import type { Activity, Approval, DemoState, EmployeeStatus, FinancialAccount, Priority, Task } from "@/types/domain";

interface DelegateInput { employeeId: string; title: string; description: string; priority: Priority; requiresApproval: boolean }
interface Account { name: string; organization: string; email?: string; role: string }
interface DemoContextValue extends DemoState {
  account: Account;
  backendEnabled: boolean;
  delegateTask: (input: DelegateInput) => Task;
  resolveApproval: (id: string, resolution: Approval["status"]) => void;
  toggleIntegration: (id: string) => void;
  hireEmployee: (id: string) => boolean;
  setEmployeeStatus: (id: string, status: EmployeeStatus) => void;
  updateOrganization: (input: { name: string; industry: string }) => Promise<void>;
  importFinancialAccounts: (accounts: Array<Omit<FinancialAccount, "id" | "createdAt">>) => number;
  runAnaAnalysis: () => boolean;
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
    if (hasBackend) {
      setState((current) => ({ ...current, approvals: current.approvals.map((item) => item.id === id ? { ...item, status: resolution } : item) }));
      void fetch(`/api/approvals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: resolution === "ajuste solicitado" ? "ajuste_solicitado" : resolution }) }).then(async (response) => { if (!response.ok) throw new Error((await response.json()).error); await refreshBackend(); }).catch((error: Error) => { setState(previous); toast.error("A decisão não foi registrada", { description: error.message }); });
    } else setState((current) => {
      const approval = current.approvals.find((item) => item.id === id); if (!approval) return current;
      const approved = resolution === "aprovada";
      const title = approved ? "Cobrança simulada autorizada" : resolution === "recusada" ? "Ação recusada" : "Ajuste solicitado";
      const description = approved ? "A decisão foi registrada. Nenhuma mensagem externa foi enviada neste MVP local." : `O gestor definiu: ${resolution}.`;
      return { ...current, approvals: current.approvals.map((item) => item.id === id ? { ...item, status: resolution } : item), tasks: current.tasks.map((task) => task.id === approval.taskId ? { ...task, status: approved ? "concluída" : "cancelada", result: description } : task), employees: current.employees.map((employee) => employee.id === approval.employeeId ? { ...employee, status: "disponível", currentTask: approved ? "Cobrança simulada registrada" : "Aguardando nova orientação", tasksCompleted: approved ? employee.tasksCompleted + 1 : employee.tasksCompleted } : employee), activities: [{ id: crypto.randomUUID(), employeeId: approval.employeeId, taskId: approval.taskId, title, description, type: "aprovação", createdAt: "Agora" }, ...current.activities] };
    });
    toast.success(resolution === "aprovada" ? "Ação aprovada" : resolution === "recusada" ? "Ação recusada" : "Ajuste solicitado");
  }, [refreshBackend, state]);

  const toggleIntegration = useCallback((id: string) => {
    let connected = false; let name = "Integração";
    setState((current) => ({ ...current, integrations: current.integrations.map((item) => { if (item.id !== id) return item; connected = !item.connected; name = item.name; return { ...item, connected }; }) }));
    toast.success(connected ? `${name} conectada` : `${name} desconectada`);
  }, []);
  const hireEmployee = useCallback((id: string) => {
    let hired = false;
    setState((current) => { if (current.employees.filter((employee) => employee.hired).length >= 6) return current; hired = true; return { ...current, employees: current.employees.map((employee) => employee.id === id ? { ...employee, hired: true, status: "configurando", currentTask: "Preparando espaço de trabalho" } : employee) }; });
    toast.success(hired ? "Funcionário adicionado à equipe" : "Limite do plano atingido"); return hired;
  }, []);

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

  const runAnaAnalysis = useCallback(() => {
    if (hasBackend) return false;
    const ana = state.employees.find((employee) => employee.id === "ana" && employee.hired);
    if (!ana) { toast.error("Ana não está na equipe"); return false; }
    if (state.tasks.some((task) => task.employeeId === "ana" && ["planejando", "executando", "aguardando aprovação"].includes(task.status))) {
      toast.error("Ana já possui uma análise em andamento");
      return false;
    }
    if (!state.financialAccounts.length) { toast.error("Importe pelo menos uma conta a receber"); return false; }

    const taskId = crypto.randomUUID();
    const task: Task = { id: taskId, employeeId: "ana", title: "Analisar contas a receber", description: "Classificar recebíveis, identificar atrasos e preparar cobranças simuladas.", priority: "alta", status: "executando", dueAt: "Agora", requiresApproval: true, createdAt: "Agora" };
    setState((current) => ({ ...current, tasks: [task, ...current.tasks], employees: current.employees.map((employee) => employee.id === "ana" ? { ...employee, status: "trabalhando", currentTask: "Analisando contas a receber..." } : employee), activities: [{ id: crypto.randomUUID(), employeeId: "ana", taskId, title: "Ana começou a análise", description: `${current.financialAccounts.length} recebível(is) entraram na análise local.`, type: "tarefa", createdAt: "Agora" }, ...current.activities] }));
    toast.success("Ana começou a trabalhar", { description: "A análise local será concluída em alguns instantes." });

    window.setTimeout(() => {
      setState((current) => {
        const today = new Date().toISOString().slice(0, 10);
        const analysis = analyzeLocalReceivables(current.financialAccounts, today);
        const { overdue, overdueTotal: total, analyzed } = analysis;
        const result = `${analyzed} conta(s) analisada(s) · ${overdue.length} vencida(s) · R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em cobrança potencial`;
        const analyzedActivity: Activity = { id: crypto.randomUUID(), employeeId: "ana", taskId, title: "Contas analisadas", description: result, type: "ferramenta", createdAt: "Agora" };

        if (!overdue.length) {
          return { ...current, tasks: current.tasks.map((item) => item.id === taskId ? { ...item, status: "concluída", result } : item), employees: current.employees.map((employee) => employee.id === "ana" ? { ...employee, status: "disponível", currentTask: "Nenhuma cobrança vencida encontrada", tasksCompleted: employee.tasksCompleted + 1 } : employee), activities: [analyzedActivity, ...current.activities] };
        }

        const approval: Approval = { id: crypto.randomUUID(), taskId, employeeId: "ana", title: `Autorizar ${overdue.length} cobrança(s) simulada(s)`, description: `Ana preparou uma cobrança para: ${overdue.map((item) => `${item.customerName} (${item.document})`).join(", ")}.`, impact: `Recuperação potencial de R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. O MVP não fará envio externo.`, risk: total > 500 ? "médio" : "baixo", status: "pendente", amount: total, requestedAt: "Agora" };
        const approvalActivity: Activity = { id: crypto.randomUUID(), employeeId: "ana", taskId, title: "Cobranças aguardando aprovação", description: `${overdue.length} cobrança(s) simulada(s) precisam da sua decisão.`, type: "aprovação", createdAt: "Agora" };
        return { ...current, approvals: [approval, ...current.approvals], tasks: current.tasks.map((item) => item.id === taskId ? { ...item, status: "aguardando aprovação", result } : item), employees: current.employees.map((employee) => employee.id === "ana" ? { ...employee, status: "aguardando aprovação", currentTask: "Aguardando decisão sobre cobranças" } : employee), activities: [approvalActivity, analyzedActivity, ...current.activities] };
      });
      toast.success("Análise concluída", { description: "Revise a decisão preparada pela Ana." });
    }, 900);
    return true;
  }, [state]);

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

  const value = useMemo(() => ({ ...state, account, backendEnabled: hasBackend, delegateTask, resolveApproval, toggleIntegration, hireEmployee, setEmployeeStatus, updateOrganization, importFinancialAccounts, runAnaAnalysis, logoutLocal, resetLocalMvp }), [state, account, delegateTask, resolveApproval, toggleIntegration, hireEmployee, setEmployeeStatus, updateOrganization, importFinancialAccounts, runAnaAnalysis, logoutLocal, resetLocalMvp]);
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() { const context = useContext(DemoContext); if (!context) throw new Error("useDemo deve ser usado dentro de DemoProvider"); return context; }
