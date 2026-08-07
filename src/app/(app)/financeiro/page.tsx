"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Bot, Clock3, History, Play, Plus, ShieldAlert, TestTube2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { useDemo } from "@/features/demo/demo-provider";
import { currency } from "@/lib/utils";

function dateFromToday(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function FinancePage() {
  const { financialAccounts, financialCollectionEvents, importFinancialAccounts, runAnaAnalysis, tasks, backendEnabled } = useDemo();
  const [form, setForm] = useState({ customerName: "", document: "", amount: "", dueDate: dateFromToday(-7), status: "overdue" as "open" | "paid" | "overdue" });
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const anaBusy = tasks.some((task) => task.employeeId === "ana" && ["planejando", "executando", "aguardando aprovação"].includes(task.status));
  const openTotal = financialAccounts.filter((item) => item.status !== "paid").reduce((sum, item) => sum + item.amount, 0);
  const latestAssessments = useMemo(() => {
    const latest = new Map<string, (typeof financialCollectionEvents)[number]>();
    for (const event of financialCollectionEvents) if (event.eventType === "analysis" && !latest.has(event.accountId)) latest.set(event.accountId, event);
    const weight = { urgente: 4, alta: 3, média: 2, baixa: 1 };
    return [...latest.values()].sort((left, right) => weight[right.priority] - weight[left.priority] || right.daysOverdue - left.daysOverdue);
  }, [financialCollectionEvents]);
  const customers = useMemo(() => [...new Set(financialCollectionEvents.map((event) => event.customerName))].sort((a, b) => a.localeCompare(b, "pt-BR")), [financialCollectionEvents]);
  const activeCustomer = selectedCustomer || customers[0] || "";
  const customerHistory = financialCollectionEvents.filter((event) => event.customerName === activeCustomer);
  const highRiskTotal = latestAssessments.filter((item) => item.risk === "alto").reduce((sum, item) => sum + item.amount, 0);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    importFinancialAccounts([{ customerName: form.customerName.trim(), document: form.document.trim(), amount: Number(form.amount), dueDate: form.dueDate, status: form.status, source: "manual" }]);
    setForm((current) => ({ ...current, customerName: "", document: "", amount: "" }));
  }

  function addSamples() {
    importFinancialAccounts([
      { customerName: "Construtora Horizonte", document: "NF-1042", amount: 1840, dueDate: dateFromToday(-12), status: "overdue", source: "sample" },
      { customerName: "Residencial Aurora", document: "NF-1051", amount: 420, dueDate: dateFromToday(-5), status: "overdue", source: "sample" },
      { customerName: "Obras Monte Azul", document: "NF-1064", amount: 3200, dueDate: dateFromToday(4), status: "open", source: "sample" },
    ]);
  }

  return <><PageHeader eyebrow="MVP Financeiro" title="Laboratório da Ana" description="Adicione recebíveis, peça uma análise e valide o ciclo de decisão. Tudo permanece neste navegador e nenhum cliente receberá mensagens." action={<Button onClick={runAnaAnalysis} disabled={backendEnabled || anaBusy || financialAccounts.length === 0}><Play size={14} />{anaBusy ? "Análise em andamento" : "Ana, analisar agora"}</Button>} />
    <div className="local-simulation-warning"><TestTube2 size={16} /><div><strong>Ambiente de validação local</strong><p>As contas e decisões abaixo são persistidas no localStorage. A etapa de envio é sempre simulada.</p></div></div>
    <section className="financial-mvp-grid">
      <form className="card card-pad" onSubmit={submit}>
        <div className="settings-section-head"><span className="metric-icon"><Plus size={15} /></span><div><h2>Adicionar conta a receber</h2><p className="subtitle">Cadastre manualmente ou use uma massa de teste.</p></div></div>
        <div className="form-grid">
          <div className="field"><label>Cliente</label><input className="input" required minLength={2} value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} /></div>
          <div className="field"><label>Documento</label><input className="input" required value={form.document} onChange={(event) => setForm({ ...form, document: event.target.value })} placeholder="NF-1042" /></div>
          <div className="field"><label>Valor</label><input className="input" required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></div>
          <div className="field"><label>Vencimento</label><input className="input" required type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></div>
          <div className="field full"><label>Status</label><select className="select" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as typeof form.status })}><option value="overdue">Vencida</option><option value="open">Em aberto</option><option value="paid">Paga</option></select></div>
        </div>
        <div className="form-actions" style={{ marginTop: 16 }}><Button type="button" variant="ghost" onClick={addSamples}><TestTube2 size={13} />Adicionar dados de teste</Button><Button type="submit">Salvar recebível</Button></div>
      </form>
      <aside className="card card-pad financial-mvp-summary"><span className="metric-icon"><Bot size={17} /></span><div><small>Contas cadastradas</small><strong>{financialAccounts.length}</strong></div><div><small>Total em aberto</small><strong>{currency(openTotal)}</strong></div><p>Ana classificará vencimentos e criará uma decisão rastreável para as cobranças.</p></aside>
    </section>
    {latestAssessments.length > 0 && <>
      <div className="finance-risk-metrics">
        <article className="card"><span><AlertTriangle size={15} /></span><div><small>Carteira analisada</small><strong>{currency(latestAssessments.reduce((sum, item) => sum + item.amount, 0))}</strong></div></article>
        <article className="card"><span><ShieldAlert size={15} /></span><div><small>Exposição de alto risco</small><strong>{currency(highRiskTotal)}</strong></div></article>
        <article className="card"><span><Clock3 size={15} /></span><div><small>Cobranças priorizadas</small><strong>{latestAssessments.length}</strong></div></article>
      </div>
      <section className="card table-wrap finance-priority-table"><div className="table-section-heading"><div><h2>Carteira priorizada pela Ana</h2><p>Última classificação por valor, atraso e exposição total do cliente.</p></div><span>Atualizada localmente</span></div><table className="data-table"><thead><tr><th>Prioridade</th><th>Cliente</th><th>Atraso</th><th>Risco</th><th>Valor</th><th>Motivo</th></tr></thead><tbody>{latestAssessments.map((assessment) => <tr key={assessment.accountId}><td><span className={`finance-priority ${assessment.priority}`}>{assessment.priority}</span></td><td><button className="finance-customer-button" onClick={() => setSelectedCustomer(assessment.customerName)}><strong>{assessment.customerName}</strong><small>{assessment.document}</small></button></td><td>{assessment.daysOverdue} dias</td><td><span className={`finance-risk ${assessment.risk}`}>{assessment.risk}</span></td><td>{currency(assessment.amount)}</td><td className="finance-reason">{assessment.description}</td></tr>)}</tbody></table></section>
      <section className="card finance-history"><div className="finance-history-head"><span className="metric-icon"><History size={15} /></span><div><h2>Histórico por cliente</h2><p>Toda análise e decisão permanece registrada neste navegador.</p></div><select className="select" value={activeCustomer} onChange={(event) => setSelectedCustomer(event.target.value)}>{customers.map((customer) => <option key={customer}>{customer}</option>)}</select></div><div className="finance-history-list">{customerHistory.map((event) => <article key={event.id}><span className={`finance-history-dot ${event.eventType}`} /><div><div><strong>{event.title}</strong><time>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(event.createdAt))}</time></div><p>{event.document} · {event.description}</p><small>{currency(event.amount)} · risco {event.risk} · prioridade {event.priority}</small></div></article>)}</div></section>
    </>}
    <section className="card table-wrap" style={{ marginTop: 14 }}><div className="table-section-heading"><div><h2>Contas a receber</h2><p>Base utilizada nas análises locais da Ana.</p></div></div><table className="data-table"><thead><tr><th>Cliente</th><th>Documento</th><th>Vencimento</th><th>Status</th><th>Valor</th><th>Origem</th></tr></thead><tbody>{financialAccounts.map((account) => <tr key={account.id}><td><strong>{account.customerName}</strong></td><td>{account.document}</td><td>{new Intl.DateTimeFormat("pt-BR").format(new Date(`${account.dueDate}T12:00:00`))}</td><td><StatusPill status={account.status === "paid" ? "concluída" : account.status === "overdue" ? "aguardando aprovação" : "planejando"} /></td><td>{currency(account.amount)}</td><td>{account.source === "sample" ? "Teste" : "Manual"}</td></tr>)}</tbody></table>{financialAccounts.length === 0 && <div className="popover-empty"><p>Nenhuma conta cadastrada. Adicione os dados de teste para começar.</p></div>}</section>
  </>;
}
