"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import styles from "./waitlist.module.css";

export function WaitlistForm() {
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string }>();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(undefined);
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: values.name, email: values.email, company: values.company || "", role: values.role || "", source: "site-crewos", website: values.website || "" }) });
      const result = await response.json() as { created?: boolean; error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível concluir o cadastro.");
      form.reset();
      setStatus({ type: "success", message: result.created === false ? "Seu cadastro já estava na fila e foi atualizado." : "Cadastro confirmado! Você está na lista de espera da CrewOS." });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Não foi possível concluir o cadastro." });
    } finally { setPending(false); }
  }

  return <form className={styles.form} onSubmit={submit}>
    <div className={styles.formHead}><span>ACESSO ANTECIPADO</span><h2>Entre na lista</h2><p>Seja avisado quando abrirmos os próximos acessos.</p></div>
    <div className={styles.honeypot} aria-hidden="true"><label htmlFor="website">Site</label><input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
    <label>Seu nome<input name="name" required minLength={2} maxLength={100} autoComplete="name" placeholder="Como podemos te chamar?" /></label>
    <label>Melhor e-mail<input name="email" required type="email" maxLength={254} autoComplete="email" placeholder="voce@empresa.com" /></label>
    <div className={styles.formSplit}><label>Empresa <small>opcional</small><input name="company" maxLength={120} autoComplete="organization" placeholder="Sua empresa" /></label><label>Sua área <small>opcional</small><select name="role" defaultValue=""><option value="">Selecione</option><option>Gestão / Direção</option><option>Financeiro</option><option>Compras</option><option>Atendimento</option><option>Comercial</option><option>Marketing</option><option>Tecnologia</option><option>Outra</option></select></label></div>
    <label className={styles.consent}><input type="checkbox" required /><span>Quero receber novidades e convites da CrewOS.</span></label>
    <button type="submit" disabled={pending}><span>{pending ? "Confirmando..." : "Quero entrar na lista"}</span><ArrowRight size={16} /></button>
    {status && <div className={`${styles.formStatus} ${status.type === "error" ? styles.formError : ""}`} role="status">{status.type === "success" && <CheckCircle2 size={15} />}{status.message}</div>}
    <small className={styles.privacy}>Sem spam. Seus dados serão usados somente para comunicações da CrewOS.</small>
  </form>;
}
