"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink, LoaderCircle, Mail, ShieldAlert } from "lucide-react";
import styles from "./email-reader.module.css";

interface GoogleMessageDetail {
  id: string;
  from: string;
  to?: string;
  cc?: string;
  subject: string;
  date?: string;
  body: string;
  unread: boolean;
  url: string;
  account: { email: string; name?: string };
}

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short" });

function senderName(from: string) {
  const match = from.match(/^([^<]+)</);
  return (match?.[1] ?? from.split("@")[0]).replaceAll('"', "").trim();
}

function senderEmail(from: string) {
  return from.match(/<([^>]+)>/)?.[1] ?? from;
}

export default function EmailReaderPage() {
  const { id } = useParams<{ id: string }>();
  const [message, setMessage] = useState<GoogleMessageDetail>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/integrations/google/messages/${encodeURIComponent(id)}`, { cache: "no-store", signal: controller.signal });
        const payload = await response.json() as { data?: GoogleMessageDetail; error?: string };
        if (!response.ok || !payload.data) throw new Error(payload.error ?? "Não foi possível abrir este e-mail");
        setMessage(payload.data);
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Não foi possível abrir este e-mail");
      }
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [id]);

  return <div className={styles.readerPage}>
    <header className={styles.readerToolbar}>
      <Link href="/workspace"><ArrowLeft size={15} />Voltar à caixa de entrada</Link>
      {message && <a href={message.url} target="_blank" rel="noreferrer">Abrir no Gmail <ExternalLink size={13} /></a>}
    </header>

    {!message && !error && <div className={styles.loading}><LoaderCircle size={22} /><strong>Abrindo e-mail</strong><p>Carregando a mensagem com segurança…</p></div>}
    {error && <div className={styles.error}><Mail size={22} /><strong>Não foi possível abrir este e-mail</strong><p>{error}</p><Link href="/workspace">Voltar ao Workspace</Link></div>}

    {message && <article className={styles.message}>
      <header className={styles.messageHeader}>
        <p>GMAIL · {message.account.email}</p>
        <h1>{message.subject}</h1>
        <div className={styles.sender}>
          <span>{senderName(message.from)[0]?.toUpperCase() ?? "?"}</span>
          <div><strong>{senderName(message.from)}</strong><small>{senderEmail(message.from)}</small></div>
          <time>{message.date ? dateTime.format(new Date(message.date)) : "Data não informada"}</time>
        </div>
        <dl><div><dt>Para</dt><dd>{message.to || message.account.email}</dd></div>{message.cc && <div><dt>Cc</dt><dd>{message.cc}</dd></div>}</dl>
      </header>

      <div className={styles.safety}><ShieldAlert size={14} /><p>Conteúdo externo exibido como texto. Links, imagens e códigos do e-mail não são executados dentro da CrewOS.</p></div>
      <div className={styles.messageBody}>{message.body}</div>
      <footer><a href={message.url} target="_blank" rel="noreferrer">Responder ou ver formatação original no Gmail <ExternalLink size={13} /></a></footer>
    </article>}
  </div>;
}
