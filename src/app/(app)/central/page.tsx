"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Bot,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Command,
  CornerDownLeft,
  Layers3,
  MoonStar,
  Plus,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
  BookOpen,
  ShieldCheck,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { useDemo } from "@/features/demo/demo-provider";
import { currency } from "@/lib/utils";
import type { Employee } from "@/types/domain";
import { buildCrewBriefing, buildCrewImpactSummary } from "@/features/crew/intelligence";

const quickDelegations = [
  "Resuma as prioridades de hoje",
  "Encontre oportunidades paradas",
  "Revise os pagamentos da semana",
];

const schedules = [
  { time: "10:30", label: "Follow-up de leads", owner: "Lucas", tone: "#f59e0b" },
  { time: "14:00", label: "Conciliação financeira", owner: "Ana", tone: "#a78bfa" },
  { time: "16:30", label: "Resumo do atendimento", owner: "Sofia", tone: "#22d3ee" },
];

function chooseEmployee(prompt: string, employees: Employee[]) {
  const normalized = prompt.toLocaleLowerCase("pt-BR");
  const departmentHints = [
    { words: ["pagamento", "finance", "conta", "cobran", "caixa"], department: "Financeiro" },
    { words: ["fornecedor", "compra", "cotação", "material"], department: "Compras" },
    { words: ["cliente", "mensagem", "atendimento", "suporte"], department: "Atendimento" },
    { words: ["lead", "venda", "comercial", "oportunidade"], department: "Comercial" },
    { words: ["conteúdo", "campanha", "marketing", "post"], department: "Marketing" },
  ];
  const match = departmentHints.find((hint) => hint.words.some((word) => normalized.includes(word)));
  return employees.find((employee) => employee.department === match?.department) ?? employees.find((employee) => employee.status === "disponível") ?? employees[0];
}

export default function CentralPage() {
  const { tasks, approvals, activities, employees, integrations, account, delegateTask, resolveApproval } = useDemo();
  const [command, setCommand] = useState("");
  const hired = employees.filter((employee) => employee.hired);
  const impact = buildCrewImpactSummary({ employees, tasks, approvals, activities, integrations });
  const briefing = buildCrewBriefing({ employees, tasks, approvals, activities, integrations });
  const pendingApprovals = approvals.filter((approval) => approval.status === "pendente");
  const activeTasks = tasks.filter((task) => ["executando", "planejando", "aguardando ferramenta"].includes(task.status));
  const completedTasks = impact.tasksExecuted;
  const activeEmployees = hired.filter((employee) => employee.status === "trabalhando").length;
  const today = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(new Date());

  const departments = (() => {
    const grouped = new Map<string, Employee[]>();
    hired.forEach((employee) => grouped.set(employee.department, [...(grouped.get(employee.department) ?? []), employee]));
    return Array.from(grouped.entries()).map(([name, members]) => ({
      name,
      members,
      performance: Math.round(members.reduce((total, member) => total + member.performance, 0) / members.length),
    }));
  })();

  function submitCommand(event: React.FormEvent) {
    event.preventDefault();
    const prompt = command.trim();
    if (!prompt) return;
    const employee = chooseEmployee(prompt, hired);
    if (!employee) return;
    delegateTask({ employeeId: employee.id, title: prompt.slice(0, 90), description: prompt, priority: "média", requiresApproval: true });
    setCommand("");
  }

  return <div className="crew-dashboard">
    <header className="crew-welcome">
      <div>
        <div className="crew-live"><i /> Central da Empresa <span>•</span> {account.organization}</div>
        <h1>Bom dia, {account.name.split(" ")[0]}.</h1>
        <p>Sua equipe digital já está em movimento. Aqui está o que merece sua atenção.</p>
      </div>
      <div className="crew-date"><CalendarDays size={15} /><span><small>Hoje</small>{today}</span></div>
    </header>

    <section className="crew-command-card">
      <div className="crew-command-intro"><span><Sparkles size={16} /></span><div><strong>O que sua equipe deve fazer?</strong><small>Descreva um objetivo. A CrewOS escolhe a pessoa certa e organiza o trabalho.</small></div></div>
      <form className="crew-command" onSubmit={submitCommand}>
        <Command size={17} />
        <input aria-label="Delegar uma tarefa para a equipe" value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Ex: verifique os clientes com pagamentos atrasados..." />
        <button type="submit" disabled={!command.trim()} aria-label="Enviar delegação"><CornerDownLeft size={16} /></button>
      </form>
      <div className="crew-suggestions"><span>Sugestões</span>{quickDelegations.map((suggestion) => <button key={suggestion} onClick={() => setCommand(suggestion)}>{suggestion}</button>)}</div>
    </section>

    <section className="crew-metric-strip">
      <article><span className="crew-metric-icon"><BadgeCheck size={17} /></span><div><small>Concluídas esta semana</small><strong>{completedTasks}</strong><em><TrendingUp size={11} /> +{Math.max(1, Math.round(completedTasks * 0.18))}%</em></div></article>
      <article><span className="crew-metric-icon"><Zap size={17} /></span><div><small>Em andamento</small><strong>{activeTasks.length}</strong><em>{activeEmployees} agentes ativos</em></div></article>
      <article><span className="crew-metric-icon"><Clock3 size={17} /></span><div><small>Tempo economizado</small><strong>{Math.round(impact.timeSavedMinutes / 60)}h</strong><em>{impact.timeSavedMinutes} min protegidos</em></div></article>
      <article><span className="crew-metric-icon"><CircleDollarSign size={17} /></span><div><small>Valor protegido</small><strong>{currency(impact.moneyRecoveredOrProtected)}</strong><em>{impact.pendingDecisions} decisões pendentes</em></div></article>
    </section>

    <section className="employee-grid">
      <article className="card card-pad">
        <div className="section-title" style={{ marginTop: 0 }}>
          <h2>Impacto da sua Crew</h2>
          <Link href="/briefing">Ver briefing</Link>
        </div>
        <div className="stat-row">
          <div className="compact-stat"><small>Protegido</small><strong>{currency(impact.moneyRecoveredOrProtected)}</strong></div>
          <div className="compact-stat"><small>Tempo</small><strong>{Math.round(impact.timeSavedMinutes / 60)}h</strong></div>
          <div className="compact-stat"><small>Tarefas</small><strong>{impact.tasksExecuted}</strong></div>
          <div className="compact-stat"><small>Riscos</small><strong>{impact.riskPrevented}</strong></div>
        </div>
        <div className="section-title"><h2>O que já está gerando resultado</h2></div>
        <div className="responsibility-list">
          <li><Check size={14} />{impact.pendingDecisions} decisões aguardam sua palavra.</li>
          <li><Check size={14} />{impact.issuesFound} pontos de atenção foram identificados.</li>
          <li><Check size={14} />{impact.riskPrevented} riscos já foram evitados ou contidos.</li>
        </div>
      </article>
      <article className="card card-pad">
        <div className="section-title" style={{ marginTop: 0 }}>
          <h2>Crew Briefing</h2>
          <Link href="/briefing">Abrir reunião</Link>
        </div>
        <p className="subtitle">{briefing.greeting}</p>
        <div className="responsibility-list">
          {briefing.speakers.slice(0, 3).map((speaker) => <li key={speaker.employeeId}><BookOpen size={14} />{speaker.name}: {speaker.message}</li>)}
        </div>
      </article>
      <article className="card card-pad">
        <div className="section-title" style={{ marginTop: 0 }}>
          <h2>Autonomia</h2>
          <Link href="/autonomia">Revisar políticas</Link>
        </div>
        <div className="responsibility-list">
          <li><ShieldCheck size={14} />Cobranças pequenas podem acontecer automaticamente.</li>
          <li><ShieldCheck size={14} />Cobranças acima do limite voltam para aprovação.</li>
          <li><ShieldCheck size={14} />Pagamentos continuam bloqueados por padrão.</li>
        </div>
      </article>
    </section>

    <section className="crew-primary-grid">
      <article className="crew-panel crew-team-panel">
        <div className="crew-panel-head"><div><span className="crew-kicker"><Bot size={13} /> Operação ao vivo</span><h2>Sua equipe agora</h2></div><Link href="/equipe">Ver equipe <ArrowRight size={13} /></Link></div>
        <div className="crew-agent-list">
          {hired.map((employee) => <Link href={`/equipe/${employee.id}`} className="crew-agent" key={employee.id}>
            <Avatar initials={employee.initials} color={employee.color} size="md" status={employee.status} />
            <div className="crew-agent-info"><strong>{employee.name}</strong><small>{employee.role}</small><p>{employee.currentTask}</p></div>
            <div className="crew-agent-performance"><span>{employee.performance}%</span><i><b style={{ width: `${employee.performance}%` }} /></i></div>
            <ChevronRight size={15} />
          </Link>)}
        </div>
        <Link href="/store" className="crew-add-agent"><Plus size={14} /> Adicionar funcionário digital</Link>
      </article>

      <aside className="crew-panel crew-attention-panel">
        <div className="crew-panel-head"><div><span className="crew-kicker warning"><MoonStar size={13} /> Sua decisão</span><h2>Precisa de você</h2></div><span className="crew-count">{pendingApprovals.length}</span></div>
        {pendingApprovals.length > 0 ? <div className="crew-approval-list">{pendingApprovals.slice(0, 3).map((approval) => {
          const employee = employees.find((item) => item.id === approval.employeeId);
          return <div className="crew-approval" key={approval.id}>
            <div className="crew-approval-meta">{employee && <Avatar initials={employee.initials} color={employee.color} size="sm" />}<span><strong>{employee?.name}</strong><small>{approval.requestedAt}</small></span></div>
            <h3>{approval.title}</h3><p>{approval.impact}</p>
            {approval.amount && <div className="crew-approval-value"><span>Valor envolvido</span><strong>{currency(approval.amount)}</strong></div>}
            <div className="crew-approval-actions"><Link href="/aprovacoes">Revisar</Link><button onClick={() => resolveApproval(approval.id, "aprovada")}><Check size={13} /> Aprovar</button></div>
          </div>;
        })}</div> : <div className="crew-clear-state"><BadgeCheck size={22} /><strong>Tudo em dia</strong><p>Nenhuma decisão aguardando você.</p></div>}
        <Link href="/aprovacoes" className="crew-panel-footer">Ver todas as aprovações <ArrowRight size={13} /></Link>
      </aside>
    </section>

    <section className="crew-secondary-grid">
      <article className="crew-panel crew-feed-panel">
        <div className="crew-panel-head"><div><span className="crew-kicker"><Activity size={13} /> Tempo real</span><h2>Fluxo de atividade</h2></div><Link href="/atividades">Histórico <ArrowRight size={13} /></Link></div>
        <div className="crew-feed">{activities.slice(0, 6).map((item) => {
          const employee = employees.find((candidate) => candidate.id === item.employeeId);
          return <div className="crew-feed-item" key={item.id}><span className={`crew-event-dot ${item.type}`} /><div>{employee && <strong>{employee.name}</strong>} <span>{item.title.toLocaleLowerCase("pt-BR")}</span><p>{item.description}</p></div><time>{item.createdAt}</time></div>;
        })}</div>
      </article>

      <article className="crew-panel crew-departments-panel">
        <div className="crew-panel-head"><div><span className="crew-kicker"><Layers3 size={13} /> Departamentos</span><h2>Performance da empresa</h2></div></div>
        <div className="crew-departments">{departments.map((department) => <div className="crew-department" key={department.name}><div><span>{department.name}</span><small>{department.members.length} {department.members.length === 1 ? "agente" : "agentes"}</small></div><i><b style={{ width: `${department.performance}%` }} /></i><strong>{department.performance}%</strong></div>)}</div>
        <div className="crew-company-score"><span><Users size={16} /></span><div><small>Eficiência geral</small><strong>{hired.length ? Math.round(hired.reduce((sum, employee) => sum + employee.performance, 0) / hired.length) : 0}%</strong></div><em>Excelente</em></div>
      </article>

      <article className="crew-panel crew-schedule-panel">
        <div className="crew-panel-head"><div><span className="crew-kicker"><CalendarDays size={13} /> Automático</span><h2>Próximas execuções</h2></div></div>
        <div className="crew-schedule">{schedules.map((schedule) => <div key={schedule.time + schedule.label}><time>{schedule.time}</time><i style={{ "--schedule-tone": schedule.tone } as React.CSSProperties} /><span><strong>{schedule.label}</strong><small>{schedule.owner}</small></span></div>)}</div>
        <Link href="/rotinas" className="crew-panel-footer">Gerenciar rotinas <ArrowRight size={13} /></Link>
      </article>
    </section>
  </div>;
}
