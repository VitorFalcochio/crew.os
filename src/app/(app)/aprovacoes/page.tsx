"use client";

import { useEffect, useState } from "react";
import { Check, LoaderCircle, Mail, RefreshCw, Save, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { useDemo } from "@/features/demo/demo-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { currency } from "@/lib/utils";
import type { AgentOutboundEmailAction, CollectionEmailAction, SupplierQuoteRequestEmailAction } from "@/types/domain";

type ExternalEmailAction = CollectionEmailAction | SupplierQuoteRequestEmailAction | AgentOutboundEmailAction;
type ExternalKind = "collection" | "supplier_quote_request" | "support_reply" | "sales_followup";

function actionBase(kind: ExternalKind) {
  if (kind === "supplier_quote_request") return "/api/carlos/quote-requests";
  if (kind === "support_reply") return "/api/sofia/replies";
  if (kind === "sales_followup") return "/api/lucas/follow-ups";
  return "/api/ana/collections";
}

type ApprovalFilter = "pendentes" | "resolvidas" | "impacto";

export default function ApprovalsPage() {
  const { approvals, employees, resolveApproval, saveCollectionDraft, approveCollection, rejectCollection, retryCollection, reconcileCollectionAction, saveSupplierQuoteRequestDraft, approveSupplierQuoteRequest, rejectSupplierQuoteRequest, retrySupplierQuoteRequest, reconcileSupplierQuoteRequest, saveAgentOutboundDraft, approveAgentOutbound, rejectAgentOutbound, retryAgentOutbound, reconcileAgentOutbound } = useDemo();
  const [filter, setFilter] = useState<ApprovalFilter>("pendentes");
  const [collectionActions, setCollectionActions] = useState<Record<string, ExternalEmailAction>>({});
  const [drafts, setDrafts] = useState<Record<string, { subject: string; body: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const pending = approvals.filter((approval) => approval.status === "pendente" || ["failed", "sending"].includes(approval.externalActionStatus ?? ""));
  const resolved = approvals.filter((approval) => !pending.includes(approval));
  const displayed =
    filter === "resolvidas"
      ? resolved
      : filter === "impacto"
        ? [...pending].sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
        : pending;

  useEffect(() => {
    const missing = displayed.filter((approval) => approval.externalActionId && !collectionActions[approval.externalActionId]);
    for (const approval of missing) {
      const actionId = approval.externalActionId!;
      const kind = (approval.externalActionKind ?? "collection") as ExternalKind;
      const base = actionBase(kind);
      void fetch(`${base}/${actionId}`, { cache: "no-store" }).then(async (response) => {
        const payload = await response.json() as { data?: ExternalEmailAction };
        if (!response.ok || !payload.data) return;
        setCollectionActions((current) => ({ ...current, [actionId]: payload.data! }));
        setDrafts((current) => ({ ...current, [actionId]: { subject: payload.data!.subject, body: payload.data!.body } }));
        if (kind === "supplier_quote_request") reconcileSupplierQuoteRequest(payload.data as SupplierQuoteRequestEmailAction); else if (kind === "support_reply" || kind === "sales_followup") reconcileAgentOutbound(payload.data as AgentOutboundEmailAction); else reconcileCollectionAction(payload.data as CollectionEmailAction);
      });
    }
  }, [collectionActions, displayed, reconcileAgentOutbound, reconcileCollectionAction, reconcileSupplierQuoteRequest]);

  async function runCollectionAction(actionId: string, kind: ExternalKind, operation: () => Promise<void>) {
    setBusy(actionId);
    try {
      await operation();
    } catch (error) {
      toast.error("Não foi possível concluir a ação", { description: error instanceof Error ? error.message : "Tente novamente" });
    } finally {
      const base = actionBase(kind);
      const response = await fetch(`${base}/${actionId}`, { cache: "no-store" }).catch(() => undefined);
      const payload = response ? await response.json() as { data?: ExternalEmailAction } : undefined;
      if (payload?.data) { setCollectionActions((current) => ({ ...current, [actionId]: payload.data! })); if (kind === "supplier_quote_request") reconcileSupplierQuoteRequest(payload.data as SupplierQuoteRequestEmailAction); else if (kind === "support_reply" || kind === "sales_followup") reconcileAgentOutbound(payload.data as AgentOutboundEmailAction); else reconcileCollectionAction(payload.data as CollectionEmailAction); }
      setBusy(null);
    }
  }

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
            const action = approval.externalActionId ? collectionActions[approval.externalActionId] : undefined;
            const draft = approval.externalActionId ? drafts[approval.externalActionId] : undefined;
            const isBusy = busy === approval.externalActionId;
            const actionKind = (approval.externalActionKind ?? "collection") as ExternalKind;

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
                      {approval.externalActionId && (
                        <div className="collection-email-review">
                          <span><Mail size={13} /> E-mail que será enviado</span>
                          {!action || !draft ? <p>Carregando rascunho seguro...</p> : (
                            <>
                              <label>Destinatário</label>
                              <input className="input" value={action.to} readOnly aria-readonly="true" />
                              <label>Assunto</label>
                              <input className="input" value={draft.subject} disabled={action.status !== "awaiting_approval" || isBusy} onChange={(event) => setDrafts((current) => ({ ...current, [action.id]: { ...draft, subject: event.target.value } }))} />
                              <label>Mensagem</label>
                              <textarea className="textarea collection-email-body" value={draft.body} disabled={action.status !== "awaiting_approval" || isBusy} onChange={(event) => setDrafts((current) => ({ ...current, [action.id]: { ...draft, body: event.target.value } }))} />
                              {"accounts" in action ? <div className="collection-email-accounts">{action.accounts.map((item) => <span key={item.id}>{item.document} · {currency(item.amount)} · vence {new Intl.DateTimeFormat("pt-BR").format(new Date(`${item.dueDate}T12:00:00`))}</span>)}</div> : "supplierName" in action ? <div className="collection-email-accounts"><span>Fornecedor: {action.supplierName}</span><span>Solicitação de cotação sem compromisso de compra</span></div> : <div className="collection-email-accounts"><span>{action.kind === "support_reply" ? "Atendimento" : "Oportunidade"}: {action.recipientName}</span><span>{action.kind === "support_reply" ? "Resposta ao cliente com aprovação humana" : "Follow-up sem desconto ou promessa vinculante"}</span></div>}
                              {action.error && <p className="collection-email-error"><ShieldAlert size={13} /> {action.error}</p>}
                              {action.externalMessageId && <p className="collection-email-evidence">Gmail confirmou o envio em {action.sentAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(action.sentAt)) : "agora"}. ID {action.externalMessageId}{action.externalThreadId ? ` · thread ${action.externalThreadId}` : ""}.</p>}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <aside className="approval-actions">
                    {approval.externalActionId ? (
                      !action || !draft ? <LoaderCircle className="collection-email-spin" size={18} /> : action.status === "awaiting_approval" ? (
                        <>
                          <Button variant="ghost" disabled={isBusy} onClick={() => void runCollectionAction(action.id, actionKind, () => actionKind === "supplier_quote_request" ? saveSupplierQuoteRequestDraft(action.id, draft) : actionKind === "support_reply" || actionKind === "sales_followup" ? saveAgentOutboundDraft(action.id, actionKind, draft) : saveCollectionDraft(action.id, draft))}><Save size={15} /> Salvar ajustes</Button>
                          <Button disabled={isBusy} onClick={() => void runCollectionAction(action.id, actionKind, async () => { if (actionKind === "supplier_quote_request") { await saveSupplierQuoteRequestDraft(action.id, draft); await approveSupplierQuoteRequest(action.id); } else if (actionKind === "support_reply" || actionKind === "sales_followup") { await saveAgentOutboundDraft(action.id, actionKind, draft); await approveAgentOutbound(action.id, actionKind); } else { await saveCollectionDraft(action.id, draft); await approveCollection(action.id); } })}>{isBusy ? <LoaderCircle className="collection-email-spin" size={15} /> : <Check size={15} />} Aprovar e enviar</Button>
                          <Button variant="danger" disabled={isBusy} onClick={() => void runCollectionAction(action.id, actionKind, () => actionKind === "supplier_quote_request" ? rejectSupplierQuoteRequest(action.id) : actionKind === "support_reply" || actionKind === "sales_followup" ? rejectAgentOutbound(action.id, actionKind) : rejectCollection(action.id))}><X size={15} /> Recusar</Button>
                        </>
                      ) : action.status === "failed" ? (
                        <Button disabled={isBusy} onClick={() => void runCollectionAction(action.id, actionKind, () => actionKind === "supplier_quote_request" ? retrySupplierQuoteRequest(action.id) : actionKind === "support_reply" || actionKind === "sales_followup" ? retryAgentOutbound(action.id, actionKind) : retryCollection(action.id))}>{isBusy ? <LoaderCircle className="collection-email-spin" size={15} /> : <RefreshCw size={15} />} Tentar novamente</Button>
                      ) : action.status === "sending" ? (
                        <div className="approval-resolution"><span>Enviando pelo Gmail</span><LoaderCircle className="collection-email-spin" size={17} /></div>
                      ) : (
                        <div className="approval-resolution"><span>{action.status === "sent" ? "Envio confirmado" : "Decisão registrada"}</span><StatusPill status={action.status === "sent" ? "aprovada" : "recusada"} /></div>
                      )
                    ) : approval.status === "pendente" ? (
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
                          Editar
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
