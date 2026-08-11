import { CalendarDays, Mail, RefreshCw, Search, ShieldCheck, UserRoundPlus, UsersRound } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { requireWaitlistAdmin } from "@/features/waitlist/admin-auth";
import { getWaitlistStorageMode, listWaitlistLeads } from "@/features/waitlist/waitlist-store";
import styles from "../../lista-de-espera/waitlist.module.css";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
export const dynamic = "force-dynamic";

export default async function WaitlistAdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  try { await requireWaitlistAdmin(); } catch { redirect("/acesso?next=/painel/lista-de-espera"); }
  const query = (await searchParams).q?.trim() ?? "";
  const leads = await listWaitlistLeads({ query, limit: 1000 });
  const allLeads = query ? await listWaitlistLeads({ limit: 1000 }) : leads;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const todayCount = allLeads.filter((lead) => new Date(lead.createdAt).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }) === today).length;
  const companyCount = allLeads.filter((lead) => lead.company).length;

  return <div className={styles.page}>
    <PageHeader eyebrow="Crescimento" title="Lista de espera" description="Acompanhe as pessoas interessadas em testar a CrewOS e entenda de onde elas estão chegando." />
    <section className={styles.securityBar}>
        <span><ShieldCheck size={16} /><span><strong>Painel protegido</strong><small>Acesso por organização e função administrativa</small></span></span>
      <em>{getWaitlistStorageMode() === "supabase" ? "Persistência Supabase" : "Persistência local"}</em>
    </section>
    <section className={styles.metrics}>
      <article><span><UsersRound size={18} /></span><div><small>Total de inscritos</small><strong>{allLeads.length}</strong></div></article>
      <article><span><CalendarDays size={18} /></span><div><small>Entraram hoje</small><strong>{todayCount}</strong></div></article>
      <article><span><UserRoundPlus size={18} /></span><div><small>Com empresa</small><strong>{companyCount}</strong></div></article>
    </section>
    <section className={styles.leadsSection}>
      <header><div><span className={styles.eyebrow}>INSCRITOS</span><h2>Contatos recebidos</h2><p>{query ? `${leads.length} resultado(s) para “${query}”` : "Cadastros mais recentes primeiro."}</p></div><div className={styles.tools}><form className={styles.searchForm} method="get"><Search size={15} /><input name="q" defaultValue={query} placeholder="Buscar nome, e-mail ou empresa" /><button type="submit">Buscar</button></form><a href="/painel/lista-de-espera" title="Atualizar"><RefreshCw size={15} /></a></div></header>
      {leads.length ? <div className={styles.tableWrap}><table><thead><tr><th>Contato</th><th>Empresa</th><th>Área</th><th>Origem</th><th>Entrada</th></tr></thead><tbody>{leads.map((lead) => <tr key={lead.id}><td><div className={styles.contact}><span>{lead.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><div><strong>{lead.name}</strong><a href={`mailto:${lead.email}`}><Mail size={11} />{lead.email}</a></div></div></td><td>{lead.company || <em>Não informado</em>}</td><td>{lead.role || <em>Não informada</em>}</td><td><span className={styles.source}>{lead.source}</span></td><td><time dateTime={lead.createdAt}>{dateFormatter.format(new Date(lead.createdAt))}</time></td></tr>)}</tbody></table></div> : <div className={styles.empty}><UserRoundPlus size={28} /><strong>{query ? "Nenhum contato encontrado" : "A fila ainda está vazia"}</strong><p>{query ? "Tente buscar por outro nome, e-mail ou empresa." : "Os novos cadastros aparecerão aqui automaticamente."}</p>{query && <a href="/painel/lista-de-espera">Limpar busca</a>}</div>}
    </section>
  </div>;
}
