import "server-only";

import { getLocalGoogleConnection, getValidLocalGoogleAccessToken } from "./local-credential-store";
import { encodeCollectionMime } from "@/features/finance/collection-email";
import type { CollectionEmailAction } from "@/types/domain";

interface GmailMessagePayload {
  id: string;
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailMessagePart;
}

interface GmailMessagePart {
  mimeType?: string;
  filename?: string;
  headers?: Array<{ name: string; value: string }>;
  body?: { data?: string; size?: number };
  parts?: GmailMessagePart[];
}

interface CalendarEventPayload {
  id: string;
  summary?: string;
  location?: string;
  htmlLink?: string;
  status?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: Array<{ email?: string }>;
  hangoutLink?: string;
}

async function googleGet<T>(url: URL, accessToken: string) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  const payload = await response.json() as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message ?? `Google API respondeu ${response.status}`);
  return payload;
}

function header(message: GmailMessagePayload, name: string) {
  return message.payload?.headers?.find((item) => item.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function decodePart(data?: string) {
  if (!data) return "";
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function findBody(part: GmailMessagePart | undefined, mimeType: string): string {
  if (!part) return "";
  if (part.mimeType === mimeType && part.body?.data) return decodePart(part.body.data);
  for (const child of part.parts ?? []) { const found = findBody(child, mimeType); if (found) return found; }
  return "";
}

function htmlToPlainText(html: string) {
  const entities: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
  return html
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1>/gi, "")
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/?\s*(p|div|li|tr|h[1-6])[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (entity) => entities[entity] ?? entity)
    .replace(/&#(\d+);/g, (_, value: string) => String.fromCharCode(Number(value)))
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function getGoogleWorkspaceMessage(messageId: string) {
  const connection = await getLocalGoogleConnection();
  if (!connection) throw new Error("Google Workspace não está conectado");
  const accessToken = await getValidLocalGoogleAccessToken();
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}`);
  url.searchParams.set("format", "full");
  const message = await googleGet<GmailMessagePayload>(url, accessToken);
  const plainBody = findBody(message.payload, "text/plain");
  const htmlBody = plainBody ? "" : findBody(message.payload, "text/html");
  return {
    id: message.id,
    threadId: message.threadId,
    from: header(message, "From") || "Remetente desconhecido",
    to: header(message, "To"),
    cc: header(message, "Cc"),
    subject: header(message, "Subject") || "Sem assunto",
    rfcMessageId: header(message, "Message-ID") || undefined,
    date: header(message, "Date") || (message.internalDate ? new Date(Number(message.internalDate)).toISOString() : undefined),
    body: (plainBody || htmlToPlainText(htmlBody) || message.snippet || "Este e-mail não possui conteúdo disponível.").slice(0, 200_000),
    snippet: message.snippet ?? "",
    unread: message.labelIds?.includes("UNREAD") ?? false,
    url: `https://mail.google.com/mail/u/0/#inbox/${message.id}`,
    account: { email: connection.email, name: connection.name },
  };
}

export async function getGoogleWorkspaceOverview() {
  const connection = await getLocalGoogleConnection();
  if (!connection) throw new Error("Google Workspace não está conectado");
  const accessToken = await getValidLocalGoogleAccessToken();

  const gmailRequest = (async () => {
    const messageListUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    messageListUrl.searchParams.set("maxResults", "15");
    const messageList = await googleGet<{ messages?: Array<{ id: string }> }>(messageListUrl, accessToken);
    return Promise.all((messageList.messages ?? []).map(async ({ id }) => {
      const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}`);
      url.searchParams.set("format", "metadata");
      for (const value of ["From", "Subject", "Date"]) url.searchParams.append("metadataHeaders", value);
      const message = await googleGet<GmailMessagePayload>(url, accessToken);
      return {
        id: message.id,
        threadId: message.threadId,
        from: header(message, "From") || "Remetente desconhecido",
        subject: header(message, "Subject") || "Sem assunto",
        date: header(message, "Date") || (message.internalDate ? new Date(Number(message.internalDate)).toISOString() : undefined),
        snippet: message.snippet ?? "",
        unread: message.labelIds?.includes("UNREAD") ?? false,
        url: `https://mail.google.com/mail/u/0/#inbox/${message.id}`,
      };
    }));
  })();

  const calendarRequest = (async () => {
    const calendarUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    calendarUrl.searchParams.set("maxResults", "50");
    calendarUrl.searchParams.set("singleEvents", "true");
    calendarUrl.searchParams.set("orderBy", "startTime");
    const now = new Date();
    calendarUrl.searchParams.set("timeMin", new Date(now.getFullYear(), now.getMonth(), 1).toISOString());
    calendarUrl.searchParams.set("timeMax", new Date(now.getFullYear(), now.getMonth() + 2, 1).toISOString());
    const calendar = await googleGet<{ items?: CalendarEventPayload[] }>(calendarUrl, accessToken);
    return (calendar.items ?? []).filter((event) => event.status !== "cancelled").map((event) => ({
      id: event.id,
      title: event.summary ?? "Evento sem título",
      start: event.start?.dateTime ?? event.start?.date,
      end: event.end?.dateTime ?? event.end?.date,
      allDay: Boolean(event.start?.date && !event.start.dateTime),
      location: event.location,
      attendees: event.attendees?.length ?? 0,
      meetingUrl: event.hangoutLink,
      url: event.htmlLink,
    }));
  })();

  const [gmail, calendar] = await Promise.allSettled([gmailRequest, calendarRequest]);

  return {
    account: { email: connection.email, name: connection.name, picture: connection.picture },
    syncedAt: new Date().toISOString(),
    messages: gmail.status === "fulfilled" ? gmail.value : [],
    events: calendar.status === "fulfilled" ? calendar.value : [],
    serviceErrors: {
      gmail: gmail.status === "rejected" ? (gmail.reason instanceof Error ? gmail.reason.message : "Gmail indisponível") : undefined,
      calendar: calendar.status === "rejected" ? (calendar.reason instanceof Error ? calendar.reason.message : "Calendar indisponível") : undefined,
    },
  };
}

export async function sendGoogleCollectionEmail(action: CollectionEmailAction) {
  return sendGoogleExternalEmail(action);
}

export async function sendGoogleExternalEmail(action: { to: string; subject: string; body: string; messageIdHeader: string; approvedAt?: string; updatedAt: string; sourceThreadId?: string; inReplyToMessageId?: string }) {
  const connection = await getLocalGoogleConnection();
  if (!connection) throw new Error("Google Workspace não está conectado");
  if (!connection.scopes.includes("https://www.googleapis.com/auth/gmail.send")) {
    throw new Error("Reconecte o Google Workspace para autorizar o envio de e-mails");
  }
  const accessToken = await getValidLocalGoogleAccessToken();
  const existing = await findSentMessageByRfcId(action.messageIdHeader, accessToken);
  if (existing) return { messageId: existing.id, threadId: existing.threadId, reconciled: true };

  const raw = encodeCollectionMime({ to: action.to, subject: action.subject, body: action.body, messageId: action.messageIdHeader, date: new Date(action.approvedAt ?? action.updatedAt), inReplyTo: action.inReplyToMessageId });
  try {
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw, ...(action.sourceThreadId ? { threadId: action.sourceThreadId } : {}) }),
      cache: "no-store",
    });
    const payload = await response.json() as { id?: string; threadId?: string; error?: { message?: string } };
    if (!response.ok || !payload.id) {
      if (response.status >= 500) {
        const reconciled = await findSentMessageByRfcId(action.messageIdHeader, accessToken);
        if (reconciled) return { messageId: reconciled.id, threadId: reconciled.threadId, reconciled: true };
      }
      throw new Error(payload.error?.message ?? `Gmail respondeu ${response.status}`);
    }
    return { messageId: payload.id, threadId: payload.threadId, reconciled: false };
  } catch (error) {
    const reconciled = await findSentMessageByRfcId(action.messageIdHeader, accessToken).catch(() => undefined);
    if (reconciled) return { messageId: reconciled.id, threadId: reconciled.threadId, reconciled: true };
    throw error;
  }
}

async function findSentMessageByRfcId(messageId: string, accessToken: string) {
  const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  url.searchParams.set("q", `in:sent rfc822msgid:${messageId}`);
  url.searchParams.set("maxResults", "1");
  const result = await googleGet<{ messages?: Array<{ id: string; threadId?: string }> }>(url, accessToken);
  return result.messages?.[0];
}
