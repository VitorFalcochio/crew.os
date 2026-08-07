"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, Check, CircleAlert, Clock3, Sparkles, ShieldCheck } from "lucide-react";
import { useDemo } from "@/features/demo/demo-provider";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { buildCrewActivities } from "@/features/crew/intelligence";

type ActivityFilter = "todas" | "working" | "waiting_approval" | "completed" | "attention" | "error" | "idle";

const filters: { value: ActivityFilter; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "working", label: "Trabalhando" },
  { value: "waiting_approval", label: "Aguardando aprovação" },
  { value: "completed", label: "Concluídas" },
  { value: "attention", label: "Atenção" },
  { value: "error", label: "Erro" },
];

const statusLabel: Record<ActivityFilter, string> = {
  todas: "Todos",
  working: "Trabalhando",
  waiting_approval: "Aguardando aprovação",
  completed: "Concluída",
  attention: "Atenção",
  error: "Erro",
  idle: "Ocioso",
};

export default function ActivitiesPage() {
  const { employees, tasks, approvals, activities, integrations } = useDemo();
  const feed = useMemo(() => buildCrewActivities({ employees, tasks, approvals, activities, integrations }), [activities, approvals, employees, integrations, tasks]);
  const [filter, setFilter] = useState<ActivityFilter>("todas");
  const [selectedId, setSelectedId] = useState<string | null>(feed[0]?.id ?? null);

  const filtered = filter === "todas" ? feed : feed.filter((item) => item.status === filter);
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  return (
    <>
      <PageHeader
        eyebrow="Atividades"
        title="Tudo o que sua equipe realizou"
        description="Uma trilha completa e rastreável de tarefas, ferramentas, decisões e colaboração."
      />

      <div className="filters">
        {filters.map((item) => (
          <button key={item.value} className={`filter ${filter === item.value ? "active" : ""}`} onClick={() => setFilter(item.value)}>
            {item.label} · {item.value === "todas" ? feed.length : feed.filter((activity) => activity.status === item.value).length}
          </button>
        ))}
      </div>

      <section className="activity-workbench">
        <article className="card activity-feed-card">
          {filtered.length ? (
            <div className="timeline">
              {filtered.map((item) => {
                const employee = employees.find((candidate) => candidate.id === item.employeeId);
                const active = selected?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`timeline-item timeline-button ${active ? "selected" : ""}`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <span className="timeline-dot">
                      {item.status === "waiting_approval" ? <CircleAlert size={14} /> : item.status === "completed" ? <Check size={14} /> : item.status === "attention" ? <ShieldCheck size={14} /> : item.status === "error" ? <Activity size={14} /> : item.status === "working" ? <Sparkles size={14} /> : <Clock3 size={14} />}
                    </span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>
                        {employee?.name && `${employee.name} · `}
                        {item.description}
                      </p>
                    </div>
                    <div className="timeline-meta">
                      <strong>{statusLabel[item.status]}</strong>
                      <time>{item.timeLabel}</time>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState title="Nenhuma atividade encontrada" description="Ainda não há registros para este filtro." />
          )}
        </article>

        <aside className="card activity-detail-card">
          {selected ? (
            <>
              <div className="activity-detail-head">
                <div className="person-cell">
                  <Avatar initials={selected.employeeName.split(" ").map((part) => part[0]).join("").slice(0, 2)} color="#8b5cf6" size="lg" />
                  <span>
                    <strong>{selected.employeeName}</strong>
                    <small>
                      {selected.role} · {selected.department}
                    </small>
                  </span>
                </div>
                <span className={`status-pill ${selected.status === "completed" ? "success" : selected.status === "waiting_approval" ? "warning" : selected.status === "error" ? "danger" : "info"}`}>
                  <i />
                  {statusLabel[selected.status]}
                </span>
              </div>

              <div className="activity-detail-body">
                <div className="detail-box">
                  <small>O que aconteceu</small>
                  <p>{selected.whatHappened}</p>
                </div>
                <div className="detail-box">
                  <small>Por que isso aconteceu</small>
                  <p>{selected.why}</p>
                </div>
                <div className="detail-box">
                  <small>Dados utilizados</small>
                  <p>{selected.dataUsed.join(" · ")}</p>
                </div>
                <div className="detail-box">
                  <small>Regra de autonomia</small>
                  <p>{selected.autonomyRule}</p>
                </div>
                <div className="detail-box">
                  <small>Resultado</small>
                  <p>{selected.result}</p>
                </div>
                <div className="detail-box">
                  <small>Próxima ação</small>
                  <p>{selected.nextAction}</p>
                </div>
              </div>

              <div className="activity-impact">
                <div><small>Valor</small><strong>{selected.impact.moneySaved ? `R$ ${selected.impact.moneySaved.toLocaleString("pt-BR")}` : "—"}</strong></div>
                <div><small>Tempo</small><strong>{selected.impact.timeSavedMinutes ? `${Math.round(selected.impact.timeSavedMinutes / 60)}h` : "—"}</strong></div>
                <div><small>Risco</small><strong>{selected.impact.riskPrevented}</strong></div>
              </div>

              <div className="activity-detail-actions">
                <Link href="/aprovacoes" className="button button-md button-primary">
                  Ver aprovações
                  <ArrowRight size={14} />
                </Link>
                <Link href="/briefing" className="button button-md button-secondary">
                  Crew Briefing
                </Link>
              </div>
            </>
          ) : (
            <EmptyState title="Selecione uma atividade" description="Clique em um item da linha do tempo para ver o detalhe completo." />
          )}
        </aside>
      </section>
    </>
  );
}
