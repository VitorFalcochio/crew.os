"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Bell, Building2, Check, CreditCard, Download, LockKeyhole, Plug, RefreshCw, RotateCcw, Save, Settings2, ShieldCheck, Trash2, UserRound, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/features/demo/demo-provider";
import { currency } from "@/lib/utils";
import styles from "./settings.module.css";

type SettingsTab = "geral" | "operacao" | "notificacoes" | "integracoes" | "assinatura";
const defaultPolicy = "Compras, pagamentos, envios externos e publicações sempre exigem aprovação humana.";
const tabs: Array<{ id: SettingsTab; label: string; description: string; icon: typeof Building2 }> = [
  { id: "geral", label: "Geral", description: "Empresa e perfil", icon: Building2 },
  { id: "operacao", label: "Operação", description: "Autonomia e políticas", icon: ShieldCheck },
  { id: "notificacoes", label: "Notificações", description: "Alertas e resumos", icon: Bell },
  { id: "integracoes", label: "Integrações", description: "Apps conectados", icon: Plug },
  { id: "assinatura", label: "Assinatura", description: "Plano e cobrança", icon: CreditCard },
];

function tabFromUrl(): SettingsTab {
  if (typeof window === "undefined") return "geral";
  const value = new URLSearchParams(window.location.search).get("tab") as SettingsTab | null;
  return tabs.some((tab) => tab.id === value) ? value! : "geral";
}

export default function SettingsPage() {
  const { account, employees, integrations, backendEnabled, updateOrganization, toggleIntegration, resetLocalMvp } = useDemo();
  const [activeTab, setActiveTab] = useState<SettingsTab>("geral");
  const [company, setCompany] = useState({ name: account.organization, industry: "Construção civil", policy: defaultPolicy });
  const [preferences, setPreferences] = useState({ approvals: true, failures: true, dailySummary: true, autonomy: "supervisionada" });
  const [saved, setSaved] = useState(false);
  const [editingCard, setEditingCard] = useState(false);
  const [syncingContaAzul, setSyncingContaAzul] = useState(false);
  const [card, setCard] = useState({ number: "•••• •••• •••• 4242", holder: account.name, expiry: "12/29" });
  const hired = useMemo(() => employees.filter((employee) => employee.hired), [employees]);
  const included = 3;
  const additional = Math.max(0, hired.length - included);
  const extraTotal = hired.slice(included).reduce((total, employee) => total + employee.monthlyPrice, 0);
  const total = 299 + extraTotal;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setActiveTab(tabFromUrl());
      const params = new URLSearchParams(window.location.search);
      const contaAzulStatus = params.get("contaAzul");
      if (contaAzulStatus === "connected") toast.success("Conta Azul conectado", { description: "A empresa foi identificada e os tokens foram protegidos no cofre da CrewOS." });
      else if (contaAzulStatus === "denied") toast.warning("Conexão cancelada", { description: "A autorização do Conta Azul não foi concedida." });
      else if (contaAzulStatus) {
        const descriptions: Record<string, string> = {
          not_configured: "Revise o Client ID e o Client Secret na Vercel.",
          invalid_state: "A tentativa expirou ou o domínio mudou. Inicie a conexão novamente.",
          forbidden: "Sua sessão ou permissão mudou. Entre novamente como administrador.",
          token_exchange_failed: "O Conta Azul recusou a troca do código. Confira as credenciais e a URL de redirecionamento.",
          storage_failed: "A autorização foi aceita, mas a Crew não conseguiu proteger as credenciais. Confira o cofre e o Supabase na Vercel.",
        };
        toast.error("Não foi possível conectar o Conta Azul", { description: descriptions[contaAzulStatus] ?? "Revise a configuração e tente novamente." });
      }
      if (contaAzulStatus) { params.delete("contaAzul"); const query = params.toString(); window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`); }
      const stored = localStorage.getItem("crewos-company-settings");
      if (!stored) return;
      try {
        const parsed = JSON.parse(stored) as { company: typeof company; preferences: typeof preferences };
        setCompany(parsed.company); setPreferences(parsed.preferences); setSaved(true);
      } catch { localStorage.removeItem("crewos-company-settings"); }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  function selectTab(tab: SettingsTab) {
    setActiveTab(tab);
    window.history.replaceState(null, "", `/configuracoes?tab=${tab}`);
  }

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
    setSaved(false); localStorage.removeItem("crewos-company-settings"); toast.success("Configurações restauradas");
  }

  function updateCard(event: React.FormEvent) { event.preventDefault(); setEditingCard(false); toast.success("Forma de pagamento atualizada"); }
  function downloadInvoice() {
    const invoice = ["CREWOS — COMPROVANTE DE ASSINATURA", `Empresa: ${account.organization}`, "Competência: Julho de 2026", `Plano Crew Starter: ${currency(299)}`, `Funcionários adicionais: ${currency(extraTotal)}`, `Total pago: ${currency(total)}`, "Status: Pago"].join("\r\n");
    const url = URL.createObjectURL(new Blob([invoice], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "comprovante-crewos-julho-2026.txt"; anchor.click(); URL.revokeObjectURL(url); toast.success("Comprovante baixado");
  }

  async function syncContaAzul() {
    setSyncingContaAzul(true);
    try {
      const response = await fetch("/api/integrations/conta-azul/sync", { method: "POST" });
      const payload = await response.json() as { error?: string; counts?: { customers: number; suppliers: number; receivables: number; payables: number; balances: number } };
      if (!response.ok || !payload.counts) throw new Error(payload.error ?? "Não foi possível sincronizar o Conta Azul");
      toast.success("Conta Azul sincronizado", { description: `${payload.counts.receivables} a receber, ${payload.counts.payables} a pagar, ${payload.counts.customers} clientes e ${payload.counts.balances} saldos atualizados.` });
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      toast.error("Falha na sincronização", { description: error instanceof Error ? error.message : "Tente novamente." });
    } finally {
      setSyncingContaAzul(false);
    }
  }

  const editableTab = activeTab === "geral" || activeTab === "operacao" || activeTab === "notificacoes";

  return <>
    <PageHeader eyebrow="Configurações" title="Central de configurações" description={`Gerencie a conta, operação e serviços da ${account.organization}.`} />
    <div className={styles.settingsShell}>
      <aside className={styles.settingsNav}>
        <div className={styles.navIdentity}><span>{account.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><div><strong>{account.name}</strong><small>{account.role === "owner" ? "Administrador" : account.role}</small></div></div>
        <nav aria-label="Seções de configurações">{tabs.map(({ id, label, description, icon: Icon }) => <button className={activeTab === id ? styles.active : ""} type="button" onClick={() => selectTab(id)} key={id}><Icon size={16} /><span><strong>{label}</strong><small>{description}</small></span></button>)}</nav>
        <div className={styles.navSecurity}><LockKeyhole size={14} /><span><strong>Ambiente protegido</strong><small>Credenciais criptografadas</small></span></div>
      </aside>

      <main className={styles.settingsContent}>
        <header className={styles.contentHeader}><div><span>{tabs.find((tab) => tab.id === activeTab)?.description}</span><h2>{tabs.find((tab) => tab.id === activeTab)?.label}</h2></div>{editableTab && <p className={saved ? styles.saved : ""}>{saved ? "Alterações salvas" : "Pode haver alterações não salvas"}</p>}</header>

        {editableTab && <form onSubmit={save}>
          {activeTab === "geral" && <div className={styles.panelStack}>
            <SettingsSection icon={<Building2 size={16} />} title="Dados da empresa" description="Essas informações orientam toda a equipe digital.">
              <div className="form-grid"><div className="field"><label>Nome da empresa</label><input className="input" required value={company.name} onChange={(event) => { setSaved(false); setCompany({ ...company, name: event.target.value }); }} /></div><div className="field"><label>Segmento</label><input className="input" required value={company.industry} onChange={(event) => { setSaved(false); setCompany({ ...company, industry: event.target.value }); }} /></div></div>
            </SettingsSection>
            <SettingsSection icon={<UserRound size={16} />} title="Sua conta" description="Dados do administrador deste ambiente."><div className={styles.accountDetails}><div><small>Nome</small><strong>{account.name}</strong></div><div><small>E-mail</small><strong>{account.email ?? "Conta local"}</strong></div><div><small>Permissão</small><strong>{account.role === "owner" ? "Proprietário" : account.role}</strong></div></div></SettingsSection>
            {!backendEnabled && <SettingsSection danger icon={<Trash2 size={16} />} title="Ambiente local" description="Reinicie todos os dados deste navegador."><Button variant="danger" type="button" onClick={() => { if (window.confirm("Apagar todo o MVP local e voltar ao cadastro?")) resetLocalMvp(); }}><Trash2 size={14} />Apagar ambiente local</Button></SettingsSection>}
          </div>}

          {activeTab === "operacao" && <div className={styles.panelStack}>
            <SettingsSection icon={<ShieldCheck size={16} />} title="Autonomia da equipe" description="Defina como os funcionários digitais podem agir."><div className="field"><label>Modo operacional</label><select className="select" value={preferences.autonomy} onChange={(event) => { setSaved(false); setPreferences({ ...preferences, autonomy: event.target.value }); }}><option value="supervisionada">Supervisionada — aprovar ações sensíveis</option><option value="restrita">Restrita — aprovar toda ação externa</option><option value="ampliada">Ampliada — aprovar apenas movimentações financeiras</option></select><span className="field-hint">A CrewOS nunca permite pagamentos sem autorização explícita.</span></div></SettingsSection>
            <SettingsSection icon={<Settings2 size={16} />} title="Política geral" description="Regra usada em todas as execuções."><div className="field"><label>Política de aprovação</label><textarea className="textarea" required value={company.policy} onChange={(event) => { setSaved(false); setCompany({ ...company, policy: event.target.value }); }} /></div></SettingsSection>
          </div>}

          {activeTab === "notificacoes" && <SettingsSection icon={<Bell size={16} />} title="Alertas da CrewOS" description="Escolha quando o sistema deve chamar sua atenção."><div className={styles.switches}><SettingSwitch title="Novas aprovações" description="Quando uma ação aguarda sua decisão" checked={preferences.approvals} onChange={(checked) => { setSaved(false); setPreferences({ ...preferences, approvals: checked }); }} /><SettingSwitch title="Falhas e bloqueios" description="Quando uma execução precisa de ajuda" checked={preferences.failures} onChange={(checked) => { setSaved(false); setPreferences({ ...preferences, failures: checked }); }} /><SettingSwitch title="Resumo diário" description="Relatório do trabalho concluído no dia" checked={preferences.dailySummary} onChange={(checked) => { setSaved(false); setPreferences({ ...preferences, dailySummary: checked }); }} /></div></SettingsSection>}

          <footer className={styles.saveBar}><span>{saved ? "Tudo atualizado" : "Revise e salve suas alterações"}</span><Button type="button" variant="ghost" onClick={restore}><RotateCcw size={14} />Restaurar</Button><Button type="submit"><Save size={14} />Salvar alterações</Button></footer>
        </form>}

        {activeTab === "integracoes" && <div className={styles.panelStack}>
          <div className={styles.integrationNotice}><span><LockKeyhole size={15} /></span><div><strong>Conexões protegidas</strong><p>{backendEnabled ? "Tokens permanecem no Integration Engine e nunca chegam ao navegador." : "Credenciais criptografadas no servidor local e isoladas do navegador."}</p></div></div>
          <section className={styles.integrationGrid}>{integrations.map((integration) => <article className={styles.integrationCard} key={integration.provider ?? integration.id}><span className={styles.integrationLogo}>{integration.initials}</span><div><h3>{integration.name}</h3><p>{integration.description}</p><small>{integration.status === "requires_reauth" ? integration.healthMessage ?? "Reconexão necessária" : integration.connected ? integration.provider === "google-workspace" ? "Conectado · disponível no Workspace" : integration.lastSyncAt ? `Sincronizado em ${new Date(integration.lastSyncAt).toLocaleString("pt-BR")}` : "Conectado" : "Não conectado"}</small></div><div className={styles.integrationActions}>{integration.provider === "conta-azul" && integration.connected && <button className={styles.syncButton} type="button" disabled={syncingContaAzul} onClick={syncContaAzul}><RefreshCw size={13} className={syncingContaAzul ? styles.spinning : ""} />{syncingContaAzul ? "Sincronizando" : "Sincronizar"}</button>}<button className={`toggle ${integration.connected ? "on" : ""}`} onClick={() => toggleIntegration(integration.id)} aria-label={`${integration.connected ? "Desconectar" : integration.status === "requires_reauth" ? "Reconectar" : "Conectar"} ${integration.name}`}><span /></button></div></article>)}</section>
        </div>}

        {activeTab === "assinatura" && <div className={styles.billingStack}>
          <section className={styles.planHero}><div><span><i /> Plano ativo</span><h2>Crew Starter</h2><p>Até 3 funcionários digitais incluídos.</p></div><div className={styles.planAmount}><strong>{currency(total)}</strong><small>por mês</small><Link href="/store">Ajustar equipe</Link></div></section>
          <div className={styles.billingGrid}><section className={styles.billingCard}><header><div><p>RESUMO DA COBRANÇA</p><h3>Composição mensal</h3></div></header><div className={styles.billRow}><span>Plano Crew Starter</span><strong>{currency(299)}</strong></div><div className={styles.billRow}><span>{additional} funcionário(s) adicional(is)</span><strong>{currency(extraTotal)}</strong></div><div className={`${styles.billRow} ${styles.total}`}><span>Total mensal</span><strong>{currency(total)}</strong></div></section>
            <section className={styles.billingCard}><header><span><CreditCard size={16} /></span><div><p>FORMA DE PAGAMENTO</p><h3>Próxima cobrança em 18/08/2026</h3></div></header>{editingCard ? <form onSubmit={updateCard} className={styles.paymentForm}><div className="field"><label>Número do cartão</label><input className="input" required value={card.number} onChange={(event) => setCard({ ...card, number: event.target.value })} /></div><div className="field"><label>Nome no cartão</label><input className="input" required value={card.holder} onChange={(event) => setCard({ ...card, holder: event.target.value })} /></div><div className="field"><label>Validade</label><input className="input" required value={card.expiry} onChange={(event) => setCard({ ...card, expiry: event.target.value })} /></div><div><Button type="button" variant="ghost" size="sm" onClick={() => setEditingCard(false)}><X size={13} />Cancelar</Button><Button type="submit" size="sm"><Save size={13} />Salvar</Button></div></form> : <div className={styles.paymentSummary}><CreditCard size={20} /><div><strong>Visa final {card.number.slice(-4)}</strong><small>{card.holder} · {card.expiry}</small></div><Button variant="ghost" size="sm" onClick={() => setEditingCard(true)}>Editar</Button></div>}</section></div>
          <section className={styles.membersCard}><header><div><p>EQUIPE NA ASSINATURA</p><h3>{hired.length} funcionários ativos</h3></div><span>{included} incluídos no plano</span></header><div>{hired.map((employee, index) => <article key={employee.id}><span>{employee.initials}</span><div><strong>{employee.name}</strong><small>{employee.role}</small></div><p>{index < included ? "Incluído" : currency(employee.monthlyPrice)}</p><i><Check size={11} /> Ativo</i></article>)}</div></section>
          <section className={styles.invoice}><div><strong>Julho de 2026</strong><small>Crew Starter + adicionais · Pago</small></div><Button variant="ghost" size="sm" onClick={downloadInvoice}><Download size={13} />Baixar comprovante</Button></section>
        </div>}
      </main>
    </div>
  </>;
}

function SettingsSection({ icon, title, description, danger, children }: { icon: React.ReactNode; title: string; description: string; danger?: boolean; children: React.ReactNode }) {
  return <section className={`${styles.sectionCard} ${danger ? styles.danger : ""}`}><header><span>{icon}</span><div><h3>{title}</h3><p>{description}</p></div></header><div className={styles.sectionBody}>{children}</div></section>;
}

function SettingSwitch({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label><span><strong>{title}</strong><small>{description}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>;
}
