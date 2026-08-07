"use client";

import { useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, CheckCircle2, Clock3, MessageSquare, MoreHorizontal, Paperclip, Pause, Play, Search, Send, Settings, ShieldCheck, Wrench, X } from "lucide-react";
import { useDemo } from "@/features/demo/demo-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { currency } from "@/lib/utils";
import { getEmployeeCapabilities, type CapabilityStage } from "@/features/crew/capabilities";

const tabs = ["Visão geral", "Funcionalidades", "Conversa", "Tarefas", "Memória", "Ferramentas", "Permissões", "Desempenho", "Atividades"];

const stageLabels: Record<CapabilityStage, string> = { available: "Disponível", validation: "Em validação", planned: "Planejada" };

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { employees, tasks, activities, setEmployeeStatus } = useDemo();
  const employee = employees.find((item) => item.id === id);
  const [activeTab, setActiveTab] = useState("Visão geral");
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [capabilityQuery, setCapabilityQuery] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<{ from: "user" | "employee"; text: string }[]>([
    { from: "employee", text: "Bom dia, Vitor. Estou acompanhando minhas tarefas e aviso sempre que uma decisão precisar da sua aprovação." },
  ]);
  const employeeTasks = useMemo(() => tasks.filter((task) => task.employeeId === id), [tasks, id]);
  if (!employee) return <div className="empty-state"><h2>Funcionário não encontrado</h2><Link href="/equipe">Voltar para a equipe</Link></div>;
  const capabilityCatalog = getEmployeeCapabilities(employee);
  const normalizedCapabilityQuery = capabilityQuery.trim().toLocaleLowerCase("pt-BR");
  const filteredCapabilities = capabilityCatalog.capabilities.filter((capability) => !normalizedCapabilityQuery || [capability.title, capability.description, ...capability.actions, stageLabels[capability.stage]].some((value) => value.toLocaleLowerCase("pt-BR").includes(normalizedCapabilityQuery)));

  function sendMessage() {
    if (!message.trim() && !attachment) return;
    const sent = `${message.trim()}${attachment ? `${message.trim() ? " · " : ""}Anexo: ${attachment.name}` : ""}`;
    setMessages((current) => [...current, { from: "user", text: sent }, { from: "employee", text: `Entendido. Vou considerar isso no meu contexto de trabalho: “${sent}”. Se virar uma entrega, você pode formalizar como delegação.` }]);
    setMessage("");
    setAttachment(null);
  }

  return <><Link href="/equipe" className="subtitle" style={{ display: "inline-flex", gap: 6, alignItems: "center", marginBottom: 16 }}><ArrowLeft size={14} />Minha equipe</Link><section className="card profile-hero"><Avatar initials={employee.initials} color={employee.color} size="xl" status={employee.status} /><div className="profile-info"><div style={{ display: "flex", gap: 10, alignItems: "center" }}><h1>{employee.name}</h1><StatusPill status={employee.status} /></div><p className="subtitle">{employee.role} · {employee.department}</p><div className="profile-meta"><span>{employee.level}</span><span>Na equipe há 8 meses</span><span>{employee.tools.length} ferramentas conectadas</span></div></div><div className="profile-actions"><Button variant="secondary" onClick={() => setActiveTab("Conversa")}><MessageSquare size={14} />Conversar</Button><Link href={`/delegacoes?nova=1&employee=${employee.id}`}><Button>Delegar tarefa</Button></Link><div className="profile-more"><button className="icon-button" aria-label="Mais opções" aria-expanded={showMore} onClick={() => setShowMore((value) => !value)}><MoreHorizontal size={17} /></button>{showMore && <div className="profile-more-menu"><button onClick={() => { setActiveTab("Permissões"); setShowMore(false); }}><Settings size={14} />Configurar permissões</button><button onClick={() => { setEmployeeStatus(employee.id, employee.status === "pausado" ? "disponível" : "pausado"); setShowMore(false); }}>{employee.status === "pausado" ? <Play size={14} /> : <Pause size={14} />}{employee.status === "pausado" ? "Reativar funcionário" : "Pausar funcionário"}</button></div>}</div></div></section><div className="tabs" style={{ marginTop: 14 }}>{tabs.map((tab) => <button key={tab} className={`tab ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div>
    {activeTab === "Visão geral" && <div className="profile-grid"><section className="card card-pad"><h2>Visão geral</h2><p className="subtitle" style={{ marginBottom: 20 }}>{employee.description}</p><div className="stat-row"><div className="compact-stat"><small>Tarefas concluídas</small><strong>{employee.tasksCompleted}</strong></div><div className="compact-stat"><small>Taxa de sucesso</small><strong>{employee.successRate}%</strong></div><div className="compact-stat"><small>Tempo médio</small><strong>{employee.averageTime}</strong></div><div className="compact-stat"><small>Economia gerada</small><strong>{currency(employee.savings)}</strong></div></div><div className="section-title"><h2>Responsabilidades</h2></div><ul className="responsibility-list">{employee.responsibilities.map((item) => <li key={item}><Check size={14} />{item}</li>)}</ul><div className="section-title"><h2>Especialidades</h2></div><div className="skill-list">{employee.skills.map((skill) => <span className="skill" key={skill}>{skill}</span>)}</div></section><aside className="card card-pad"><h2>Espaço de trabalho</h2><div className="section-title"><h3>Ferramentas autorizadas</h3></div><div className="responsibility-list">{employee.tools.map((tool) => <li key={tool}><Wrench size={14} />{tool}</li>)}</div><div className="section-title"><h3>Controles</h3></div><div className="responsibility-list"><li><ShieldCheck size={14} />Ações financeiras exigem aprovação</li><li><ShieldCheck size={14} />Alterações ficam no histórico</li></div></aside></div>}
    {activeTab === "Funcionalidades" && <section className="capability-section">
      <label className="capability-search"><Search size={16} /><input value={capabilityQuery} onChange={(event) => setCapabilityQuery(event.target.value)} placeholder={`Buscar funcionalidades de ${employee.name}...`} aria-label={`Buscar funcionalidades de ${employee.name}`} />{capabilityQuery && <button type="button" onClick={() => setCapabilityQuery("")} aria-label="Limpar busca"><X size={14} /></button>}</label>
      <div className="capability-grid">{filteredCapabilities.map((capability) => <article className="card capability-card" key={capability.key}>
        <div className="capability-card-head"><span className={`capability-stage ${capability.stage}`}>{capability.stage === "planned" ? <Clock3 size={12} /> : <CheckCircle2 size={12} />}{stageLabels[capability.stage]}</span><small>{employee.department}</small></div>
        <h3>{capability.title}</h3><p>{capability.description}</p>
        <ul>{capability.actions.map((action) => <li key={action}><Check size={12} />{action}</li>)}</ul>
        {capability.href && <Link className="capability-link" href={capability.href}>Abrir validação <ArrowUpRight size={13} /></Link>}
      </article>)}</div>{filteredCapabilities.length === 0 && <div className="card capability-empty"><Search size={18} /><strong>Nenhuma funcionalidade encontrada</strong><p>Tente buscar por outro nome, ação ou estágio.</p></div>}
    </section>}
    {activeTab === "Conversa" && <section className="card" style={{ marginTop: 14, overflow: "hidden" }}><div className="card-pad" style={{ borderBottom: "1px solid var(--border)" }}><h2>Conversa com {employee.name}</h2><p className="subtitle">Este canal usa o contexto, a memória e as permissões de {employee.name}.</p></div><div style={{ minHeight: 330, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>{messages.map((item, index) => <div key={index} style={{ alignSelf: item.from === "user" ? "flex-end" : "flex-start", maxWidth: "72%", padding: "11px 13px", borderRadius: 11, background: item.from === "user" ? "rgba(244,229,0,.13)" : "var(--surface-3)", color: "#dce1ea", fontSize: 11, lineHeight: 1.55 }}>{item.text}</div>)}</div>{attachment && <div className="attachment-preview"><Paperclip size={13} /><span>{attachment.name}</span><button onClick={() => setAttachment(null)}><X size={12} /></button></div>}<div style={{ display: "flex", gap: 8, padding: 14, borderTop: "1px solid var(--border)" }}><input ref={fileInput} type="file" hidden onChange={(event) => setAttachment(event.target.files?.[0] ?? null)} /><button className="icon-button" aria-label="Anexar arquivo" onClick={() => fileInput.current?.click()}><Paperclip size={16} /></button><input className="input" value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => event.key === "Enter" && sendMessage()} placeholder={`Escreva para ${employee.name}...`} /><Button onClick={sendMessage} aria-label="Enviar"><Send size={15} /></Button></div></section>}
    {activeTab === "Tarefas" && <section className="card table-wrap" style={{ marginTop: 14 }}><table className="data-table"><thead><tr><th>Tarefa</th><th>Status</th><th>Prioridade</th><th>Prazo</th></tr></thead><tbody>{employeeTasks.map((task) => <tr key={task.id}><td><strong>{task.title}</strong><div className="muted" style={{ marginTop: 4 }}>{task.description}</div></td><td><StatusPill status={task.status} /></td><td>{task.priority}</td><td>{task.dueAt}</td></tr>)}</tbody></table></section>}
    {activeTab === "Memória" && <section className="employee-grid" style={{ marginTop: 14 }}>{["Identidade", "Empresa", "Operacional"].map((type, index) => <article className="card card-pad" key={type}><h2>Memória de {type.toLowerCase()}</h2><p className="subtitle">{index === 0 ? `${employee.role}, responsabilidades, limites e modo de atuação.` : index === 1 ? "Processos, políticas e contexto da Construtora Alpha." : "Aprendizados de tarefas, correções e preferências do gestor."}</p><div className="skill-list" style={{ marginTop: 14 }}><span className="skill">Atualizada hoje</span><span className="skill">Privada da empresa</span></div></article>)}</section>}
    {activeTab === "Ferramentas" && <section className="integration-grid" style={{ marginTop: 14 }}>{employee.tools.map((tool) => <article className="card integration-card" key={tool}><span className="integration-logo"><Wrench size={16} /></span><div><h3>{tool}</h3><p>Conectada e autorizada</p></div><StatusPill status="disponível" /></article>)}</section>}
    {activeTab === "Permissões" && <section className="card card-pad" style={{ marginTop: 14 }}><h2>Limites de atuação</h2><p className="subtitle">Permissões efetivas para proteger decisões sensíveis.</p><div className="responsibility-list" style={{ marginTop: 20 }}><li><ShieldCheck size={15} />Pode consultar dados necessários às tarefas</li><li><ShieldCheck size={15} />Pode preparar documentos e recomendações</li><li><ShieldCheck size={15} />Exige aprovação humana para enviar, publicar, comprar ou pagar</li></div></section>}
    {activeTab === "Desempenho" && <section className="card card-pad" style={{ marginTop: 14 }}><h2>Desempenho nos últimos 30 dias</h2><div className="stat-row" style={{ marginTop: 18 }}><div className="compact-stat"><small>Desempenho</small><strong>{employee.performance}%</strong></div><div className="compact-stat"><small>Sucesso</small><strong>{employee.successRate}%</strong></div><div className="compact-stat"><small>Entregas</small><strong>{employee.tasksCompleted}</strong></div><div className="compact-stat"><small>Valor gerado</small><strong>{currency(employee.savings)}</strong></div></div></section>}
    {activeTab === "Atividades" && <section className="card" style={{ marginTop: 14 }}><div className="timeline">{activities.filter((activity) => activity.employeeId === employee.id).map((activity) => <div className="timeline-item" key={activity.id}><span className="timeline-dot"><Check size={14} /></span><div><h3>{activity.title}</h3><p>{activity.description}</p></div><time>{activity.createdAt}</time></div>)}</div></section>}
  </>;
}
