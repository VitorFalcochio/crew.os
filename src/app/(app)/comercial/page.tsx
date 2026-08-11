"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CircleDollarSign, Mail, Plus, Target, TestTube2, TrendingUp, UploadCloud, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/features/demo/demo-provider";
import { parseSalesLeadCsv } from "@/features/customer-operations/outbound-email";
import styles from "@/components/customer-operations/customer-operations.module.css";
import type { SalesLead } from "@/types/domain";

type SalesTab = "Visão" | "Pipeline" | "Leads";
const stages: Array<{ key: SalesLead["stage"]; label: string }> = [{ key: "novo", label: "Novos" }, { key: "qualificado", label: "Qualificados" }, { key: "proposta", label: "Proposta" }, { key: "negociação", label: "Negociação" }];
const stageLabels: Record<SalesLead["stage"], string> = { novo: "Novo", qualificado: "Qualificado", proposta: "Proposta", negociação: "Negociação", ganho: "Ganho", perdido: "Perdido" };
const emptyForm = { contactName: "", companyName: "", email: "", context: "", estimatedValue: "" };

export default function ComercialPage() {
  const { salesLeads, addSalesLead, importSalesLeads, updateSalesLeadStage, prepareSalesFollowup } = useDemo();
  const [tab, setTab] = useState<SalesTab>("Visão"); const [showForm, setShowForm] = useState(false); const [form, setForm] = useState(emptyForm); const [busy, setBusy] = useState<string>(); const [importMessage, setImportMessage] = useState(""); const fileRef = useRef<HTMLInputElement>(null);
  const metrics = useMemo(() => ({ active: salesLeads.filter((item) => !["ganho", "perdido"].includes(item.stage)).length, qualified: salesLeads.filter((item) => item.stage === "qualificado").length, approval: salesLeads.filter((item) => item.status === "awaiting_approval").length, value: salesLeads.filter((item) => !["ganho", "perdido"].includes(item.stage)).reduce((sum, item) => sum + (item.estimatedValue ?? 0), 0) }), [salesLeads]);
  const latest = salesLeads[0];

  function submit(event: React.FormEvent) { event.preventDefault(); const created = addSalesLead({ contactName: form.contactName, companyName: form.companyName, email: form.email, context: form.context, estimatedValue: Number(form.estimatedValue) || undefined }); if (created) { setForm(emptyForm); setShowForm(false); setTab("Leads"); } else toast.error("Preencha nome, empresa e um e-mail válido"); }
  async function importCsv(file?: File) { if (!file) return; try { const parsed = parseSalesLeadCsv(await file.text()); const result = importSalesLeads(parsed.items); const message = `${result.created} lead(s) importado(s), ${result.duplicates} duplicado(s) ignorado(s)${parsed.errors.length ? ` e ${parsed.errors.length} linha(s) inválida(s)` : ""}.`; setImportMessage(message); toast.success("Importação concluída", { description: message }); setTab("Leads"); } catch (error) { toast.error("CSV não importado", { description: error instanceof Error ? error.message : undefined }); } finally { if (fileRef.current) fileRef.current.value = ""; } }
  async function followup(id: string) { setBusy(id); await prepareSalesFollowup(id); setBusy(undefined); }

  return <>
    <PageHeader eyebrow="Departamento · Lucas" title="Comercial" description="Organize oportunidades, acompanhe o funil e mantenha cada lead avançando para o próximo passo." />
    <div className="local-simulation-warning"><TestTube2 size={16} /><div><strong>Validação local</strong><p>Leads e pipeline ficam neste navegador. Follow-ups externos exigem sua aprovação antes do envio pelo Gmail.</p></div></div>
    <section className="procurement-workspace">
      <nav className="procurement-tabs" aria-label="Áreas do Comercial">{(["Visão", "Pipeline", "Leads"] as SalesTab[]).map((item) => <button className={tab === item ? "active" : ""} key={item} onClick={() => setTab(item)}>{item}</button>)}</nav>

      {tab === "Visão" && <div className="procurement-stack">
        <div className="procurement-metrics">
          <article><UsersRound size={17} /><span>Oportunidades ativas<strong>{metrics.active}</strong></span></article>
          <article><Target size={17} /><span>Qualificados<strong>{metrics.qualified}</strong></span></article>
          <article><BadgeCheck size={17} /><span>Aguardando decisão<strong>{metrics.approval}</strong></span></article>
          <article><CircleDollarSign size={17} /><span>Pipeline estimado<strong>{metrics.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}</strong></span></article>
        </div>
        <div className="procurement-primary-action"><div><p className="eyebrow">Nova oportunidade</p><h2>Quem pode avançar no seu funil?</h2><p>Cadastre um contato ou importe sua base. Lucas organiza o contexto, mantém a etapa atualizada e prepara o próximo contato.</p></div><Button onClick={() => setShowForm(true)}><Plus size={15} />Novo lead</Button></div>
        {latest && <button className="procurement-recent" onClick={() => setTab("Leads")}><span>Lead mais recente</span><strong>{latest.companyName}</strong><small>{latest.contactName} · {stageLabels[latest.stage]}</small><ArrowRight size={15} /></button>}
      </div>}

      {tab === "Pipeline" && <div className="procurement-stack">
        <div className="procurement-section-head"><div><h2>Pipeline comercial</h2><p>Visão do avanço das oportunidades ativas por etapa.</p></div><Button size="sm" onClick={() => setShowForm(true)}><Plus size={14} />Novo lead</Button></div>
        <div className={styles.pipeline}>{stages.map((stage) => { const items = salesLeads.filter((item) => item.stage === stage.key); const value = items.reduce((sum, item) => sum + (item.estimatedValue ?? 0), 0); return <section className={styles.column} key={stage.key}><header><div><strong>{stage.label}</strong><small>{value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}</small></div><span>{items.length}</span></header><div>{items.map((lead) => <article className={styles.leadCard} key={lead.id}><div className={styles.leadHead}><span>{lead.companyName[0]?.toUpperCase()}</span><div><h3>{lead.companyName}</h3><small>{lead.contactName}</small></div></div><p>{lead.context || "Sem contexto comercial informado."}</p>{lead.estimatedValue && <strong>{lead.estimatedValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>}<footer><select className="select" value={lead.stage} onChange={(event) => updateSalesLeadStage(lead.id, event.target.value as SalesLead["stage"])}><option value="novo">Novo</option><option value="qualificado">Qualificado</option><option value="proposta">Proposta</option><option value="negociação">Negociação</option><option value="ganho">Ganho</option><option value="perdido">Perdido</option></select><button title="Preparar follow-up" disabled={busy === lead.id || lead.status === "awaiting_approval"} onClick={() => void followup(lead.id)}><Mail size={14} /></button></footer></article>)}</div></section>; })}</div>
        {!salesLeads.length && <div className="procurement-empty large"><TrendingUp size={20} /><strong>Seu pipeline está vazio</strong><p>Cadastre o primeiro lead ou importe sua base comercial.</p></div>}
      </div>}

      {tab === "Leads" && <div className="procurement-stack">
        <div className="procurement-section-head"><div><h2>Base de leads</h2><p>Cadastre manualmente ou importe um CSV com nome, empresa e e-mail.</p></div><div className="form-actions"><input ref={fileRef} hidden type="file" accept=".csv,text/csv" onChange={(event) => void importCsv(event.target.files?.[0])} /><Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()}><UploadCloud size={14} />Importar CSV</Button><Button size="sm" onClick={() => setShowForm(true)}><Plus size={14} />Cadastrar</Button></div></div>
        {importMessage && <div className="local-mode-notice"><strong>Importação concluída</strong><span>{importMessage}</span></div>}
        <div className="table-wrap table-surface"><table className="data-table procurement-table"><thead><tr><th>Contato</th><th>Empresa</th><th>Valor estimado</th><th>Etapa</th><th>Status</th><th /></tr></thead><tbody>{salesLeads.map((lead) => <tr key={lead.id}><td><strong>{lead.contactName}</strong><div className="muted">{lead.email}</div></td><td><strong>{lead.companyName}</strong><div className={`muted ${styles.clamp}`}>{lead.context || "Sem contexto"}</div></td><td>{lead.estimatedValue?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? "—"}</td><td><select className={`select ${styles.stageSelect}`} value={lead.stage} onChange={(event) => updateSalesLeadStage(lead.id, event.target.value as SalesLead["stage"])}><option value="novo">Novo</option><option value="qualificado">Qualificado</option><option value="proposta">Proposta</option><option value="negociação">Negociação</option><option value="ganho">Ganho</option><option value="perdido">Perdido</option></select></td><td><span className={`${styles.status} ${styles[lead.status]}`}>{lead.status === "awaiting_approval" ? "Aguardando aprovação" : lead.status === "contacted" ? "Contatado" : lead.status === "archived" ? "Arquivado" : "Ativo"}</span></td><td>{lead.status === "awaiting_approval" ? <Link className="procurement-link" href="/aprovacoes">Revisar <ArrowRight size={13} /></Link> : !["ganho", "perdido"].includes(lead.stage) ? <Button size="sm" disabled={busy === lead.id} onClick={() => void followup(lead.id)}><Mail size={13} />Follow-up</Button> : <span className="muted">Encerrado</span>}</td></tr>)}</tbody></table>{!salesLeads.length && <div className="procurement-empty large"><UsersRound size={20} /><strong>Nenhum lead cadastrado</strong><p>Cadastre manualmente ou importe uma planilha CSV.</p></div>}</div>
      </div>}
    </section>

    {showForm && <div className="procurement-form-backdrop" role="presentation" onMouseDown={() => setShowForm(false)}><form className="procurement-form" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><header><div><p className="eyebrow">Comercial</p><h2>Novo lead</h2></div><button type="button" onClick={() => setShowForm(false)}>×</button></header><div className="form-grid"><div className="field"><label>Nome do contato</label><input className="input" value={form.contactName} onChange={(event) => setForm({ ...form, contactName: event.target.value })} required /></div><div className="field"><label>Empresa</label><input className="input" value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} required /></div><div className="field"><label>E-mail</label><input className="input" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></div><div className="field"><label>Valor estimado</label><input className="input" type="number" min="0" step="0.01" value={form.estimatedValue} onChange={(event) => setForm({ ...form, estimatedValue: event.target.value })} /></div><div className="field full"><label>Contexto comercial</label><textarea className="textarea" value={form.context} onChange={(event) => setForm({ ...form, context: event.target.value })} placeholder="Interesse, problema, histórico e próximo passo" /></div></div><footer><Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button><Button type="submit">Enviar ao Lucas</Button></footer></form></div>}
  </>;
}
