"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, LockKeyhole, Mail, MessageSquare, ShieldCheck, WalletCards } from "lucide-react";
import { toast } from "sonner";
import styles from "./employee-permissions.module.css";

type PermissionMode = "automatic" | "approval_required" | "blocked";
interface PermissionRule { capability: string; label: string; description: string; icon: typeof Eye; defaultMode: PermissionMode }

const permissionRules: PermissionRule[] = [
  { capability: "email.read", label: "Ler e pesquisar e-mails", description: "Consultar mensagens necessárias para executar tarefas.", icon: Eye, defaultMode: "automatic" },
  { capability: "email.send", label: "Enviar e responder e-mails", description: "Comunicar-se externamente em nome da empresa.", icon: Mail, defaultMode: "approval_required" },
  { capability: "calendar.event.create", label: "Criar compromissos", description: "Adicionar reuniões e eventos ao calendário conectado.", icon: CheckCircle2, defaultMode: "approval_required" },
  { capability: "messages.send", label: "Enviar mensagens", description: "Usar canais conectados para falar com clientes ou equipe.", icon: MessageSquare, defaultMode: "approval_required" },
  { capability: "finance.accountsPayable.create", label: "Registrar contas a pagar", description: "Preparar novos lançamentos financeiros para revisão.", icon: WalletCards, defaultMode: "approval_required" },
];

const modeLabels: Record<PermissionMode, string> = { automatic: "Automático", approval_required: "Exige aprovação", blocked: "Bloqueado" };

export function EmployeePermissions({ employeeId, employeeName, backendEnabled }: { employeeId: string; employeeName: string; backendEnabled: boolean }) {
  const storageKey = `crewos-permissions-${employeeId}`;
  const [modes, setModes] = useState<Record<string, PermissionMode>>(() => Object.fromEntries(permissionRules.map((rule) => [rule.capability, rule.defaultMode])));
  const [saving, setSaving] = useState<string>();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return;
      try { setModes((current) => ({ ...current, ...JSON.parse(stored) as Record<string, PermissionMode> })); }
      catch { localStorage.removeItem(storageKey); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  const summary = useMemo(() => ({ automatic: Object.values(modes).filter((mode) => mode === "automatic").length, approval: Object.values(modes).filter((mode) => mode === "approval_required").length, blocked: Object.values(modes).filter((mode) => mode === "blocked").length }), [modes]);

  async function updatePermission(rule: PermissionRule, mode: PermissionMode) {
    const previous = modes[rule.capability];
    const next = { ...modes, [rule.capability]: mode };
    setModes(next); setSaving(rule.capability); localStorage.setItem(storageKey, JSON.stringify(next));
    try {
      if (backendEnabled) {
        const response = await fetch("/api/integrations/permissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employeeId, capability: rule.capability, allowed: mode !== "blocked", autonomy: mode === "automatic" ? "automatic" : "approval_required", limits: { currency: "BRL" } }) });
        const payload = await response.json() as { error?: string | { message?: string } };
        if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : payload.error?.message ?? "Não foi possível salvar a permissão");
      }
      toast.success("Permissão atualizada", { description: `${rule.label}: ${modeLabels[mode]}.` });
    } catch (error) {
      const restored = { ...next, [rule.capability]: previous };
      setModes(restored); localStorage.setItem(storageKey, JSON.stringify(restored));
      toast.error("Não foi possível atualizar", { description: error instanceof Error ? error.message : "Tente novamente." });
    } finally { setSaving(undefined); }
  }

  return <section className={styles.permissions}>
    <header><div><span className="eyebrow">Controle individual</span><h2>Permissões de {employeeName}</h2><p>Defina exatamente o que este funcionário pode executar sozinho, o que precisa de você e o que permanece bloqueado.</p></div><span className={styles.secure}><ShieldCheck size={14} /> Política protegida</span></header>
    <div className={styles.summary}><article><strong>{summary.automatic}</strong><span>Automáticas</span></article><article><strong>{summary.approval}</strong><span>Com aprovação</span></article><article><strong>{summary.blocked}</strong><span>Bloqueadas</span></article></div>
    <div className={styles.ruleList}>{permissionRules.map((rule) => { const Icon = rule.icon; return <article key={rule.capability}><span className={styles.ruleIcon}><Icon size={16} /></span><div><strong>{rule.label}</strong><p>{rule.description}</p><small>{rule.capability}</small></div><div className={styles.modeControl} aria-label={`Permissão para ${rule.label}`}>{(Object.keys(modeLabels) as PermissionMode[]).map((mode) => <button className={`${styles[mode]} ${modes[rule.capability] === mode ? styles.selected : ""}`} type="button" disabled={saving === rule.capability} onClick={() => void updatePermission(rule, mode)} key={mode}>{mode === "blocked" && <LockKeyhole size={11} />}{modeLabels[mode]}</button>)}</div></article>; })}</div>
    <footer><ShieldCheck size={14} /><p>Pagamentos e movimentações irreversíveis continuam exigindo aprovação humana, independentemente dessas preferências.</p></footer>
  </section>;
}
