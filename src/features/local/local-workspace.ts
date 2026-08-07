import { employees, integrations } from "@/features/demo/services/seed";
import type { DemoState } from "@/types/domain";

export const LOCAL_ACCOUNT_KEY = "crewos-local-account-v1";
export const LOCAL_SESSION_KEY = "crewos-local-session-v1";
export const LOCAL_WORKSPACE_KEY = "crewos-local-workspace-v1";

export interface LocalAccount {
  name: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
}

export interface LocalCompany {
  name: string;
  industry: string;
  size: string;
  departments: string;
  difficulties: string;
}

export interface LocalWorkspace {
  version: 1;
  account: Pick<LocalAccount, "name" | "email">;
  company: LocalCompany;
  state: DemoState;
  createdAt: string;
  updatedAt: string;
}

function storageAvailable() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

async function hashPassword(password: string, salt: string) {
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createLocalAccount(input: { name: string; email: string; password: string }) {
  if (!storageAvailable()) throw new Error("Armazenamento local indisponível");
  const passwordSalt = crypto.randomUUID();
  const account: LocalAccount = {
    name: input.name.trim(),
    email: input.email.trim().toLocaleLowerCase("pt-BR"),
    passwordHash: await hashPassword(input.password, passwordSalt),
    passwordSalt,
    createdAt: new Date().toISOString(),
  };
  window.localStorage.setItem(LOCAL_ACCOUNT_KEY, JSON.stringify(account));
  window.localStorage.setItem(LOCAL_SESSION_KEY, account.email);
  return account;
}

export async function authenticateLocalAccount(email: string, password: string) {
  const account = readLocalAccount();
  if (!account) return false;
  const matches = account.email === email.trim().toLocaleLowerCase("pt-BR") && account.passwordHash === await hashPassword(password, account.passwordSalt);
  if (matches) window.localStorage.setItem(LOCAL_SESSION_KEY, account.email);
  return matches;
}

export function readLocalAccount(): LocalAccount | null {
  if (!storageAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_ACCOUNT_KEY);
    return raw ? JSON.parse(raw) as LocalAccount : null;
  } catch {
    return null;
  }
}

export function hasLocalSession() {
  if (!storageAvailable()) return false;
  const account = readLocalAccount();
  return Boolean(account && window.localStorage.getItem(LOCAL_SESSION_KEY) === account.email);
}

export function clearLocalSession() {
  if (storageAvailable()) window.localStorage.removeItem(LOCAL_SESSION_KEY);
}

export function clearLocalMvp() {
  if (!storageAvailable()) return;
  window.localStorage.removeItem(LOCAL_ACCOUNT_KEY);
  window.localStorage.removeItem(LOCAL_SESSION_KEY);
  window.localStorage.removeItem(LOCAL_WORKSPACE_KEY);
  window.localStorage.removeItem("crewos-company-settings");
  window.localStorage.removeItem("crewos-sidebar-collapsed");
}

export function createLocalWorkspace(company: LocalCompany, selectedEmployeeIds: string[]) {
  const account = readLocalAccount();
  if (!account) throw new Error("Crie sua conta local antes de configurar a empresa");
  const selected = new Set(selectedEmployeeIds);
  const now = new Date().toISOString();
  const state: DemoState = {
    employees: employees.map((employee) => ({
      ...employee,
      hired: selected.has(employee.id),
      status: selected.has(employee.id) ? "disponível" : "disponível",
      currentTask: selected.has(employee.id) ? "Pronta para receber a primeira tarefa" : "Ainda não contratada",
      tasksCompleted: 0,
      savings: 0,
      performance: 0,
      successRate: 0,
      averageTime: "—",
    })),
    tasks: [],
    approvals: [],
    activities: [{ id: crypto.randomUUID(), title: "Empresa criada no MVP local", description: `${company.name} iniciou um ambiente local de validação. Nenhuma ação externa será executada.`, type: "sistema", createdAt: "Agora" }],
    integrations: integrations.map((integration) => ({ ...integration, connected: false })),
    financialAccounts: [],
    financialCollectionEvents: [],
    financialDocuments: [],
    financialEntries: [],
    anaAuditEvents: [],
    financialHandoffs: [],
    financialBudgets: [],
  };
  const workspace: LocalWorkspace = {
    version: 1,
    account: { name: account.name, email: account.email },
    company,
    state,
    createdAt: now,
    updatedAt: now,
  };
  writeLocalWorkspace(workspace);
  return workspace;
}

export function readLocalWorkspace(): LocalWorkspace | null {
  if (!storageAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_WORKSPACE_KEY);
    const workspace = raw ? JSON.parse(raw) as LocalWorkspace : null;
    if (workspace?.version !== 1) return null;
    return { ...workspace, state: { ...workspace.state, financialAccounts: workspace.state.financialAccounts ?? [], financialCollectionEvents: workspace.state.financialCollectionEvents ?? [], financialDocuments: workspace.state.financialDocuments ?? [], financialEntries: workspace.state.financialEntries ?? [], anaAuditEvents: workspace.state.anaAuditEvents ?? [], financialHandoffs: workspace.state.financialHandoffs ?? [], financialBudgets: workspace.state.financialBudgets ?? [] } };
  } catch {
    return null;
  }
}

export function writeLocalWorkspace(workspace: LocalWorkspace) {
  if (!storageAvailable()) return;
  window.localStorage.setItem(LOCAL_WORKSPACE_KEY, JSON.stringify({ ...workspace, updatedAt: new Date().toISOString() }));
}

export function writeLocalState(state: DemoState) {
  const workspace = readLocalWorkspace();
  if (!workspace) return;
  writeLocalWorkspace({ ...workspace, state });
}
