"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Pause, Play, Plus, Repeat2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useDemo } from "@/features/demo/demo-provider";

interface Routine { id: string; employeeId: string; title: string; description: string; cadenceMinutes: number; nextRunAt: string; active: boolean }
const demoRoutines: Routine[] = [
  { id: "routine-leads", employeeId: "lucas", title: "Follow-up de leads parados", description: "Revisar oportunidades sem contato e preparar próximos passos.", cadenceMinutes: 1440, nextRunAt: "Amanhã, 10:30", active: true },
  { id: "routine-finance", employeeId: "ana", title: "Conciliação financeira", description: "Comparar movimentações e sinalizar divergências.", cadenceMinutes: 10080, nextRunAt: "Segunda, 14:00", active: true },
  { id: "routine-support", employeeId: "sofia", title: "Resumo do atendimento", description: "Consolidar volume, resoluções e casos escalados.", cadenceMinutes: 1440, nextRunAt: "Hoje, 16:30", active: true },
];
const cadenceLabel: Record<number, string> = { 60: "A cada hora", 1440: "Diariamente", 10080: "Semanalmente", 43200: "Mensalmente" };

export default function RoutinesPage() {
  const { employees, backendEnabled } = useDemo();
  const hired = employees.filter((employee) => employee.hired);
  const [routines, setRoutines] = useState<Routine[]>(backendEnabled ? [] : demoRoutines);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employeeId: hired[0]?.id ?? "", title: "", description: "", cadenceMinutes: 1440, requiresApproval: true });

  useEffect(() => {
    if (!backendEnabled) return;
    void fetch("/api/recurring", { cache: "no-store" }).then(async (response) => { if (!response.ok) throw new Error((await response.json()).error); const payload = await response.json() as { data: Record<string, unknown>[] }; setRoutines(payload.data.map((row) => ({ id: String(row.id), employeeId: String(row.employee_id), title: String(row.title), description: String(row.description), cadenceMinutes: Number(row.cadence_minutes), nextRunAt: new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(String(row.next_run_at))), active: Boolean(row.active) }))); }).catch((error: Error) => toast.error("Não foi possível carregar as rotinas", { description: error.message }));
  }, [backendEnabled]);

  async function createRoutine(event: React.FormEvent) {
    event.preventDefault();
    const optimistic: Routine = { id: crypto.randomUUID(), ...form, nextRunAt: "Na próxima janela", active: true };
    if (backendEnabled) {
      const response = await fetch("/api/recurring", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, priority: "media", timezone: "America/Sao_Paulo" }) });
      if (!response.ok) { const body = await response.json(); toast.error("Não foi possível criar a rotina", { description: body.error }); return; }
      const { data } = await response.json(); optimistic.id = data.id;
    }
    setRoutines((current) => [...current, optimistic]); setShowForm(false); setForm((current) => ({ ...current, title: "", description: "" })); toast.success("Rotina criada", { description: "A primeira execução foi agendada." });
  }
  async function toggle(routine: Routine) {
    const active = !routine.active;
    setRoutines((current) => current.map((item) => item.id === routine.id ? { ...item, active } : item));
    if (backendEnabled) { const response = await fetch(`/api/recurring/${routine.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) }); if (!response.ok) { setRoutines((current) => current.map((item) => item.id === routine.id ? routine : item)); toast.error("Não foi possível alterar a rotina"); return; } }
    toast.success(active ? "Rotina reativada" : "Rotina pausada");
  }
  async function remove(routine: Routine) {
    if (!window.confirm(`Excluir a rotina “${routine.title}”?`)) return;
    if (backendEnabled) { const response = await fetch(`/api/recurring/${routine.id}`, { method: "DELETE" }); if (!response.ok) { toast.error("Não foi possível excluir a rotina"); return; } }
    setRoutines((current) => current.filter((item) => item.id !== routine.id)); toast.success("Rotina excluída");
  }

  return <><PageHeader eyebrow="Rotinas" title="Trabalho que acontece sozinho" description="Agende tarefas recorrentes para sua equipe executar, registrar e enviar para aprovação quando necessário." action={<Button onClick={() => setShowForm((value) => !value)}><Plus size={15} />Nova rotina</Button>} />
    {showForm && <form className="card card-pad" onSubmit={createRoutine} style={{ marginBottom: 18 }}><div className="settings-section-head"><span className="metric-icon"><Repeat2 size={16} /></span><div><h2>Criar rotina automática</h2><p className="subtitle">Defina o responsável, o objetivo e a frequência.</p></div></div><div className="form-grid"><div className="field"><label>Responsável</label><select className="select" value={form.employeeId} onChange={(event) => setForm({ ...form, employeeId: event.target.value })}>{hired.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} — {employee.role}</option>)}</select></div><div className="field"><label>Frequência</label><select className="select" value={form.cadenceMinutes} onChange={(event) => setForm({ ...form, cadenceMinutes: Number(event.target.value) })}><option value={60}>A cada hora</option><option value={1440}>Diariamente</option><option value={10080}>Semanalmente</option><option value={43200}>Mensalmente</option></select></div><div className="field full"><label>Título</label><input className="input" required minLength={4} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ex: Revisar pagamentos vencidos" /></div><div className="field full"><label>Instruções</label><textarea className="textarea" required minLength={10} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div><label className="checkbox-row full"><input type="checkbox" checked={form.requiresApproval} onChange={(event) => setForm({ ...form, requiresApproval: event.target.checked })} />Exigir aprovação para ações sensíveis</label><div className="full form-actions"><Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button><Button type="submit">Criar rotina</Button></div></div></form>}
    {routines.length ? <section className="routine-grid">{routines.map((routine) => { const employee = employees.find((item) => item.id === routine.employeeId); return <article className={`card routine-card ${routine.active ? "" : "paused"}`} key={routine.id}><div className="routine-head"><div className="person-cell">{employee && <Avatar initials={employee.initials} color={employee.color} size="md" />}<span><strong>{employee?.name ?? "Funcionário"}</strong><small>{cadenceLabel[routine.cadenceMinutes] ?? `A cada ${routine.cadenceMinutes} min`}</small></span></div><span className={`status-pill ${routine.active ? "success" : "warning"}`}><i />{routine.active ? "ativa" : "pausada"}</span></div><h3>{routine.title}</h3><p>{routine.description}</p><div className="routine-next"><CalendarClock size={14} /><span><small>Próxima execução</small><strong>{routine.nextRunAt}</strong></span></div><div className="routine-actions"><Button size="sm" variant="ghost" onClick={() => toggle(routine)}>{routine.active ? <Pause size={13} /> : <Play size={13} />}{routine.active ? "Pausar" : "Reativar"}</Button><Button size="sm" variant="danger" onClick={() => remove(routine)}><Trash2 size={13} />Excluir</Button></div></article>; })}</section> : <article className="card"><EmptyState title="Nenhuma rotina configurada" description="Crie a primeira rotina para sua equipe trabalhar automaticamente." /></article>}
  </>;
}
