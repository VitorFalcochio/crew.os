"use client";

import { useState } from "react";
import { Check, MessageSquareText, ShieldAlert, X } from "lucide-react";
import { useDemo } from "@/features/demo/demo-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { currency } from "@/lib/utils";

type ApprovalFilter = "pendentes" | "resolvidas" | "impacto";

export default function ApprovalsPage() {
  const { approvals, employees, resolveApproval } = useDemo();
  const [filter, setFilter] = useState<ApprovalFilter>("pendentes");
  const pending = approvals.filter((approval) => approval.status === "pendente");
  const resolved = approvals.filter((approval) => approval.status !== "pendente");
  const displayed =
    filter === "resolvidas"
      ? resolved
      : filter === "impacto"
        ? [...pending].sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
        : pending;

  return (
    <>
      <PageHeader
        eyebrow="Governança"
        title="Aprovações"
        description="Tudo que precisa da sua decisão, com o contexto usado pela sua equipe."
      />

      <div className="approval-filters" aria-label="Filtrar aprovações">
        <button
          className={filter === "pendentes" ? "active" : ""}
          onClick={() => setFilter("pendentes")}
        >
          Pendentes <span>{pending.length}</span>
        </button>
        <button
          className={filter === "resolvidas" ? "active" : ""}
          onClick={() => setFilter("resolvidas")}
        >
          Resolvidas <span>{resolved.length}</span>
        </button>
        <button
          className={filter === "impacto" ? "active" : ""}
          onClick={() => setFilter("impacto")}
        >
          Maior impacto
        </button>
      </div>

      {displayed.length === 0 ? (
        <section className="approval-empty">
          <EmptyState
            title={
              filter === "resolvidas" ? "Nenhuma decisão resolvida" : "Tudo em dia"
            }
            description={
              filter === "resolvidas"
                ? "As decisões concluídas aparecerão aqui."
                : "Nenhuma decisão está aguardando sua aprovação."
            }
          />
        </section>
      ) : (
        <section className="approval-list">
          {displayed.map((approval) => {
            const employee = employees.find(
              (item) => item.id === approval.employeeId,
            )!;

            return (
              <article className="approval-decision" key={approval.id}>
                <header className="approval-requester">
                  <Avatar
                    initials={employee.initials}
                    color={employee.color}
                    size="md"
                  />
                  <div>
                    <strong>{employee.name}</strong>
                    <span>{employee.department}</span>
                  </div>
                  <small>{approval.requestedAt}</small>
                </header>

                <div className="approval-decision-layout">
                  <div className="approval-context">
                    <div className="approval-title-row">
                      <h2>{approval.title}</h2>
                      {approval.amount && (
                        <strong>{currency(approval.amount)}</strong>
                      )}
                    </div>

                    <div className="approval-details">
                      <div>
                        <span>Motivo</span>
                        <p>{approval.description}</p>
                      </div>
                      <div>
                        <span>Impacto</span>
                        <p>{approval.impact}</p>
                      </div>
                      <div>
                        <span>Dados utilizados</span>
                        <p className="approval-data-used">
                          <span>Tarefa {approval.taskId}</span>
                          <span>Solicitado {approval.requestedAt.toLowerCase()}</span>
                          <span>
                            <ShieldAlert size={13} /> Risco {approval.risk}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <aside className="approval-actions">
                    {approval.status === "pendente" ? (
                      <>
                        <Button
                          onClick={() => resolveApproval(approval.id, "aprovada")}
                        >
                          <Check size={15} /> Aprovar
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() =>
                            resolveApproval(approval.id, "ajuste solicitado")
                          }
                        >
                          <MessageSquareText size={15} /> Editar
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => resolveApproval(approval.id, "recusada")}
                        >
                          <X size={15} /> Recusar
                        </Button>
                      </>
                    ) : (
                      <div className="approval-resolution">
                        <span>Decisão registrada</span>
                        <StatusPill status={approval.status} />
                      </div>
                    )}
                  </aside>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}
