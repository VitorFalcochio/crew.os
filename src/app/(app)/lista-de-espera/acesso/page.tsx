import { LockKeyhole } from "lucide-react";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { loginWaitlistAdmin } from "@/features/waitlist/actions";
import { requireWaitlistAdmin } from "@/features/waitlist/admin-auth";
import styles from "../waitlist.module.css";

export const dynamic = "force-dynamic";

export default async function WaitlistAccessPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  try { await requireWaitlistAdmin(); redirect("/lista-de-espera"); } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
  }
  const query = await searchParams;
  const usesSupabase = isSupabaseConfigured();
  return (
    <section className={styles.accessPage}>
      <div className={styles.accessCard}>
        <span className={styles.accessIcon}><LockKeyhole size={22} /></span>
        <span className={styles.eyebrow}>ACESSO RESTRITO</span>
        <h1>Lista de espera</h1>
        <p>{usesSupabase ? "Entre com uma conta proprietária ou administradora da organização." : "Informe a senha administrativa definida no ambiente da CrewOS."}</p>
        {query.error && <div className={styles.errorMessage}>{query.error}</div>}
        {!usesSupabase && <form action={loginWaitlistAdmin} className={styles.accessForm}>
          <label htmlFor="waitlist-password">Senha administrativa</label>
          <input id="waitlist-password" name="password" type="password" minLength={12} required autoComplete="current-password" autoFocus />
          <button type="submit">Entrar no painel</button>
        </form>}
      </div>
    </section>
  );
}
