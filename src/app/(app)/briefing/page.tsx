"use client";

import Link from "next/link";
import { useMemo, type CSSProperties } from "react";
import { ArrowRight, CheckCircle2, Clock3, Play, Sparkles } from "lucide-react";
import { useDemo } from "@/features/demo/demo-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { buildCrewBriefing } from "@/features/crew/intelligence";

export default function BriefingPage() {
  const { employees, tasks, approvals, activities, integrations } = useDemo();
  const briefing = useMemo(() => buildCrewBriefing({ employees, tasks, approvals, activities, integrations }), [activities, approvals, employees, integrations, tasks]);

  return (
    <>
      <PageHeader
        eyebrow="Crew Briefing"
        title="Sua reunião executiva com a Crew"
        description="Um resumo semanal para entender o que aconteceu, o que importa agora e por onde começar."
        action={
          <Link href="/delegacoes">
            <Button>
              <Play size={15} />
              Começar minha semana
            </Button>
          </Link>
        }
      />

      <section className="briefing-stage card">
        <div className="briefing-stage-head">
          <div>
            <p className="eyebrow">Reunião em andamento</p>
            <h2>{briefing.greeting}</h2>
          </div>
          <div className="briefing-progress">
            {briefing.progress.map((step) => (
              <span key={step.label} className={step.done ? "done" : ""}>
                <i />
                {step.label}
              </span>
            ))}
          </div>
        </div>

        <div className="briefing-lineup">
          {briefing.speakers.map((speaker, index) => (
            <article className="briefing-speaker" key={speaker.employeeId} style={{ "--speaker-order": index } as CSSProperties}>
              <div className="briefing-speaker-head">
                <Avatar initials={speaker.name.split(" ").map((part) => part[0]).join("").slice(0, 2)} color="#8b5cf6" size="lg" status={speaker.status} />
                <div>
                  <span>{speaker.department}</span>
                  <h3>
                    {speaker.name} · {speaker.role}
                  </h3>
                </div>
              </div>
              <p>{speaker.message}</p>
              <ul>
                {speaker.metrics.map((metric) => (
                  <li key={metric}>
                    <CheckCircle2 size={13} />
                    {metric}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="briefing-grid">
        <article className="card card-pad">
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Prioridades recomendadas</h2>
          </div>
          <div className="briefing-priority-list">
            {briefing.priorities.map((priority, index) => (
              <Link href={priority.href} className="briefing-priority" key={priority.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{priority.title}</strong>
                  <small>{priority.description}</small>
                </div>
                <ArrowRight size={14} />
              </Link>
            ))}
          </div>
        </article>

        <article className="card card-pad">
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Como começar a semana</h2>
          </div>
          <div className="responsibility-list">
            <li>
              <Sparkles size={14} />
              Leia o que a Crew já identificou como oportunidade ou risco.
            </li>
            <li>
              <Clock3 size={14} />
              Abra as aprovações pendentes e libere o que for seguro.
            </li>
            <li>
              <CheckCircle2 size={14} />
              Delegue as prioridades para os funcionários certos.
            </li>
          </div>
        </article>
      </section>
    </>
  );
}
