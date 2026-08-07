"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CalendarDays,
  Check,
  Clock3,
  FileSearch,
  Gauge,
  History,
  Inbox,
  LoaderCircle,
  MessageSquare,
  Paperclip,
  Play,
  Plus,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  TestTube2,
  UploadCloud,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/features/demo/demo-provider";
import {
  answerFinancialQuestion,
  buildFinancialOverview,
} from "@/features/finance/financial-operations";
import { documentTypeLabel } from "@/features/finance/document-intelligence";
import { currency } from "@/lib/utils";
import type { FinancialDirection, FinancialDocument } from "@/types/domain";

const tabs = [
  "Visão geral",
  "Caixa de entrada",
  "Contas",
  "Receber",
  "Cobranças",
  "Carteira",
  "Histórico",
  "Agenda e caixa",
  "Radar",
  "Conversa",
  "Auditoria",
] as const;
type Tab = (typeof tabs)[number];
const tabLabels: Record<Tab, string> = {
  "Visão geral": "Visão",
  "Caixa de entrada": "Entrada",
  Contas: "Pagar",
  Receber: "Receber",
  Cobranças: "Cobranças",
  Carteira: "Carteira",
  Histórico: "Histórico",
  "Agenda e caixa": "Caixa",
  Radar: "Radar",
  Conversa: "Chat",
  Auditoria: "Auditoria",
};
const statusLabel = {
  processed: "Processado",
  review: "Revisar",
  duplicate: "Duplicidade",
  unidentified: "Não identificado",
  error: "Erro",
};

function dateFromToday(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function AnaFinanceWorkspace() {
  const demo = useDemo();
  const {
    financialDocuments,
    financialEntries,
    financialAccounts,
    financialCollectionEvents,
    anaAuditEvents,
    financialHandoffs,
    financialBudgets,
    tasks,
    processFinancialDocuments,
    confirmFinancialDocument,
    createFinancialHandoff,
    setFinancialBudget,
    importFinancialAccounts,
    runAnaAnalysis,
    backendEnabled,
  } = demo;
  const [tab, setTab] = useState<Tab>("Visão geral");
  const [processing, setProcessing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    total: number;
    processed: number;
    duplicates: number;
    reviews: number;
  } | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [review, setReview] = useState({
    direction: "payable" as FinancialDirection,
    counterparty: "",
    amount: "",
    dueDate: "",
    category: "Não categorizado",
  });
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<
    { from: "user" | "ana"; text: string }[]
  >([
    {
      from: "ana",
      text: "Pode perguntar sobre contas a pagar, recebimentos, atrasos, riscos ou projeção de caixa.",
    },
  ]);
  const [budget, setBudget] = useState({ category: "", limit: "" });
  const [receivableForm, setReceivableForm] = useState({
    customerName: "",
    document: "",
    amount: "",
    dueDate: dateFromToday(-7),
    status: "overdue" as "open" | "paid" | "overdue",
  });
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().slice(0, 10);
  const allEntries = useMemo(
    () => [
      ...financialEntries,
      ...financialAccounts.map((account) => ({
        id: `receivable-${account.id}`,
        direction: "receivable" as const,
        counterparty: account.customerName,
        description: account.document,
        amount: account.amount,
        paidAmount: account.status === "paid" ? account.amount : 0,
        dueDate: account.dueDate,
        status:
          account.status === "paid"
            ? ("paid" as const)
            : account.dueDate < today || account.status === "overdue"
              ? ("overdue" as const)
              : ("open" as const),
        category: "Receitas operacionais",
        sourceDocumentIds: [],
        createdAt: account.createdAt,
      })),
    ],
    [financialEntries, financialAccounts, today],
  );
  const overview = useMemo(
    () => buildFinancialOverview(allEntries, financialDocuments, today),
    [allEntries, financialDocuments, today],
  );
  const anaBusy = tasks.some(
    (task) =>
      task.employeeId === "ana" &&
      ["planejando", "executando", "aguardando aprovação"].includes(
        task.status,
      ),
  );
  const latestAssessments = useMemo(() => {
    const latest = new Map<
      string,
      (typeof financialCollectionEvents)[number]
    >();
    for (const event of financialCollectionEvents)
      if (event.eventType === "analysis" && !latest.has(event.accountId))
        latest.set(event.accountId, event);
    const weight = { urgente: 4, alta: 3, média: 2, baixa: 1 };
    return [...latest.values()].sort(
      (left, right) =>
        weight[right.priority] - weight[left.priority] ||
        right.daysOverdue - left.daysOverdue,
    );
  }, [financialCollectionEvents]);
  const collectionCustomers = useMemo(
    () =>
      [
        ...new Set(
          financialCollectionEvents.map((event) => event.customerName),
        ),
      ].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [financialCollectionEvents],
  );
  const activeCustomer = selectedCustomer || collectionCustomers[0] || "";
  const customerHistory = financialCollectionEvents.filter(
    (event) => event.customerName === activeCustomer,
  );
  const highRiskTotal = latestAssessments
    .filter((item) => item.risk === "alto")
    .reduce((sum, item) => sum + item.amount, 0);

  async function upload(files: File[]) {
    if (!files.length || processing) return;
    if (files.length > 20) {
      setUploadResult({
        total: files.length,
        processed: 0,
        duplicates: 0,
        reviews: files.length,
      });
      return;
    }
    setProcessing(true);
    try {
      const result = await processFinancialDocuments(files);
      setUploadResult({ total: files.length, ...result });
      setTab("Caixa de entrada");
    } catch (error) {
      setUploadResult({
        total: files.length,
        processed: 0,
        duplicates: 0,
        reviews: files.length,
      });
      alert(error instanceof Error ? error.message : "Falha no processamento");
    } finally {
      setProcessing(false);
    }
  }

  function openReview(document: FinancialDocument) {
    setReviewing(document.id);
    setReview({
      direction:
        document.direction === "neutral" ? "payable" : document.direction,
      counterparty: document.counterparty ?? "",
      amount: document.amount ? String(document.amount) : "",
      dueDate: document.dueDate ?? "",
      category: document.category,
    });
  }

  function saveReview(event: React.FormEvent) {
    event.preventDefault();
    if (
      reviewing &&
      confirmFinancialDocument(reviewing, {
        ...review,
        amount: Number(review.amount),
      })
    )
      setReviewing(null);
  }

  function ask(event: React.FormEvent) {
    event.preventDefault();
    if (!question.trim()) return;
    const sent = question.trim();
    setMessages((items) => [
      ...items,
      { from: "user", text: sent },
      { from: "ana", text: answerFinancialQuestion(sent, overview) },
    ]);
    setQuestion("");
  }

  function submitReceivable(event: React.FormEvent) {
    event.preventDefault();
    importFinancialAccounts([
      {
        customerName: receivableForm.customerName.trim(),
        document: receivableForm.document.trim(),
        amount: Number(receivableForm.amount),
        dueDate: receivableForm.dueDate,
        status: receivableForm.status,
        source: "manual",
      },
    ]);
    setReceivableForm((current) => ({
      ...current,
      customerName: "",
      document: "",
      amount: "",
    }));
  }

  function addReceivableSamples() {
    importFinancialAccounts([
      {
        customerName: "Construtora Horizonte",
        document: "NF-1042",
        amount: 1840,
        dueDate: dateFromToday(-12),
        status: "overdue",
        source: "sample",
      },
      {
        customerName: "Residencial Aurora",
        document: "NF-1051",
        amount: 420,
        dueDate: dateFromToday(-5),
        status: "overdue",
        source: "sample",
      },
      {
        customerName: "Obras Monte Azul",
        document: "NF-1064",
        amount: 3200,
        dueDate: dateFromToday(4),
        status: "open",
        source: "sample",
      },
    ]);
  }

  const reviewCount = financialDocuments.filter((document) =>
    ["review", "unidentified"].includes(document.status),
  ).length;
  const docCounts = financialDocuments.reduce<Record<string, number>>(
    (counts, document) => ({
      ...counts,
      [document.type]: (counts[document.type] ?? 0) + 1,
    }),
    {},
  );

  return (
    <section className="ana-workspace" data-tab={tab}>
      <div className="ana-workspace-tabs">
        {tabs.map((item) => (
          <button
            key={item}
            className={tab === item ? "active" : ""}
            onClick={() => setTab(item)}
            title={item}
          >
            {tabLabels[item]}
            {item === "Caixa de entrada" && reviewCount > 0 && (
              <i>{reviewCount}</i>
            )}
          </button>
        ))}
      </div>

      {tab === "Visão geral" && (
        <div className="ana-panel-stack">
          <div className="ana-overview-grid">
            <article className="card">
              <small>Contas a pagar</small>
              <strong>{currency(overview.payablesTotal)}</strong>
              <span>{overview.overduePayables.length} atrasada(s)</span>
            </article>
            <article className="card">
              <small>Contas a receber</small>
              <strong>{currency(overview.receivablesTotal)}</strong>
              <span>{overview.overdueReceivables.length} atrasada(s)</span>
            </article>
            <article className="card">
              <small>Próximos 7 dias</small>
              <strong>
                {currency(
                  overview.nextSeven.incoming - overview.nextSeven.outgoing,
                )}
              </strong>
              <span>saldo projetado sem banco</span>
            </article>
            <article className="card">
              <small>Radar financeiro</small>
              <strong>{overview.radar.length}</strong>
              <span>ponto(s) de atenção</span>
            </article>
          </div>
          <div
            className={`ana-dropzone ${dragging ? "dragging" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              void upload([...event.dataTransfer.files]);
            }}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              hidden
              type="file"
              multiple
              accept=".pdf,image/*,.txt,.csv"
              onChange={(event) => void upload([...(event.target.files ?? [])])}
            />
            <span>
              <UploadCloud size={22} />
            </span>
            <div>
              <strong>
                {processing
                  ? "Ana está lendo os documentos..."
                  : "Solte até 20 documentos aqui"}
              </strong>
              <p>
                PDF com texto, imagens, TXT ou CSV · até 10 MB por arquivo ·
                originais não são armazenados
              </p>
            </div>
            {processing ? (
              <LoaderCircle className="ana-spin" size={19} />
            ) : (
              <Button
                type="button"
                variant="secondary"
                disabled={backendEnabled}
              >
                <Paperclip size={13} />
                Selecionar arquivos
              </Button>
            )}
          </div>
          {uploadResult && (
            <div className="card ana-upload-result">
              <div>
                <Check size={17} />
                <strong>Ana terminou de organizar seus documentos</strong>
              </div>
              <p>
                {uploadResult.total} recebidos · {uploadResult.processed}{" "}
                processados · {uploadResult.duplicates} possível(is)
                duplicidade(s) · {uploadResult.reviews} precisam de ajuda
              </p>
              <Button size="sm" onClick={() => setTab("Caixa de entrada")}>
                Revisar organização
              </Button>
            </div>
          )}
          <div className="local-simulation-warning">
            <ShieldCheck size={16} />
            <div>
              <strong>Gmail financeiro — próxima fase</strong>
              <p>
                A entrada OAuth está planejada, mas permanece desativada. Nenhum
                e-mail é acessado nesta versão.
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === "Caixa de entrada" && (
        <div className="ana-panel-stack">
          <div className="ana-inbox-summary">
            <span>
              <Inbox size={16} />
              {financialDocuments.length} documentos
            </span>
            <span>{docCounts.invoice ?? 0} notas</span>
            <span>{docCounts.boleto ?? 0} boletos</span>
            <span>{docCounts.payment_proof ?? 0} comprovantes</span>
            <span>{reviewCount} para revisar</span>
          </div>
          <div className="table-wrap table-surface">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Tipo</th>
                  <th>Dados extraídos</th>
                  <th>Relações</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {financialDocuments.map((document) => (
                  <tr key={document.id}>
                    <td>
                      <strong>{document.fileName}</strong>
                      <div className="muted">
                        {Math.round(document.confidence * 100)}% confiança
                      </div>
                    </td>
                    <td>{documentTypeLabel(document.type)}</td>
                    <td>
                      {document.counterparty ?? "—"}
                      <div className="muted">
                        {document.amount
                          ? currency(document.amount)
                          : "Valor não encontrado"}
                      </div>
                    </td>
                    <td>{document.relatedDocumentIds.length || "—"}</td>
                    <td>
                      <span className={`ana-doc-status ${document.status}`}>
                        {statusLabel[document.status]}
                      </span>
                    </td>
                    <td>
                      {["review", "unidentified"].includes(document.status) && (
                        <button
                          className="ana-text-button"
                          onClick={() => openReview(document)}
                        >
                          Revisar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!financialDocuments.length && (
              <div className="popover-empty">
                <FileSearch size={22} />
                <p>
                  Envie documentos na Visão geral para alimentar esta caixa.
                </p>
              </div>
            )}
          </div>
          {reviewing && (
            <form
              className="card card-pad ana-review-form"
              onSubmit={saveReview}
            >
              <div className="settings-section-head">
                <span className="metric-icon">
                  <Search size={15} />
                </span>
                <div>
                  <h2>Confirmar dados extraídos</h2>
                  <p className="subtitle">
                    A Ana só cria o lançamento depois da sua confirmação.
                  </p>
                </div>
              </div>
              <div className="form-grid">
                <div className="field">
                  <label>Operação</label>
                  <select
                    className="select"
                    value={review.direction}
                    onChange={(event) =>
                      setReview({
                        ...review,
                        direction: event.target.value as FinancialDirection,
                      })
                    }
                  >
                    <option value="payable">Conta a pagar</option>
                    <option value="receivable">Conta a receber</option>
                  </select>
                </div>
                <div className="field">
                  <label>Fornecedor ou cliente</label>
                  <input
                    required
                    className="input"
                    value={review.counterparty}
                    onChange={(event) =>
                      setReview({ ...review, counterparty: event.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label>Valor</label>
                  <input
                    required
                    className="input"
                    type="number"
                    min=".01"
                    step=".01"
                    value={review.amount}
                    onChange={(event) =>
                      setReview({ ...review, amount: event.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label>Vencimento</label>
                  <input
                    required
                    className="input"
                    type="date"
                    value={review.dueDate}
                    onChange={(event) =>
                      setReview({ ...review, dueDate: event.target.value })
                    }
                  />
                </div>
                <div className="field full">
                  <label>Categoria</label>
                  <input
                    required
                    className="input"
                    value={review.category}
                    onChange={(event) =>
                      setReview({ ...review, category: event.target.value })
                    }
                  />
                </div>
              </div>
              <div className="form-actions">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setReviewing(null)}
                >
                  Cancelar
                </Button>
                <Button type="submit">Confirmar e criar lançamento</Button>
              </div>
            </form>
          )}
        </div>
      )}

      {tab === "Contas" && (
        <div className="ana-panel-stack">
          {(["payable", "receivable"] as const).map((direction) => (
            <section className="table-wrap table-surface" key={direction}>
              <div className="table-section-heading">
                <div>
                  <h2>
                    {direction === "payable"
                      ? "Contas a pagar"
                      : "Contas a receber"}
                  </h2>
                  <p>
                    Valores organizados a partir dos documentos e lançamentos
                    manuais.
                  </p>
                </div>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Descrição</th>
                    <th>Categoria</th>
                    <th>Vencimento</th>
                    <th>Status</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {allEntries
                    .filter((entry) => entry.direction === direction)
                    .map((entry) => (
                      <tr key={entry.id}>
                        <td>
                          <strong>{entry.counterparty}</strong>
                        </td>
                        <td>{entry.description}</td>
                        <td>{entry.category}</td>
                        <td>
                          {new Intl.DateTimeFormat("pt-BR").format(
                            new Date(`${entry.dueDate}T12:00:00`),
                          )}
                        </td>
                        <td>
                          <span
                            className={`ana-doc-status ${entry.status === "overdue" ? "review" : "processed"}`}
                          >
                            {entry.status}
                          </span>
                        </td>
                        <td>{currency(entry.amount - entry.paidAmount)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}

      {tab === "Agenda e caixa" && (
        <div className="ana-panel-stack">
          <div className="card ana-projection">
            <div className="table-section-heading">
              <div>
                <h2>Projeção de caixa</h2>
                <p>Entradas e saídas previstas, sem saldo bancário inicial.</p>
              </div>
            </div>
            <div>
              {overview.projections.map((projection) => (
                <article key={projection.days}>
                  <strong>{projection.days} dias</strong>
                  <span className="positive">
                    + {currency(projection.incoming)}
                  </span>
                  <span className="negative">
                    − {currency(projection.outgoing)}
                  </span>
                  <b>{currency(projection.incoming - projection.outgoing)}</b>
                </article>
              ))}
            </div>
          </div>
          <div className="ana-two-columns">
            <section className="card card-pad">
              <div className="settings-section-head">
                <span className="metric-icon">
                  <CalendarDays size={15} />
                </span>
                <div>
                  <h2>Agenda financeira</h2>
                  <p className="subtitle">
                    Próximos compromissos em ordem de vencimento.
                  </p>
                </div>
              </div>
              <div className="ana-agenda">
                {allEntries
                  .filter((entry) => entry.status !== "paid")
                  .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                  .slice(0, 8)
                  .map((entry) => (
                    <div key={entry.id}>
                      <time>
                        {new Intl.DateTimeFormat("pt-BR").format(
                          new Date(`${entry.dueDate}T12:00:00`),
                        )}
                      </time>
                      <span>{entry.counterparty}</span>
                      <strong
                        className={
                          entry.direction === "payable"
                            ? "negative"
                            : "positive"
                        }
                      >
                        {entry.direction === "payable" ? "−" : "+"}{" "}
                        {currency(entry.amount - entry.paidAmount)}
                      </strong>
                    </div>
                  ))}
              </div>
            </section>
            <form
              className="card card-pad"
              onSubmit={(event) => {
                event.preventDefault();
                setFinancialBudget(budget.category, Number(budget.limit));
                setBudget({ category: "", limit: "" });
              }}
            >
              <div className="settings-section-head">
                <span className="metric-icon">
                  <Gauge size={15} />
                </span>
                <div>
                  <h2>Orçado × realizado</h2>
                  <p className="subtitle">
                    Defina um limite mensal por categoria.
                  </p>
                </div>
              </div>
              <div className="field">
                <label>Categoria</label>
                <input
                  required
                  className="input"
                  value={budget.category}
                  onChange={(event) =>
                    setBudget({ ...budget, category: event.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>Limite mensal</label>
                <input
                  required
                  className="input"
                  type="number"
                  min="1"
                  value={budget.limit}
                  onChange={(event) =>
                    setBudget({ ...budget, limit: event.target.value })
                  }
                />
              </div>
              <Button type="submit">Salvar orçamento</Button>
              <div className="ana-budget-list">
                {financialBudgets.map((item) => {
                  const realized = allEntries
                    .filter(
                      (entry) =>
                        entry.direction === "payable" &&
                        entry.category === item.category,
                    )
                    .reduce((sum, entry) => sum + entry.paidAmount, 0);
                  return (
                    <div key={item.id}>
                      <span>
                        {item.category}
                        <small>
                          {currency(realized)} de {currency(item.limit)}
                        </small>
                      </span>
                      <div className="progress">
                        <span
                          style={{
                            width: `${Math.min(100, (realized / item.limit) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === "Radar" && (
        <div className="ana-two-columns">
          <section className="card card-pad">
            <div className="settings-section-head">
              <span className="metric-icon">
                <AlertTriangle size={15} />
              </span>
              <div>
                <h2>Radar financeiro</h2>
                <p className="subtitle">
                  Anomalias e situações que merecem atenção.
                </p>
              </div>
            </div>
            <div className="ana-radar-list">
              {overview.radar.map((alert) => (
                <article key={alert.title}>
                  <span className={`finance-risk ${alert.severity}`}>
                    {alert.severity}
                  </span>
                  <div>
                    <strong>{alert.title}</strong>
                    <p>{alert.description}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      createFinancialHandoff({
                        toDepartment: alert.department,
                        title: alert.title,
                        context: alert.description,
                      })
                    }
                  >
                    Enviar para {alert.department}
                  </Button>
                </article>
              ))}
              {!overview.radar.length && (
                <div className="popover-empty">
                  <Check size={18} />
                  <p>Nenhum alerta com os dados atuais.</p>
                </div>
              )}
            </div>
          </section>
          <section className="card card-pad">
            <div className="settings-section-head">
              <span className="metric-icon">
                <WalletCards size={15} />
              </span>
              <div>
                <h2>Despesas recorrentes</h2>
                <p className="subtitle">
                  Padrões encontrados por fornecedor e categoria.
                </p>
              </div>
            </div>
            <div className="ana-radar-list">
              {overview.recurring.map((item) => (
                <article key={`${item.counterparty}-${item.category}`}>
                  <div>
                    <strong>{item.counterparty}</strong>
                    <p>
                      {item.occurrences} ocorrências · média de{" "}
                      {currency(item.average)} · {item.category}
                    </p>
                  </div>
                </article>
              ))}
              {!overview.recurring.length && (
                <div className="popover-empty">
                  <p>
                    São necessários ao menos dois lançamentos semelhantes para
                    identificar recorrência.
                  </p>
                </div>
              )}
            </div>
            <div className="section-title">
              <h3>Handoffs criados</h3>
            </div>
            {financialHandoffs.map((handoff) => (
              <div className="ana-handoff" key={handoff.id}>
                <strong>{handoff.toDepartment}</strong>
                <span>{handoff.title}</span>
              </div>
            ))}
          </section>
        </div>
      )}

      {tab === "Conversa" && (
        <section className="card ana-chat">
          <div className="card-pad">
            <h2>Conversar com o financeiro</h2>
            <p className="subtitle">
              As respostas usam somente os dados locais organizados acima.
            </p>
          </div>
          <div className="ana-chat-messages">
            {messages.map((message, index) => (
              <p className={message.from} key={index}>
                <span>{message.from === "ana" ? <Bot size={13} /> : null}</span>
                {message.text}
              </p>
            ))}
          </div>
          <form onSubmit={ask}>
            <MessageSquare size={16} />
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ana, quanto tenho para pagar esta semana?"
            />
            <button aria-label="Enviar">
              <Send size={15} />
            </button>
          </form>
        </section>
      )}

      {tab === "Auditoria" && (
        <div className="ana-two-columns">
          <section className="card card-pad">
            <div className="settings-section-head">
              <span className="metric-icon">
                <ShieldCheck size={15} />
              </span>
              <div>
                <h2>Auditoria das ações</h2>
                <p className="subtitle">
                  O que aconteceu, por quê e quais dados foram utilizados.
                </p>
              </div>
            </div>
            <div className="ana-audit-list">
              {anaAuditEvents.map((event) => (
                <article key={event.id}>
                  <div>
                    <strong>{event.action}</strong>
                    <span>{event.autonomy}</span>
                  </div>
                  <p>{event.reason}</p>
                  <small>
                    Dados: {event.dataUsed.join(", ")} ·{" "}
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(event.createdAt))}
                  </small>
                </article>
              ))}
              {!anaAuditEvents.length && (
                <div className="popover-empty">
                  <p>As próximas ações da Ana aparecerão aqui.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
      {tab === "Receber" && (
        <section className="table-wrap table-surface">
          <div className="table-section-heading">
            <div>
              <h2>Contas a receber</h2>
              <p>Valores organizados por cliente, vencimento e situação.</p>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {allEntries
                .filter((entry) => entry.direction === "receivable")
                .map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <strong>{entry.counterparty}</strong>
                    </td>
                    <td>{entry.description}</td>
                    <td>{entry.category}</td>
                    <td>
                      {new Intl.DateTimeFormat("pt-BR").format(
                        new Date(`${entry.dueDate}T12:00:00`),
                      )}
                    </td>
                    <td>
                      <span
                        className={`ana-doc-status ${entry.status === "overdue" ? "review" : "processed"}`}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td>{currency(entry.amount - entry.paidAmount)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!allEntries.some((entry) => entry.direction === "receivable") && (
            <div className="popover-empty">
              <p>Nenhuma conta a receber cadastrada.</p>
            </div>
          )}
        </section>
      )}

      {tab === "Cobranças" && (
        <div className="ana-two-columns">
          <form className="card card-pad" onSubmit={submitReceivable}>
            <div className="settings-section-head">
              <span className="metric-icon">
                <Plus size={15} />
              </span>
              <div>
                <h2>Laboratório de cobranças</h2>
                <p className="subtitle">
                  Cadastre recebíveis para a Ana analisar e priorizar.
                </p>
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Cliente</label>
                <input
                  className="input"
                  required
                  value={receivableForm.customerName}
                  onChange={(event) =>
                    setReceivableForm({
                      ...receivableForm,
                      customerName: event.target.value,
                    })
                  }
                />
              </div>
              <div className="field">
                <label>Documento</label>
                <input
                  className="input"
                  required
                  value={receivableForm.document}
                  onChange={(event) =>
                    setReceivableForm({
                      ...receivableForm,
                      document: event.target.value,
                    })
                  }
                />
              </div>
              <div className="field">
                <label>Valor</label>
                <input
                  className="input"
                  required
                  type="number"
                  min=".01"
                  step=".01"
                  value={receivableForm.amount}
                  onChange={(event) =>
                    setReceivableForm({
                      ...receivableForm,
                      amount: event.target.value,
                    })
                  }
                />
              </div>
              <div className="field">
                <label>Vencimento</label>
                <input
                  className="input"
                  required
                  type="date"
                  value={receivableForm.dueDate}
                  onChange={(event) =>
                    setReceivableForm({
                      ...receivableForm,
                      dueDate: event.target.value,
                    })
                  }
                />
              </div>
              <div className="field full">
                <label>Status</label>
                <select
                  className="select"
                  value={receivableForm.status}
                  onChange={(event) =>
                    setReceivableForm({
                      ...receivableForm,
                      status: event.target
                        .value as typeof receivableForm.status,
                    })
                  }
                >
                  <option value="overdue">Vencida</option>
                  <option value="open">Em aberto</option>
                  <option value="paid">Paga</option>
                </select>
              </div>
            </div>
            <div className="form-actions">
              <Button
                type="button"
                variant="ghost"
                onClick={addReceivableSamples}
              >
                <TestTube2 size={13} />
                Dados de teste
              </Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
          <aside className="card card-pad ana-collection-action">
            <div>
              <small>Recebíveis cadastrados</small>
              <strong>{financialAccounts.length}</strong>
            </div>
            <div>
              <small>Total em aberto</small>
              <strong>
                {currency(
                  financialAccounts
                    .filter((item) => item.status !== "paid")
                    .reduce((sum, item) => sum + item.amount, 0),
                )}
              </strong>
            </div>
            <Button
              onClick={runAnaAnalysis}
              disabled={
                backendEnabled || anaBusy || financialAccounts.length === 0
              }
            >
              <Play size={14} />
              {anaBusy ? "Analisando" : "Analisar agora"}
            </Button>
          </aside>
        </div>
      )}

      {tab === "Carteira" && (
        <div className="ana-panel-stack">
          <div className="finance-risk-metrics">
            <article className="card">
              <span>
                <AlertTriangle size={15} />
              </span>
              <div>
                <small>Carteira analisada</small>
                <strong>
                  {currency(
                    latestAssessments.reduce(
                      (sum, item) => sum + item.amount,
                      0,
                    ),
                  )}
                </strong>
              </div>
            </article>
            <article className="card">
              <span>
                <ShieldAlert size={15} />
              </span>
              <div>
                <small>Alto risco</small>
                <strong>{currency(highRiskTotal)}</strong>
              </div>
            </article>
            <article className="card">
              <span>
                <Clock3 size={15} />
              </span>
              <div>
                <small>Priorizadas</small>
                <strong>{latestAssessments.length}</strong>
              </div>
            </article>
          </div>
          <section className="table-wrap table-surface">
            <div className="table-section-heading">
              <div>
                <h2>Carteira priorizada</h2>
                <p>Classificação por valor, atraso e exposição do cliente.</p>
              </div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Prioridade</th>
                  <th>Cliente</th>
                  <th>Atraso</th>
                  <th>Risco</th>
                  <th>Valor</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {latestAssessments.map((assessment) => (
                  <tr key={assessment.accountId}>
                    <td>
                      <span
                        className={`finance-priority ${assessment.priority}`}
                      >
                        {assessment.priority}
                      </span>
                    </td>
                    <td>
                      <button
                        className="finance-customer-button"
                        onClick={() => {
                          setSelectedCustomer(assessment.customerName);
                          setTab("Histórico");
                        }}
                      >
                        <strong>{assessment.customerName}</strong>
                        <small>{assessment.document}</small>
                      </button>
                    </td>
                    <td>{assessment.daysOverdue} dias</td>
                    <td>
                      <span className={`finance-risk ${assessment.risk}`}>
                        {assessment.risk}
                      </span>
                    </td>
                    <td>{currency(assessment.amount)}</td>
                    <td className="finance-reason">{assessment.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!latestAssessments.length && (
              <div className="popover-empty">
                <p>
                  Execute uma análise na aba Cobranças para montar a carteira.
                </p>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "Histórico" && (
        <section className="card finance-history">
          <div className="finance-history-head">
            <span className="metric-icon">
              <History size={15} />
            </span>
            <div>
              <h2>Histórico por cliente</h2>
              <p>Análises e decisões registradas neste navegador.</p>
            </div>
            {collectionCustomers.length > 0 && (
              <select
                className="select"
                value={activeCustomer}
                onChange={(event) => setSelectedCustomer(event.target.value)}
              >
                {collectionCustomers.map((customer) => (
                  <option key={customer}>{customer}</option>
                ))}
              </select>
            )}
          </div>
          <div className="finance-history-list">
            {customerHistory.map((event) => (
              <article key={event.id}>
                <span className={`finance-history-dot ${event.eventType}`} />
                <div>
                  <div>
                    <strong>{event.title}</strong>
                    <time>
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(event.createdAt))}
                    </time>
                  </div>
                  <p>
                    {event.document} · {event.description}
                  </p>
                  <small>
                    {currency(event.amount)} · risco {event.risk} · prioridade{" "}
                    {event.priority}
                  </small>
                </div>
              </article>
            ))}
            {!customerHistory.length && (
              <div className="popover-empty">
                <p>Nenhum histórico de cobrança disponível.</p>
              </div>
            )}
          </div>
        </section>
      )}
    </section>
  );
}
