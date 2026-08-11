"use client";

import { useMemo, useState } from "react";
import { Activity, Check, CircleAlert, Clock3, Sparkles, ShieldCheck } from "lucide-react";
import { useDemo } from "@/features/demo/demo-provider";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
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

  const filtered = filter === "todas" ? feed : feed.filter((item) => item.status === filter);

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
                return (
                  <article
                    key={item.id}
                    className="timeline-item activity-timeline-row"
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
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState title="Nenhuma atividade encontrada" description="Ainda não há registros para este filtro." />
          )}
        </article>
      </section>
    </>
  );
}
