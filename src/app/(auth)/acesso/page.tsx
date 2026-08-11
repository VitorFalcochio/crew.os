import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { loginOwnerWithPassword } from "@/features/auth/actions";
import styles from "./access.module.css";

export const metadata: Metadata = { title: "Acesso restrito", description: "Acesso protegido ao painel da CrewOS." };

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const query = await searchParams;
  const nextPath = query.next?.startsWith("/") && !query.next.startsWith("//") ? query.next : "/central";
  return (
    <main className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />
      <header><Link href="/" aria-label="Voltar ao site CrewOS"><Logo /></Link><span><ShieldCheck size={13} /> Ambiente protegido</span></header>
      <section className={styles.card}>
        <span className={styles.lock}><LockKeyhole size={23} /></span>
        <small>ACESSO DA EMPRESA</small>
        <h1>Entre no painel</h1>
        <p>Use a senha proprietária para acessar a operação, os funcionários digitais e os dados da empresa.</p>
        {query.error && <div className={styles.error} role="alert">{query.error}</div>}
        <form action={loginOwnerWithPassword}>
          <input type="hidden" name="next" value={nextPath} />
          <label htmlFor="owner-password">Senha de acesso</label>
          <input id="owner-password" name="password" type="password" minLength={8} maxLength={128} required autoComplete="current-password" autoFocus placeholder="Digite sua senha" />
          <button type="submit">Acessar CrewOS <ArrowRight size={15} /></button>
        </form>
        <div className={styles.security}><ShieldCheck size={14} /><span><strong>Sessão segura</strong><small>A senha é validada pelo Supabase e não fica armazenada nesta página.</small></span></div>
      </section>
      <Link className={styles.back} href="/"><ArrowLeft size={13} /> Voltar ao site</Link>
    </main>
  );
}
