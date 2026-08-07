"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, Building2, RotateCcw, Save, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/features/demo/demo-provider";

const defaultPolicy = "Compras, pagamentos, envios externos e publicações sempre exigem aprovação humana.";

export default function SettingsPage() {
  const { account, updateOrganization } = useDemo();
  const [company, setCompany] = useState({ name: account.organization, industry: "Construção civil", policy: defaultPolicy });
  const [preferences, setPreferences] = useState({ approvals: true, failures: true, dailySummary: true, autonomy: "supervisionada" });
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const stored = localStorage.getItem("crewos-company-settings");
      if (!stored) return;
      try { const parsed = JSON.parse(stored) as { company: typeof company; preferences: typeof preferences }; setCompany(parsed.company); setPreferences(parsed.preferences); setSaved(true); } catch { localStorage.removeItem("crewos-company-settings"); }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    try { await updateOrganization({ name: company.name, industry: company.industry }); }
    catch (error) { toast.error("Não foi possível salvar", { description: error instanceof Error ? error.message : "Tente novamente." }); return; }
    localStorage.setItem("crewos-company-settings", JSON.stringify({ company, preferences }));
    setSaved(true);
    toast.success("Configurações salvas", { description: "As novas regras serão usadas nas próximas execuções." });
  }
  function restore() {
    setCompany({ name: account.organization, industry: "Construção civil", policy: defaultPolicy });
    setPreferences({ approvals: true, failures: true, dailySummary: true, autonomy: "supervisionada" });
    setSaved(false);
    localStorage.removeItem("crewos-company-settings");
    toast.success("Configurações restauradas");
  }
  return <><PageHeader eyebrow="Configurações" title="Preferências da empresa" description={`Dados, políticas operacionais e controles da ${account.organization}.`} />
    <form onSubmit={save} className="settings-grid">
      <section className="card card-pad"><div className="settings-section-head"><span className="metric-icon"><Building2 size={16} /></span><div><h2>Dados da empresa</h2><p className="subtitle">Usados como contexto por toda a equipe.</p></div></div><div className="form-grid"><div className="field"><label>Nome da empresa</label><input className="input" required value={company.name} onChange={(event) => { setSaved(false); setCompany({ ...company, name: event.target.value }); }} /></div><div className="field"><label>Segmento</label><input className="input" required value={company.industry} onChange={(event) => { setSaved(false); setCompany({ ...company, industry: event.target.value }); }} /></div><div className="field full"><label>Política geral de aprovação</label><textarea className="textarea" required value={company.policy} onChange={(event) => { setSaved(false); setCompany({ ...company, policy: event.target.value }); }} /></div></div></section>
      <section className="card card-pad"><div className="settings-section-head"><span className="metric-icon"><ShieldCheck size={16} /></span><div><h2>Autonomia da equipe</h2><p className="subtitle">Defina como os funcionários podem agir.</p></div></div><div className="field"><label>Modo operacional</label><select className="select" value={preferences.autonomy} onChange={(event) => { setSaved(false); setPreferences({ ...preferences, autonomy: event.target.value }); }}><option value="supervisionada">Supervisionada — aprovar ações sensíveis</option><option value="restrita">Restrita — aprovar toda ação externa</option><option value="ampliada">Ampliada — aprovar apenas movimentações financeiras</option></select><span className="field-hint">A CrewOS nunca permite pagamentos sem autorização explícita.</span></div></section>
      <section className="card card-pad"><div className="settings-section-head"><span className="metric-icon"><Bell size={16} /></span><div><h2>Notificações</h2><p className="subtitle">Escolha quando a CrewOS chama sua atenção.</p></div></div><div className="settings-switches"><label><span><strong>Novas aprovações</strong><small>Quando uma ação aguarda sua decisão</small></span><input type="checkbox" checked={preferences.approvals} onChange={(event) => setPreferences({ ...preferences, approvals: event.target.checked })} /></label><label><span><strong>Falhas e bloqueios</strong><small>Quando uma execução precisa de ajuda</small></span><input type="checkbox" checked={preferences.failures} onChange={(event) => setPreferences({ ...preferences, failures: event.target.checked })} /></label><label><span><strong>Resumo diário</strong><small>Relatório do trabalho concluído no dia</small></span><input type="checkbox" checked={preferences.dailySummary} onChange={(event) => setPreferences({ ...preferences, dailySummary: event.target.checked })} /></label></div></section>
      <div className="settings-actions"><span>{saved ? "Tudo salvo" : "Alterações ainda não salvas"}</span><Button type="button" variant="ghost" onClick={restore}><RotateCcw size={14} />Restaurar padrões</Button><Button type="submit"><Save size={14} />Salvar alterações</Button></div>
    </form>
  </>;
}
