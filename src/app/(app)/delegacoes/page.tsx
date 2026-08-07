"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Plus } from "lucide-react";
import { useDemo } from "@/features/demo/demo-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { Avatar } from "@/components/ui/avatar";
import type { Priority } from "@/types/domain";

export default function TasksPage() {
  const { employees, tasks, delegateTask } = useDemo();
  const hired = employees.filter((employee) => employee.hired);
  const [showForm, setShowForm] = useState(true);
  const [employeeId, setEmployeeId] = useState("ana");
  const [title, setTitle] = useState("Analisar contas dos próximos 7 dias");
  const [description, setDescription] = useState("Analise as contas que vencem nos próximos sete dias e prepare as cobranças dos clientes atrasados.");
  const [priority, setPriority] = useState<Priority>("alta");
  const [requiresApproval, setRequiresApproval] = useState(true);

  useEffect(() => {
    const selected = new URLSearchParams(window.location.search).get("employee");
    if (!selected || !employees.some((employee) => employee.hired && employee.id === selected)) return;
    const timeout = window.setTimeout(() => setEmployeeId(selected), 0);
    return () => window.clearTimeout(timeout);
  }, [employees]);

  function submit(event: React.FormEvent) { event.preventDefault(); delegateTask({ employeeId, title, description, priority, requiresApproval }); setShowForm(false); setTitle(""); setDescription(""); }
  return <><PageHeader eyebrow="Delegações" title="Transforme objetivos em trabalho concluído" description="Descreva o resultado esperado. Sua equipe organiza o plano, executa e chama você quando uma decisão for necessária." action={<Button onClick={() => setShowForm((value) => !value)}><Plus size={15} />Nova delegação</Button>} />
    {showForm && <form className="card card-pad" onSubmit={submit} style={{ marginBottom: 18 }}><div style={{ display: "flex", gap: 12, marginBottom: 20 }}><span className="metric-icon"><ClipboardList size={16} /></span><div><h2>Delegar uma tarefa</h2><p className="subtitle">O contexto deste trabalho ficará registrado.</p></div></div><div className="form-grid"><div className="field"><label>Destinatário</label><select className="select" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>{hired.map((employee) => <option value={employee.id} key={employee.id}>{employee.name} — {employee.role}</option>)}</select></div><div className="field"><label>Prioridade</label><select className="select" value={priority} onChange={(event) => setPriority(event.target.value as Priority)}><option value="baixa">Baixa</option><option value="média">Média</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></div><div className="field full"><label>Título</label><input className="input" required minLength={4} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="O que precisa ser feito?" /></div><div className="field full"><label>Descrição e contexto</label><textarea className="textarea" required minLength={10} value={description} onChange={(event) => setDescription(event.target.value)} /><span className="field-hint">Inclua o resultado esperado, critérios e restrições importantes.</span></div><label className="checkbox-row full"><input type="checkbox" checked={requiresApproval} onChange={(event) => setRequiresApproval(event.target.checked)} />Solicitar minha aprovação antes de ações sensíveis</label><div className="full" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button><Button type="submit">Delegar tarefa</Button></div></div></form>}
    <section className="table-wrap table-surface"><table className="data-table"><thead><tr><th>Delegação</th><th>Responsável</th><th>Status</th><th>Prioridade</th><th>Prazo</th></tr></thead><tbody>{tasks.map((task) => { const employee = employees.find((item) => item.id === task.employeeId)!; return <tr key={task.id}><td><strong>{task.title}</strong><div className="muted" style={{ marginTop: 4, maxWidth: 480 }}>{task.description}</div></td><td><div className="person-cell"><Avatar initials={employee.initials} color={employee.color} size="sm" />{employee.name}</div></td><td><StatusPill status={task.status} /></td><td>{task.priority}</td><td>{task.dueAt}</td></tr>; })}</tbody></table></section></>;
}
