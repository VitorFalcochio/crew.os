"use client";
import Link from "next/link";
import { ArrowRight, Ban, ShieldCheck, Sparkles } from "lucide-react";
import { useDemo } from "@/features/demo/demo-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { buildCrewImpactSummary } from "@/features/crew/intelligence";
import { getAutonomyPolicyForEmployee } from "@/features/crew/autonomy";

const modeLabel: Record<"observe" | "approval_required" | "autonomous" | "blocked", string> = {
  observe: "Observador",
  approval_required: "Aprovação",
  autonomous: "Autônomo",
  blocked: "Bloqueado",
};

export default function AutonomyPage() {
  const { employees, tasks, approvals, activities, integrations } = useDemo();
  const hired = employees.filter((employee) => employee.hired);
  const impact = buildCrewImpactSummary({ employees, tasks, approvals, activities, integrations });

  return (
    <>
      <PageHeader
        eyebrow="Autonomia"
        title="Políticas e limites por funcionário"
        description="Cada funcionário tem uma política granular. A CrewOS mostra o que pode ser observado, executado, aprovado ou bloqueado."
      />

      <section className="autonomy-summary card">
        <div>
          <p className="eyebrow">Visão geral</p>
          <h2>{impact.pendingDecisions} decisões ainda aguardam você.</h2>
          <p className="subtitle">A política padrão protege ações sensíveis e libera apenas o que estiver dentro dos limites configurados.</p>
        </div>
        <div className="autonomy-summary-grid">
          <div className="compact-stat"><small>Autonomias</small><strong>4 níveis</strong></div>
          <div className="compact-stat"><small>Impacto</small><strong>{Math.round(impact.timeSavedMinutes / 60)}h</strong></div>
          <div className="compact-stat"><small>Proteção</small><strong>{impact.riskPrevented}</strong></div>
        </div>
      </section>

      <section className="autonomy-grid">
        {hired.map((employee) => {
          const policy = getAutonomyPolicyForEmployee(employee);
          return (
            <article className="card card-pad autonomy-card" key={employee.id}>
              <div className="autonomy-card-head">
                <div className="person-cell">
                  <Avatar initials={employee.initials} color={employee.color} size="lg" status={employee.status} />
                  <span>
                    <strong>{employee.name}</strong>
                    <small>
                      {employee.role} · {employee.department}
                    </small>
                  </span>
                </div>
                <Link href={`/equipe/${employee.id}`} className="button button-sm button-secondary">
                  Ver perfil
                  <ArrowRight size={14} />
                </Link>
              </div>

              <p className="subtitle">{policy.summary}</p>

              <div className="autonomy-rule-list">
                {policy.rules.map((rule) => (
                  <div className="autonomy-rule" key={rule.actionKey}>
                    <div>
                      <strong>{rule.label}</strong>
                      <small>{rule.rationale}</small>
                    </div>
                    <span className={`status-pill ${rule.mode === "autonomous" ? "success" : rule.mode === "approval_required" ? "warning" : rule.mode === "blocked" ? "danger" : "info"}`}>
                      <i />
                      {modeLabel[rule.mode]}
                    </span>
                    <div className="autonomy-limit-list">
                      {rule.limits.map((limit) => (
                        <span key={limit}>{limit}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </section>

      <section className="briefing-grid" style={{ marginTop: 14 }}>
        <article className="card card-pad">
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Regras que nunca devem ser quebradas</h2>
          </div>
          <div className="responsibility-list">
            <li>
              <ShieldCheck size={14} />
              Nenhuma ação sensível pode escapar da policy central.
            </li>
            <li>
              <Ban size={14} />
              Pagamentos, compras irreversíveis e publicações críticas permanecem protegidos.
            </li>
            <li>
              <Sparkles size={14} />
              Quando a ação estiver dentro do limite, a CrewOS executa sem atrito.
            </li>
          </div>
        </article>
        <article className="card card-pad">
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Como a CrewOS decide</h2>
          </div>
          <div className="responsibility-list">
            <li><Sparkles size={14} />Observa quando a ação é apenas leitura ou análise.</li>
            <li><ShieldCheck size={14} />Pede aprovação quando existe impacto externo.</li>
            <li><Ban size={14} />Bloqueia tudo que for irreversível ou sensível demais.</li>
          </div>
        </article>
      </section>
    </>
  );
}
