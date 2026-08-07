"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  PackageSearch,
  Plus,
  Scale,
  Store,
} from "lucide-react";
import { useDemo } from "@/features/demo/demo-provider";
import { Button } from "@/components/ui/button";
import { currency } from "@/lib/utils";

type ProcurementTab = "Visão" | "Requisições" | "Cotações";

const statusLabels = {
  quoting: "Em cotação",
  recommended: "Recomendação pronta",
  awaiting_approval: "Aguardando aprovação",
  approved: "Aprovada",
  rejected: "Recusada",
} as const;

export function CarlosProcurementWorkspace() {
  const {
    employees,
    procurementRequests,
    supplierQuotes,
    approvals,
    hireEmployee,
    createProcurementRequest,
    analyzeProcurementRequest,
  } = useDemo();
  const [tab, setTab] = useState<ProcurementTab>("Visão");
  const [showForm, setShowForm] = useState(false);
  const carlos = employees.find((employee) => employee.id === "carlos")!;
  const pendingApprovals = approvals.filter(
    (approval) =>
      approval.employeeId === "carlos" && approval.status === "pendente",
  ).length;
  const quotedTotal = procurementRequests.reduce((sum, request) => {
    const quote = supplierQuotes.find(
      (item) => item.id === request.recommendedQuoteId,
    );
    return sum + (quote?.total ?? 0);
  }, 0);
  const estimatedSavings = procurementRequests.reduce((sum, request) => {
    const quote = supplierQuotes.find(
      (item) => item.id === request.recommendedQuoteId,
    );
    return sum + Math.max(0, request.budget - (quote?.total ?? request.budget));
  }, 0);
  const quotesByRequest = useMemo(
    () =>
      procurementRequests.map((request) => ({
        request,
        quotes: supplierQuotes
          .filter((quote) => quote.requestId === request.id)
          .sort((a, b) => a.total - b.total),
      })),
    [procurementRequests, supplierQuotes],
  );

  function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const created = createProcurementRequest({
      title: String(form.get("title") ?? ""),
      category: String(form.get("category") ?? ""),
      quantity: Number(form.get("quantity")),
      budget: Number(form.get("budget")),
      neededBy: String(form.get("neededBy") ?? ""),
      project: String(form.get("project") ?? ""),
      notes: String(form.get("notes") ?? ""),
    });
    if (created) {
      event.currentTarget.reset();
      setShowForm(false);
      setTab("Requisições");
    }
  }

  if (!carlos.hired) {
    return (
      <section className="procurement-activation">
        <span><PackageSearch size={22} /></span>
        <div>
          <p className="eyebrow">Especialista responsável</p>
          <h2>Ative o Carlos para começar</h2>
          <p>Ele organizará requisições, comparará fornecedores e levará decisões sensíveis para sua aprovação.</p>
        </div>
        <Button onClick={() => hireEmployee("carlos")}>Ativar Carlos</Button>
      </section>
    );
  }

  return (
    <section className="procurement-workspace" data-tab={tab}>
      <nav className="procurement-tabs" aria-label="Áreas de Compras">
        {(["Visão", "Requisições", "Cotações"] as ProcurementTab[]).map(
          (item) => (
            <button
              className={tab === item ? "active" : ""}
              key={item}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ),
        )}
      </nav>

      {tab === "Visão" && (
        <div className="procurement-stack">
          <div className="procurement-metrics">
            <article><ClipboardList size={17} /><span>Requisições<strong>{procurementRequests.length}</strong></span></article>
            <article><Scale size={17} /><span>Valor recomendado<strong>{currency(quotedTotal)}</strong></span></article>
            <article><BadgeCheck size={17} /><span>Aguardando decisão<strong>{pendingApprovals}</strong></span></article>
            <article><Store size={17} /><span>Economia estimada<strong>{currency(estimatedSavings)}</strong></span></article>
          </div>
          <div className="procurement-primary-action">
            <div>
              <p className="eyebrow">Nova compra</p>
              <h2>O que sua empresa precisa comprar?</h2>
              <p>Informe a necessidade e o orçamento. Carlos prepara uma comparação rastreável antes de recomendar.</p>
            </div>
            <Button onClick={() => setShowForm(true)}><Plus size={15} />Nova requisição</Button>
          </div>
          {procurementRequests.length > 0 && (
            <button className="procurement-recent" onClick={() => setTab("Requisições")}>
              <span>Última requisição</span>
              <strong>{procurementRequests[0].title}</strong>
              <small>{statusLabels[procurementRequests[0].status]}</small>
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      )}

      {tab === "Requisições" && (
        <div className="procurement-stack">
          <div className="procurement-section-head">
            <div><h2>Requisições de compra</h2><p>Necessidades recebidas e o estágio atual de cada análise.</p></div>
            <Button size="sm" onClick={() => setShowForm(true)}><Plus size={14} />Nova</Button>
          </div>
          <div className="table-wrap table-surface">
            <table className="data-table procurement-table">
              <thead><tr><th>Necessidade</th><th>Projeto</th><th>Prazo</th><th>Orçamento</th><th>Status</th><th /></tr></thead>
              <tbody>
                {procurementRequests.map((request) => (
                  <tr key={request.id}>
                    <td><strong>{request.title}</strong><div className="muted">{request.quantity} un. · {request.category}</div></td>
                    <td>{request.project}</td>
                    <td>{new Intl.DateTimeFormat("pt-BR").format(new Date(`${request.neededBy}T12:00:00`))}</td>
                    <td>{currency(request.budget)}</td>
                    <td><span className={`procurement-status ${request.status}`}>{statusLabels[request.status]}</span></td>
                    <td>
                      {request.status === "quoting" ? (
                        <Button size="sm" onClick={() => { analyzeProcurementRequest(request.id); setTab("Cotações"); }}>Comparar</Button>
                      ) : request.status === "awaiting_approval" ? (
                        <Link className="procurement-link" href="/aprovacoes">Decidir <ArrowRight size={13} /></Link>
                      ) : (
                        <button className="procurement-link" onClick={() => setTab("Cotações")}>Ver análise</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!procurementRequests.length && <div className="procurement-empty">Nenhuma requisição cadastrada.</div>}
          </div>
        </div>
      )}

      {tab === "Cotações" && (
        <div className="procurement-stack">
          <div className="procurement-section-head"><div><h2>Mapa de cotações</h2><p>Preço, frete, prazo, pagamento e risco normalizados pelo Carlos.</p></div></div>
          {quotesByRequest.filter((group) => group.quotes.length).map(({ request, quotes }) => (
            <section className="procurement-quote-group" key={request.id}>
              <header><div><h3>{request.title}</h3><p>{request.project} · orçamento {currency(request.budget)}</p></div><span>{statusLabels[request.status]}</span></header>
              <div className="table-wrap table-surface">
                <table className="data-table procurement-table">
                  <thead><tr><th>Fornecedor</th><th>Total</th><th>Frete</th><th>Entrega</th><th>Pagamento</th><th>Nota</th><th>Risco</th></tr></thead>
                  <tbody>{quotes.map((quote) => (
                    <tr className={quote.id === request.recommendedQuoteId ? "recommended" : ""} key={quote.id}>
                      <td><strong>{quote.supplierName}</strong>{quote.id === request.recommendedQuoteId && <small>Recomendado</small>}</td>
                      <td>{currency(quote.total)}</td><td>{currency(quote.shipping)}</td><td>{quote.leadTimeDays} dias</td><td>{quote.paymentTerms}</td><td>{quote.rating.toFixed(1)}</td><td><span className={`procurement-risk ${quote.risk}`}>{quote.risk}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </section>
          ))}
          {!supplierQuotes.length && <div className="procurement-empty large"><Scale size={20} /><strong>Nenhuma comparação pronta</strong><p>Abra uma requisição e peça para o Carlos comparar as propostas.</p></div>}
        </div>
      )}

      {showForm && (
        <div className="procurement-form-backdrop" role="presentation" onMouseDown={() => setShowForm(false)}>
          <form className="procurement-form" onSubmit={submitRequest} onMouseDown={(event) => event.stopPropagation()}>
            <header><div><p className="eyebrow">Compras</p><h2>Nova requisição</h2></div><button type="button" onClick={() => setShowForm(false)}>×</button></header>
            <div className="form-grid">
              <div className="field full"><label>O que precisa comprar?</label><input className="input" name="title" required minLength={3} placeholder="Ex.: 500 sacos de cimento CP-II" /></div>
              <div className="field"><label>Categoria</label><input className="input" name="category" required placeholder="Materiais de obra" /></div>
              <div className="field"><label>Projeto</label><input className="input" name="project" placeholder="Obra Pinheiros" /></div>
              <div className="field"><label>Quantidade</label><input className="input" name="quantity" type="number" min="1" required /></div>
              <div className="field"><label>Orçamento máximo</label><input className="input" name="budget" type="number" min="1" step="0.01" required /></div>
              <div className="field"><label>Necessário até</label><input className="input" name="neededBy" type="date" required /></div>
              <div className="field full"><label>Observações</label><textarea className="textarea" name="notes" placeholder="Marca preferida, especificações ou restrições..." /></div>
            </div>
            <footer><Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button><Button type="submit">Enviar ao Carlos</Button></footer>
          </form>
        </div>
      )}
    </section>
  );
}
