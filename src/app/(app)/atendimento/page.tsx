"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Headphones, Inbox, Mail, MessageSquareText, Plus, RefreshCw, TestTube2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/features/demo/demo-provider";
import styles from "@/components/customer-operations/customer-operations.module.css";
import type { SupportCase } from "@/types/domain";

type SupportTab = "Visão" | "Atendimentos" | "Caixa Gmail";
interface GmailMessage { id: string; threadId?: string; from: string; subject: string; snippet: string; unread: boolean }
interface GmailOverview { messages: GmailMessage[]; serviceErrors?: { gmail?: string } }
const emptyForm = { customerName: "", customerEmail: "", subject: "", message: "", priority: "média" as SupportCase["priority"] };
const statusLabel: Record<SupportCase["status"], string> = { open: "Em aberto", awaiting_approval: "Aguardando aprovação", replied: "Respondido", closed: "Encerrado" };
function sender(input: string) { const email = input.match(/<([^>]+)>/)?.[1] ?? input.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] ?? ""; const name = (input.match(/^([^<]+)</)?.[1] ?? email.split("@")[0]).replaceAll('"', "").trim(); return { email, name }; }

export default function AtendimentoPage() {
  const { supportCases, integrations, addSupportCase, prepareSupportReply } = useDemo();
  const [tab, setTab] = useState<SupportTab>("Visão"); const [showForm, setShowForm] = useState(false); const [form, setForm] = useState(emptyForm); const [gmail, setGmail] = useState<GmailOverview>(); const [loading, setLoading] = useState(false); const [busy, setBusy] = useState<string>();
  const connected = integrations.some((item) => item.provider === "google-workspace" && item.connected);
  const metrics = useMemo(() => ({ open: supportCases.filter((item) => item.status === "open").length, approval: supportCases.filter((item) => item.status === "awaiting_approval").length, replied: supportCases.filter((item) => item.status === "replied").length, urgent: supportCases.filter((item) => item.status === "open" && item.priority === "urgente").length }), [supportCases]);

  async function loadGmail() { if (!connected) return; setLoading(true); try { const response = await fetch("/api/integrations/google/overview", { cache: "no-store" }); const payload = await response.json() as { data?: GmailOverview; error?: string }; if (!response.ok || !payload.data) throw new Error(payload.error ?? "Gmail indisponível"); setGmail(payload.data); } catch (error) { toast.error("Não foi possível abrir o Gmail", { description: error instanceof Error ? error.message : undefined }); } finally { setLoading(false); } }
  function openTab(next: SupportTab) { setTab(next); if (next === "Caixa Gmail" && !gmail) void loadGmail(); }
  function submit(event: React.FormEvent) { event.preventDefault(); if (addSupportCase(form)) { setForm(emptyForm); setShowForm(false); setTab("Atendimentos"); } else toast.error("Preencha nome, e-mail, assunto e mensagem corretamente"); }
  async function prepare(id: string) { setBusy(id); await prepareSupportReply(id); setBusy(undefined); }
  async function importMessage(message: GmailMessage) { const contact = sender(message.from); setBusy(message.id); try { const response = await fetch(`/api/integrations/google/messages/${encodeURIComponent(message.id)}`, { cache: "no-store" }); const payload = await response.json() as { data?: { body?: string; threadId?: string; rfcMessageId?: string }; error?: string }; if (!response.ok || !payload.data) throw new Error(payload.error ?? "Não foi possível ler a mensagem"); const created = addSupportCase({ customerName: contact.name, customerEmail: contact.email, subject: message.subject, message: payload.data.body || message.snippet, priority: message.unread ? "alta" : "média", source: "gmail", gmailMessageId: message.id, gmailThreadId: payload.data.threadId ?? message.threadId, gmailRfcMessageId: payload.data.rfcMessageId }); if (created) setTab("Atendimentos"); } catch (error) { toast.error("E-mail não importado", { description: error instanceof Error ? error.message : undefined }); } finally { setBusy(undefined); } }

  const latest = supportCases[0];
  return <>
    <PageHeader eyebrow="Departamento · Sofia" title="Atendimento" description="Centralize solicitações, organize prioridades e responda clientes com contexto e aprovação." />
    <div className="local-simulation-warning"><TestTube2 size={16} /><div><strong>Validação local</strong><p>Atendimentos ficam neste navegador. Respostas externas só saem após sua aprovação e confirmação do Gmail.</p></div></div>
    <section className="procurement-workspace">
      <nav className="procurement-tabs" aria-label="Áreas de Atendimento">{(["Visão", "Atendimentos", "Caixa Gmail"] as SupportTab[]).map((item) => <button className={tab === item ? "active" : ""} key={item} onClick={() => openTab(item)}>{item}</button>)}</nav>

      {tab === "Visão" && <div className="procurement-stack">
        <div className="procurement-metrics">
          <article><Headphones size={17} /><span>Em aberto<strong>{metrics.open}</strong></span></article>
          <article><BadgeCheck size={17} /><span>Aguardando decisão<strong>{metrics.approval}</strong></span></article>
          <article><MessageSquareText size={17} /><span>Respondidos<strong>{metrics.replied}</strong></span></article>
          <article><TriangleAlert size={17} /><span>Urgentes<strong>{metrics.urgent}</strong></span></article>
        </div>
        <div className="procurement-primary-action"><div><p className="eyebrow">Novo atendimento</p><h2>Qual cliente precisa de ajuda?</h2><p>Registre a solicitação ou importe uma conversa do Gmail. Sofia organiza o contexto e prepara a resposta para sua revisão.</p></div><Button onClick={() => setShowForm(true)}><Plus size={15} />Novo atendimento</Button></div>
        {latest && <button className="procurement-recent" onClick={() => setTab("Atendimentos")}><span>Atendimento mais recente</span><strong>{latest.subject}</strong><small>{latest.customerName} · {statusLabel[latest.status]}</small><ArrowRight size={15} /></button>}
      </div>}

      {tab === "Atendimentos" && <div className="procurement-stack">
        <div className="procurement-section-head"><div><h2>Fila de atendimento</h2><p>Solicitações recebidas e o estágio atual de cada resposta.</p></div><Button size="sm" onClick={() => setShowForm(true)}><Plus size={14} />Novo</Button></div>
        <div className="table-wrap table-surface"><table className="data-table procurement-table"><thead><tr><th>Cliente</th><th>Solicitação</th><th>Prioridade</th><th>Origem</th><th>Status</th><th /></tr></thead><tbody>{supportCases.map((item) => <tr key={item.id}><td><strong>{item.customerName}</strong><div className="muted">{item.customerEmail}</div></td><td><strong>{item.subject}</strong><div className={`muted ${styles.clamp}`}>{item.message}</div></td><td><span className={`${styles.pill} ${styles[item.priority]}`}>{item.priority}</span></td><td>{item.source === "gmail" ? "Gmail" : "Manual"}</td><td><span className={`${styles.status} ${styles[item.status]}`}>{statusLabel[item.status]}</span></td><td>{item.status === "open" ? <Button size="sm" disabled={busy === item.id} onClick={() => void prepare(item.id)}><Mail size={13} />Preparar resposta</Button> : item.status === "awaiting_approval" ? <Link className="procurement-link" href="/aprovacoes">Revisar <ArrowRight size={13} /></Link> : <span className="muted">Concluído</span>}</td></tr>)}</tbody></table>{!supportCases.length && <div className="procurement-empty large"><Headphones size={20} /><strong>Nenhum atendimento na fila</strong><p>Cadastre uma solicitação ou importe uma mensagem do Gmail.</p></div>}</div>
      </div>}

      {tab === "Caixa Gmail" && <div className="procurement-stack">
        <div className="procurement-section-head"><div><h2>Mensagens recentes</h2><p>Escolha quais conversas devem entrar na fila da Sofia. Nada é respondido automaticamente.</p></div><Button size="sm" variant="ghost" onClick={() => void loadGmail()} disabled={loading}><RefreshCw size={14} />Atualizar</Button></div>
        {!connected ? <div className="procurement-empty large"><Inbox size={20} /><strong>Google Workspace desconectado</strong><p>Conecte sua conta em Configurações para importar mensagens.</p><Link className="procurement-link" href="/configuracoes?tab=integracoes">Abrir integrações <ArrowRight size={13} /></Link></div> : gmail?.serviceErrors?.gmail ? <div className="procurement-empty large"><TriangleAlert size={20} /><strong>Gmail indisponível</strong><p>{gmail.serviceErrors.gmail}</p></div> : <div className="table-wrap table-surface"><table className="data-table procurement-table"><thead><tr><th>Remetente</th><th>Mensagem</th><th>Leitura</th><th /></tr></thead><tbody>{gmail?.messages.map((message) => { const contact = sender(message.from); const imported = supportCases.some((item) => item.gmailMessageId === message.id); return <tr key={message.id}><td><strong>{contact.name}</strong><div className="muted">{contact.email}</div></td><td><strong>{message.subject}</strong><div className={`muted ${styles.clamp}`}>{message.snippet}</div></td><td>{message.unread ? <span className={`${styles.pill} ${styles.alta}`}>Não lido</span> : <span className={styles.pill}>Lido</span>}</td><td><Button size="sm" variant="ghost" disabled={imported || !contact.email || busy === message.id} onClick={() => void importMessage(message)}>{imported ? "Importado" : busy === message.id ? "Importando..." : "Criar atendimento"}</Button></td></tr>; })}</tbody></table>{gmail && !gmail.messages.length && <div className="procurement-empty">Nenhuma mensagem encontrada.</div>}</div>}
      </div>}
    </section>

    {showForm && <div className="procurement-form-backdrop" role="presentation" onMouseDown={() => setShowForm(false)}><form className="procurement-form" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><header><div><p className="eyebrow">Atendimento</p><h2>Nova solicitação</h2></div><button type="button" onClick={() => setShowForm(false)}>×</button></header><div className="form-grid"><div className="field"><label>Nome do cliente</label><input className="input" value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} required /></div><div className="field"><label>E-mail</label><input className="input" type="email" value={form.customerEmail} onChange={(event) => setForm({ ...form, customerEmail: event.target.value })} required /></div><div className="field full"><label>Assunto</label><input className="input" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} required /></div><div className="field"><label>Prioridade</label><select className="select" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as SupportCase["priority"] })}><option>baixa</option><option>média</option><option>alta</option><option>urgente</option></select></div><div className="field full"><label>Mensagem e contexto</label><textarea className="textarea" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} required /></div></div><footer><Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button><Button type="submit">Enviar à Sofia</Button></footer></form></div>}
  </>;
}
