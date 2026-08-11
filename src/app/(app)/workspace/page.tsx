"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, ExternalLink, Inbox, Mail, MapPin, Plug, RefreshCw, Search, Users } from "lucide-react";
import { useDemo } from "@/features/demo/demo-provider";
import { PageHeader } from "@/components/layout/page-header";
import styles from "../integracoes/integrations.module.css";

interface GoogleMessage { id: string; from: string; subject: string; date?: string; snippet: string; unread: boolean; url: string }
interface GoogleEvent { id: string; title: string; start?: string; end?: string; allDay: boolean; location?: string; attendees: number; meetingUrl?: string; url?: string }
interface GoogleOverview {
  account: { email: string; name?: string; picture?: string };
  syncedAt: string;
  messages: GoogleMessage[];
  events: GoogleEvent[];
  serviceErrors?: { gmail?: string; calendar?: string };
}

type WorkspaceTab = "gmail" | "calendar";
const dateTime = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const monthTitle = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const shortDay = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short" });

function senderName(from: string) {
  const match = from.match(/^([^<]+)</);
  return (match?.[1] ?? from.split("@")[0]).replaceAll('"', "").trim();
}

function eventDateKey(value?: string) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthCells(reference: Date) {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  return [...Array.from({ length: firstWeekday }, () => undefined), ...Array.from({ length: days }, (_, index) => new Date(year, month, index + 1))];
}

export default function WorkspacePage() {
  const { integrations, backendEnabled } = useDemo();
  const google = useMemo(() => integrations.find((item) => item.provider === "google-workspace"), [integrations]);
  const [overview, setOverview] = useState<GoogleOverview>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("gmail");
  const [search, setSearch] = useState("");

  const loadGoogle = useCallback(async () => {
    if (!google?.connected || backendEnabled) return;
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch("/api/integrations/google/overview", { cache: "no-store" });
      const payload = await response.json() as { data?: GoogleOverview; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error ?? "Não foi possível carregar os dados do Google");
      setOverview(payload.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar os dados do Google");
    } finally {
      setLoading(false);
    }
  }, [backendEnabled, google?.connected]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadGoogle(), 0);
    return () => window.clearTimeout(timer);
  }, [loadGoogle]);

  const messages = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    if (!query) return overview?.messages ?? [];
    return (overview?.messages ?? []).filter((message) => `${message.from} ${message.subject} ${message.snippet}`.toLocaleLowerCase("pt-BR").includes(query));
  }, [overview?.messages, search]);
  const unreadCount = overview?.messages.filter((message) => message.unread).length ?? 0;
  const today = useMemo(() => new Date(), []);
  const calendarCells = useMemo(() => monthCells(today), [today]);
  const todayKey = eventDateKey(today.toISOString());

  return <>
    <PageHeader eyebrow="Workspace" title="Seu dia em um só lugar" description="E-mails e agenda organizados em experiências dedicadas dentro da CrewOS." />

    {!google?.connected && <section className={`${styles.disconnected} card`}>
      <span><Plug size={22} /></span><h2>Conecte seu Google Workspace</h2><p>Autorize Gmail e Google Calendar para trazer sua rotina para esta área.</p><Link className="button primary" href="/configuracoes?tab=integracoes">Ir para Integrações</Link>
    </section>}

    {google?.connected && <section className={styles.workspace}>
      <header className={styles.workspaceTopbar}>
        <nav className={styles.tabs} aria-label="Áreas do Workspace">
          <button className={activeTab === "gmail" ? styles.active : ""} type="button" onClick={() => setActiveTab("gmail")}><Mail size={16} /><span>Gmail</span>{unreadCount > 0 && <i>{unreadCount}</i>}</button>
          <button className={activeTab === "calendar" ? styles.active : ""} type="button" onClick={() => setActiveTab("calendar")}><CalendarDays size={16} /><span>Calendário</span></button>
        </nav>
        <div className={styles.accountCompact}><span>{overview?.account.name?.[0] ?? overview?.account.email?.[0] ?? "G"}</span><div><strong>{overview?.account.name ?? "Conta Google"}</strong><small>{overview?.account.email ?? "Conectada"}</small></div></div>
        <button className={styles.refresh} type="button" onClick={() => void loadGoogle()} disabled={loading} aria-label="Atualizar Workspace"><RefreshCw size={15} className={loading ? styles.spinning : ""} />{loading ? "Atualizando" : "Atualizar"}</button>
      </header>

      {error && <div className={styles.error}><strong>Não foi possível sincronizar.</strong><span>{error}</span><button type="button" onClick={() => void loadGoogle()}>Tentar novamente</button></div>}

      {!error && activeTab === "gmail" && <div className={styles.gmailShell}>
        <aside className={styles.gmailSidebar}>
          <div className={styles.gmailBrand}><span><Mail size={17} /></span><div><strong>Gmail</strong><small>Caixa conectada</small></div></div>
          <button className={styles.folderActive} type="button"><Inbox size={15} /><span>Caixa de entrada</span><b>{overview?.messages.length ?? 0}</b></button>
          <button type="button"><Mail size={15} /><span>Não lidos</span><b>{unreadCount}</b></button>
          <div className={styles.gmailAccount}><span>{overview?.account.email?.[0] ?? "G"}</span><p>{overview?.account.email}</p></div>
        </aside>

        <div className={styles.inboxPanel}>
          <header><div><p>CAIXA DE ENTRADA</p><h2>Mensagens recentes</h2></div><label><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar e-mail" /></label></header>
          {overview?.serviceErrors?.gmail ? <ServiceNotice service="gmail" /> : <div className={styles.inboxList}>
            {loading && !overview && Array.from({ length: 7 }, (_, index) => <div className={styles.skeleton} key={index} />)}
            {messages.map((message) => <Link className={`${styles.emailRow} ${message.unread ? styles.unread : ""}`} href={`/workspace/email/${encodeURIComponent(message.id)}`} key={message.id}>
              <i /><span className={styles.senderAvatar}>{senderName(message.from)[0]?.toUpperCase() ?? "?"}</span><div><strong>{senderName(message.from)}</strong><b>{message.subject}</b><p>{message.snippet}</p></div><time>{message.date ? dateTime.format(new Date(message.date)) : ""}</time>
            </Link>)}
            {overview && messages.length === 0 && <div className={styles.empty}>Nenhuma mensagem encontrada.</div>}
          </div>}
        </div>

      </div>}

      {!error && activeTab === "calendar" && <div className={styles.calendarShell}>
        {overview?.serviceErrors?.calendar ? <ServiceNotice service="calendar" /> : <>
          <div className={styles.monthPanel}>
            <header><div><p>CALENDÁRIO PRINCIPAL</p><h2>{monthTitle.format(today)}</h2></div><span>Hoje, {today.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}</span></header>
            <div className={styles.weekdays}>{["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].map((day) => <span key={day}>{day}</span>)}</div>
            <div className={styles.monthGrid}>{calendarCells.map((day, index) => {
              if (!day) return <div className={styles.outsideDay} key={`empty-${index}`} />;
              const key = eventDateKey(day.toISOString());
              const dayEvents = overview?.events.filter((event) => eventDateKey(event.start) === key) ?? [];
              return <div className={`${styles.calendarDay} ${key === todayKey ? styles.today : ""}`} key={key}><span>{day.getDate()}</span>{dayEvents.slice(0, 2).map((event) => <a href={event.url ?? event.meetingUrl ?? "https://calendar.google.com"} target="_blank" rel="noreferrer" key={event.id}>{!event.allDay && event.start && <time>{new Date(event.start).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time>}<b>{event.title}</b></a>)}{dayEvents.length > 2 && <small>+{dayEvents.length - 2} eventos</small>}</div>;
            })}</div>
          </div>

          <aside className={styles.agendaPanel}>
            <header><p>PRÓXIMOS EVENTOS</p><h2>Sua agenda</h2></header>
            <div className={styles.agendaList}>{overview?.events.slice(0, 10).map((event) => <a href={event.url ?? event.meetingUrl ?? "https://calendar.google.com"} target="_blank" rel="noreferrer" key={event.id}><time><strong>{event.start ? shortDay.format(new Date(`${event.start}${event.allDay ? "T12:00:00" : ""}`)) : "—"}</strong><span>{event.allDay ? "Dia todo" : event.start ? new Date(event.start).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}</span></time><div><b>{event.title}</b><p>{event.location ? <><MapPin size={11} />{event.location}</> : event.attendees > 0 ? <><Users size={11} />{event.attendees} participantes</> : <><Clock3 size={11} />Agenda principal</>}</p></div><ExternalLink size={12} /></a>)}{overview && overview.events.length === 0 && <div className={styles.empty}>Nenhum evento neste período.</div>}</div>
            <a className={styles.openCalendar} href="https://calendar.google.com" target="_blank" rel="noreferrer">Abrir Google Calendar <ExternalLink size={13} /></a>
          </aside>
        </>}
      </div>}

      {overview && <footer className={styles.syncTime}>Dados atualizados em {dateTime.format(new Date(overview.syncedAt))}</footer>}
    </section>}
  </>;
}

function ServiceNotice({ service }: { service: "gmail" | "calendar" }) {
  const gmail = service === "gmail";
  return <div className={styles.serviceNotice}>{gmail ? <Mail size={20} /> : <CalendarDays size={20} />}<strong>{gmail ? "Gmail API" : "Calendar API"} precisa ser ativada</strong><p>Ative a API no projeto do Google Cloud e atualize esta tela.</p><a href={gmail ? "https://console.cloud.google.com/apis/library/gmail.googleapis.com" : "https://console.cloud.google.com/apis/library/calendar-json.googleapis.com"} target="_blank" rel="noreferrer">Ativar API <ExternalLink size={12} /></a></div>;
}
