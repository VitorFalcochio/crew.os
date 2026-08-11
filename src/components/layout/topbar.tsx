"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, Clock3, Plus, Search, UsersRound, X } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useDemo } from "@/features/demo/demo-provider";

export function Topbar() {
  const { employees, tasks, approvals, integrations, backendEnabled } = useDemo();
  const [panel, setPanel] = useState<"search" | "notifications" | null>(null);
  const [query, setQuery] = useState("");
  const pending = approvals.filter((approval) => approval.status === "pendente");
  const activeTasks = tasks.filter((task) => ["executando", "planejando", "aguardando aprovação"].includes(task.status));
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  const results = useMemo(() => normalized ? {
    employees: employees.filter((employee) => `${employee.name} ${employee.role} ${employee.department}`.toLocaleLowerCase("pt-BR").includes(normalized)).slice(0, 4),
    tasks: tasks.filter((task) => `${task.title} ${task.description}`.toLocaleLowerCase("pt-BR").includes(normalized)).slice(0, 4),
    integrations: integrations.filter((integration) => `${integration.name} ${integration.description}`.toLocaleLowerCase("pt-BR").includes(normalized)).slice(0, 3),
  } : null, [employees, integrations, normalized, tasks]);
  const resultCount = results ? results.employees.length + results.tasks.length + results.integrations.length : 0;
  const close = () => { setPanel(null); setQuery(""); };

  return <header className="topbar"><div className="mobile-brand"><Logo /></div><div className="topbar-actions" style={{ marginLeft: "auto" }}>
    {!backendEnabled && <span className="demo-mode-badge" title="Dados locais de validação; nenhuma ação externa será executada"><i />MVP local · simulado</span>}
    <span className="topbar-theme-toggle"><ThemeToggle compact /></span>
    <button className={`icon-button ${panel === "search" ? "active" : ""}`} aria-label="Pesquisar" aria-expanded={panel === "search"} onClick={() => setPanel((current) => current === "search" ? null : "search")}><Search size={17} /></button>
    <button className={`icon-button notification-button ${panel === "notifications" ? "active" : ""}`} aria-label="Notificações" aria-expanded={panel === "notifications"} onClick={() => setPanel((current) => current === "notifications" ? null : "notifications")}><Bell size={17} />{pending.length > 0 && <i>{pending.length}</i>}</button>
    <Link href="/delegacoes?nova=1"><Button><Plus size={15} /><span>Nova delegação</span></Button></Link>
  </div>

    {panel === "search" && <div className="topbar-popover search-popover"><div className="popover-search"><Search size={15} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar pessoas, tarefas ou integrações..." aria-label="Busca global" /><button onClick={close} aria-label="Fechar busca"><X size={14} /></button></div>{!normalized ? <div className="popover-empty"><Search size={20} /><p>Digite para buscar em toda a empresa.</p></div> : resultCount === 0 ? <div className="popover-empty"><p>Nenhum resultado para “{query}”.</p></div> : <div className="search-results">
      {results?.employees.map((employee) => <Link href={`/equipe/${employee.id}`} onClick={close} key={employee.id}><Avatar initials={employee.initials} color={employee.color} size="sm" /><span><strong>{employee.name}</strong><small>{employee.role}</small></span></Link>)}
      {results?.tasks.map((task) => <Link href="/delegacoes" onClick={close} key={task.id}><Clock3 size={14} /><span><strong>{task.title}</strong><small>{task.status}</small></span></Link>)}
      {results?.integrations.map((integration) => <Link href="/configuracoes?tab=integracoes" onClick={close} key={integration.id}><span className="search-result-mark">{integration.initials}</span><span><strong>{integration.name}</strong><small>{integration.connected ? "Conectada" : "Disponível"}</small></span></Link>)}
    </div>}</div>}

    {panel === "notifications" && <div className="topbar-popover notification-popover"><div className="popover-head"><div><strong>Notificações</strong><small>{pending.length + activeTasks.length} atualizações importantes</small></div><button onClick={close} aria-label="Fechar notificações"><X size={14} /></button></div><div className="notification-list">
      {pending.map((approval) => <Link href="/aprovacoes" onClick={close} key={approval.id}><span className="notification-icon warning"><Bell size={14} /></span><div><strong>{approval.title}</strong><p>Aguardando sua decisão · {approval.requestedAt}</p></div></Link>)}
      {activeTasks.slice(0, 4).map((task) => <Link href="/delegacoes" onClick={close} key={task.id}><span className="notification-icon"><Clock3 size={14} /></span><div><strong>{task.title}</strong><p>{task.status} · {task.dueAt}</p></div></Link>)}
      {!pending.length && !activeTasks.length && <div className="popover-empty"><CheckCircle2 size={21} /><p>Você está em dia.</p></div>}
    </div><Link href="/atividades" onClick={close} className="popover-footer"><UsersRound size={13} /> Ver toda atividade</Link></div>}
  </header>;
}
