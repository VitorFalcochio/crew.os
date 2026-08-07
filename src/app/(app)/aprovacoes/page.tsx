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
  const displayed = filter === "resolvidas" ? resolved : filter === "impacto" ? [...pending].sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0)) : pending;
  return <><PageHeader eyebrow="Aprovações" title="Decisões sob seu controle" description="Sua equipe prepara o trabalho. Você mantém a palavra final sobre ações sensíveis." />
    <div className="filters"><button className={`filter ${filter === "pendentes" ? "active" : ""}`} onClick={() => setFilter("pendentes")}>Pendentes · {pending.length}</button><button className={`filter ${filter === "resolvidas" ? "active" : ""}`} onClick={() => setFilter("resolvidas")}>Resolvidas · {resolved.length}</button><button className={`filter ${filter === "impacto" ? "active" : ""}`} onClick={() => setFilter("impacto")}>Maior impacto</button></div>
    {displayed.length === 0 ? <article className="card"><EmptyState title={filter === "resolvidas" ? "Nenhuma decisão resolvida" : "Tudo em dia"} description={filter === "resolvidas" ? "As decisões concluídas aparecerão aqui." : "Nenhuma decisão está aguardando sua aprovação."} /></article> : <section className="employee-grid">{displayed.map((approval) => { const employee = employees.find((item) => item.id === approval.employeeId)!; return <article className="card approval-card" key={approval.id}><div className="employee-top"><Avatar initials={employee.initials} color={employee.color} size="lg" /><div className="employee-title"><h3>{approval.title}</h3><p>Solicitado por {employee.name} · {approval.requestedAt}</p></div><StatusPill status={approval.status} /></div><p className="subtitle" style={{ marginTop: 14 }}>{approval.description}</p><div className="approval-grid"><div className="detail-box"><small>Impacto esperado</small><p>{approval.impact}</p></div><div className="detail-box"><small>Dados envolvidos</small><p>{approval.amount ? currency(approval.amount) : "Registros operacionais"}</p></div></div><div className="risk"><ShieldAlert size={12} style={{ display: "inline", verticalAlign: -2, marginRight: 5 }} />Risco <strong>{approval.risk}</strong></div>{approval.status === "pendente" && <div className="approval-actions"><Button size="sm" onClick={() => resolveApproval(approval.id, "aprovada")}><Check size={13} />Aprovar</Button><Button size="sm" variant="ghost" onClick={() => resolveApproval(approval.id, "ajuste solicitado")}><MessageSquareText size={13} />Solicitar ajuste</Button><Button size="sm" variant="danger" onClick={() => resolveApproval(approval.id, "recusada")}><X size={13} />Recusar</Button></div>}</article>; })}</section>}
  </>;
}
