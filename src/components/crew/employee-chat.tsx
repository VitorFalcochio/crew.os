"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Paperclip, Send, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/features/demo/demo-provider";
import { answerEmployeeQuestion, buildEmployeeChatContext, employeeGreeting } from "@/features/crew/employee-chat";
import type { Employee } from "@/types/domain";

interface ChatMessage {
  id: string;
  from: "user" | "employee";
  text: string;
}

const CHAT_STORAGE_KEY = "crewos-employee-chats-v1";

function suggestionsFor(employeeId: string) {
  if (employeeId === "ana") return ["Quanto tenho para pagar?", "Quem está me devendo?", "Como está a projeção de caixa?"];
  if (employeeId === "carlos") return ["O que aguarda aprovação?", "Qual fornecedor você recomenda?", "Qual a economia estimada?"];
  return ["O que você pode fazer?", "Quais tarefas estão em andamento?", "Como você pode me ajudar?"];
}

function initialMessages(employee: Employee): ChatMessage[] {
  return [{ id: crypto.randomUUID(), from: "employee", text: employeeGreeting(employee) }];
}

export function EmployeeChat({ employee }: { employee: Employee }) {
  const demo = useDemo();
  const { account, tasks, approvals, financialEntries, financialDocuments, procurementRequests, supplierQuotes } = demo;
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => initialMessages(employee));
  const [loaded, setLoaded] = useState(false);
  const [replying, setReplying] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const stored = JSON.parse(window.localStorage.getItem(CHAT_STORAGE_KEY) ?? "{}") as Record<string, ChatMessage[]>;
        if (stored[employee.id]?.length) setMessages(stored[employee.id]);
      } catch {
        /* inicia uma conversa nova */
      }
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [employee.id]);

  useEffect(() => {
    if (!loaded || !messages.length) return;
    try {
      const stored = JSON.parse(window.localStorage.getItem(CHAT_STORAGE_KEY) ?? "{}") as Record<string, ChatMessage[]>;
      stored[employee.id] = messages.slice(-60);
      window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(stored));
    } catch {
      /* histórico continua disponível durante a sessão */
    }
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [employee.id, loaded, messages]);

  async function sendMessage(text = message) {
    const trimmed = text.trim();
    if ((!trimmed && !attachment) || replying) return;
    const sent = `${trimmed}${attachment ? `${trimmed ? " · " : ""}Anexo: ${attachment.name}` : ""}`;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), from: "user", text: sent };
    const recentHistory = messages.slice(-12).map(({ from, text: historyText }) => ({ from, text: historyText }));
    setMessages((current) => [...current, userMessage]);
    setMessage("");
    setAttachment(null);
    setReplying(true);
    const chatState = { tasks, approvals, financialEntries, financialDocuments, procurementRequests, supplierQuotes };
    let responseText = "";
    try {
      const response = await fetch(`/api/employees/${employee.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: sent, history: recentHistory, context: buildEmployeeChatContext(employee, chatState, account.organization) }),
      });
      const payload = await response.json() as { text?: string };
      if (response.ok && payload.text) responseText = payload.text;
    } catch {
      /* usa a inteligência local abaixo */
    }
    if (!responseText) responseText = answerEmployeeQuestion(employee, sent, chatState);
    setMessages((current) => [...current, { id: crypto.randomUUID(), from: "employee", text: responseText }]);
    setReplying(false);
  }

  const userInitials = account.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <section className="employee-chat">
      <header className="employee-chat-head">
        <Avatar initials={employee.initials} color={employee.color} size="md" status={employee.status} />
        <div><h2>{employee.name}</h2><p>{employee.role} · contexto e memória exclusivos</p></div>
        <span><i /> Disponível</span>
      </header>
      <div className="employee-chat-suggestions">
        {suggestionsFor(employee.id).map((suggestion) => <button key={suggestion} onClick={() => void sendMessage(suggestion)} disabled={replying}>{suggestion}</button>)}
      </div>
      <div className="employee-chat-messages" aria-live="polite">
        {messages.map((item) => (
          <div className={`employee-chat-row ${item.from}`} key={item.id}>
            {item.from === "employee" ? <Avatar initials={employee.initials} color={employee.color} size="sm" /> : <span className="employee-chat-user-avatar">{userInitials}</span>}
            <div><strong>{item.from === "employee" ? employee.name : "Você"}</strong><p>{item.text}</p></div>
          </div>
        ))}
        {replying && <div className="employee-chat-row employee typing"><Avatar initials={employee.initials} color={employee.color} size="sm" /><div><strong>{employee.name}</strong><p><i /><i /><i /></p></div></div>}
        <div ref={endRef} />
      </div>
      {attachment && <div className="attachment-preview"><Paperclip size={13} /><span>{attachment.name}</span><button onClick={() => setAttachment(null)} aria-label="Remover anexo"><X size={12} /></button></div>}
      <div className="employee-chat-compose">
        <input ref={fileInput} type="file" hidden onChange={(event) => setAttachment(event.target.files?.[0] ?? null)} />
        <button className="icon-button" aria-label="Anexar arquivo" onClick={() => fileInput.current?.click()}><Paperclip size={16} /></button>
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder={`Pergunte algo para ${employee.name}...`} rows={1} />
        <Button onClick={() => void sendMessage()} disabled={replying || (!message.trim() && !attachment)} aria-label="Enviar mensagem">{replying ? <LoaderCircle className="spin" size={15} /> : <Send size={15} />}</Button>
      </div>
      <footer>As respostas respeitam as permissões de {employee.name}. Ações externas continuam exigindo aprovação.</footer>
    </section>
  );
}
