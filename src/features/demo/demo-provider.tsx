"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { initialDemoState } from "./services/seed";
import { adaptBootstrap, type BootstrapPayload } from "./services/backend-adapter";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Activity, Approval, DemoState, EmployeeStatus, Priority, Task } from "@/types/domain";

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
}

const DemoContext = createContext<DemoContextValue | null>(null);
const STORAGE_KEY = "crewos-demo-v1";
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
      try { const value = window.localStorage.getItem(STORAGE_KEY); if (value) setState(JSON.parse(value) as DemoState); }
      catch { /* demo storage is optional */ }
      hydrated.current = true;
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [refreshBackend]);

  useEffect(() => {
    if (!hasBackend) return;
    const interval = window.setInterval(() => {
      void refreshBackend().catch(() => {
        /* polling best effort */
      });
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [refreshBackend]);

  useEffect(() => { if (!hasBackend && hydrated.current) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);

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
    setState((current) => ({ ...current, approvals: current.approvals.map((item) => item.id === id ? { ...item, status: resolution } : item) }));
    if (hasBackend) void fetch(`/api/approvals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: resolution === "ajuste solicitado" ? "ajuste_solicitado" : resolution }) }).then(async (response) => { if (!response.ok) throw new Error((await response.json()).error); await refreshBackend(); }).catch((error: Error) => { setState(previous); toast.error("A decisão não foi registrada", { description: error.message }); });
    else setState((current) => {
      const approval = current.approvals.find((item) => item.id === id); if (!approval) return current;
      const approved = resolution === "aprovada";
      return { ...current, tasks: current.tasks.map((task) => task.id === approval.taskId ? { ...task, status: approved ? "concluída" : resolution === "recusada" ? "cancelada" : "planejando" } : task), activities: [{ id: crypto.randomUUID(), employeeId: approval.employeeId, taskId: approval.taskId, title: approved ? "Ação aprovada e concluída" : resolution === "recusada" ? "Ação recusada" : "Ajuste solicitado", description: `O gestor definiu: ${resolution}.`, type: "aprovação", createdAt: "Agora" }, ...current.activities] };
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

  const updateOrganization = useCallback(async (input: { name: string; industry: string }) => {
    const previous = account;
    setAccount((current) => ({ ...current, organization: input.name }));
    if (hasBackend) {
      const response = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      if (!response.ok) { setAccount(previous); throw new Error((await response.json()).error); }
      await refreshBackend();
    }
  }, [account, refreshBackend]);

  const value = useMemo(() => ({ ...state, account, backendEnabled: hasBackend, delegateTask, resolveApproval, toggleIntegration, hireEmployee, setEmployeeStatus, updateOrganization }), [state, account, delegateTask, resolveApproval, toggleIntegration, hireEmployee, setEmployeeStatus, updateOrganization]);
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() { const context = useContext(DemoContext); if (!context) throw new Error("useDemo deve ser usado dentro de DemoProvider"); return context; }
