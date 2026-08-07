"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  Check,
  CornerDownLeft,
  Network,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/features/demo/demo-provider";
import { buildDirectorPlan, buildDirectorSnapshot, type DirectorPlan } from "@/features/crew/director";

const suggestions = [
  "Revise pagamentos e compras que precisam de decisão hoje",
  "Coordene Financeiro e Compras para reduzir custos deste mês",
  "Encontre tarefas paradas e distribua os próximos passos",
];

export default function DirectorPage() {
  const demo = useDemo();
  const { employees, tasks, approvals, activities, financialHandoffs, delegateTask } = demo;
  const [command, setCommand] = useState("");
  const [plan, setPlan] = useState<DirectorPlan | null>(null);
  const [distributed, setDistributed] = useState(false);
  const snapshot = useMemo(() => buildDirectorSnapshot({ employees, tasks, approvals, activities, financialHandoffs }), [employees, tasks, approvals, activities, financialHandoffs]);

  function preparePlan(event: FormEvent) {
    event.preventDefault();
    if (!command.trim()) return;
    setPlan(buildDirectorPlan(command, employees));
    setDistributed(false);
  }

  function distributePlan() {
    if (!plan || distributed) return;
    plan.assignments.forEach((assignment) => delegateTask({ employeeId: assignment.employee.id, title: assignment.title, description: assignment.description, priority: assignment.priority, requiresApproval: plan.requiresApproval }));
    setDistributed(true);
  }

  return (
    <div className="director-workspace">
      <PageHeader eyebrow="Orquestração da Crew" title="Diretor" description="Monitora a empresa, coordena especialistas e transforma objetivos em planos rastreáveis." />

      <section className="director-identity">
        <span><BrainCircuit size={25} /></span>
        <div><strong>Diretor Crew</strong><p>Visão geral da operação · coordenação ativa</p></div>
        <small><i /> Monitorando {snapshot.hired.length} funcionário(s)</small>
      </section>

      <section className="director-command">
        <div className="director-command-intro"><span><Sparkles size={16} /></span><div><strong>Qual objetivo a Crew deve executar?</strong><small>O Diretor divide o trabalho, escolhe especialistas e preserva aprovações.</small></div></div>
        <form onSubmit={preparePlan}><BrainCircuit size={18} /><input value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Ex.: revise o caixa e negocie os fornecedores mais caros..." /><button type="submit" disabled={!command.trim()} aria-label="Preparar plano"><CornerDownLeft size={16} /></button></form>
        <div className="director-suggestions">{suggestions.map((suggestion) => <button onClick={() => setCommand(suggestion)} key={suggestion}>{suggestion}</button>)}</div>
      </section>

      {plan && (
        <section className="director-plan">
          <header><div><span>Plano preparado</span><h2>{plan.assignments.length} frente(s) coordenada(s)</h2></div><button onClick={() => setPlan(null)} aria-label="Fechar plano"><X size={16} /></button></header>
          <div className="director-plan-list">
            {plan.assignments.map((assignment, index) => <article key={`${assignment.employee.id}-${index}`}><span>{index + 1}</span><Avatar initials={assignment.employee.initials} color={assignment.employee.color} size="md" /><div><strong>{assignment.employee.name} · {assignment.department}</strong><p>{assignment.description}</p><small>{assignment.reason}</small></div><em>{assignment.priority}</em></article>)}
          </div>
          {plan.unavailableDepartments.length > 0 && <div className="director-plan-warning"><AlertTriangle size={14} />Sem especialista ativo em: {plan.unavailableDepartments.join(", ")}.</div>}
          <footer><span>{plan.requiresApproval ? <><ShieldCheck size={14} /> Ações sensíveis continuarão aguardando sua aprovação.</> : <><Check size={14} /> Plano dentro da autonomia operacional.</>}</span><Button onClick={distributePlan} disabled={distributed || !plan.assignments.length}>{distributed ? <><Check size={14} />Trabalho distribuído</> : <><Network size={14} />Distribuir trabalho</>}</Button></footer>
        </section>
      )}

      <section className="director-metrics">
        <article><UsersRound size={16} /><span>Equipe ativa<strong>{snapshot.hired.length}</strong></span></article>
        <article><Zap size={16} /><span>Em execução<strong>{snapshot.activeTasks.length}</strong></span></article>
        <article><BadgeCheck size={16} /><span>Decisões pendentes<strong>{snapshot.pendingApprovals.length}</strong></span></article>
        <article><AlertTriangle size={16} /><span>Pontos de atenção<strong>{snapshot.priorities.length}</strong></span></article>
      </section>

      <div className="director-grid">
        <section className="director-section">
          <header><div><span>Monitoramento</span><h2>O que precisa de atenção</h2></div><small>{snapshot.priorities.length}</small></header>
          <div className="director-priorities">
            {snapshot.priorities.map((priority, index) => <Link href={priority.href} key={`${priority.type}-${index}`}><span className={priority.type}>{priority.type === "approval" ? <BadgeCheck size={14} /> : priority.type === "error" ? <AlertTriangle size={14} /> : <Network size={14} />}</span><div><strong>{priority.title}</strong><p>{priority.description}</p></div><ArrowRight size={14} /></Link>)}
            {!snapshot.priorities.length && <div className="director-clear"><Check size={18} /><strong>Operação sem bloqueios</strong><p>Nenhuma decisão, falha ou handoff exige atenção agora.</p></div>}
          </div>
        </section>

        <section className="director-section">
          <header><div><span>Coordenação</span><h2>Equipe sob supervisão</h2></div><Link href="/equipe">Abrir equipe <ArrowRight size={13} /></Link></header>
          <div className="director-team">
            {snapshot.hired.map((employee) => {
              const employeeTasks = tasks.filter((task) => task.employeeId === employee.id && !["concluída", "cancelada", "falhou"].includes(task.status));
              return <Link href={`/equipe/${employee.id}`} key={employee.id}><Avatar initials={employee.initials} color={employee.color} size="md" status={employee.status} /><div><strong>{employee.name}</strong><p>{employee.currentTask}</p></div><span>{employeeTasks.length} tarefa(s)</span></Link>;
            })}
          </div>
        </section>
      </div>

      <section className="director-activity">
        <header><div><span>Últimos movimentos</span><h2>Atividade coordenada</h2></div><Link href="/atividades">Ver histórico <ArrowRight size={13} /></Link></header>
        <div>{snapshot.recentActivities.map((activity) => { const employee = employees.find((item) => item.id === activity.employeeId); return <article key={activity.id}>{employee ? <Avatar initials={employee.initials} color={employee.color} size="sm" /> : <span className="director-system-dot"><BrainCircuit size={13} /></span>}<div><strong>{activity.title}</strong><p>{activity.description}</p></div><time>{activity.createdAt}</time></article>; })}</div>
      </section>
    </div>
  );
}
