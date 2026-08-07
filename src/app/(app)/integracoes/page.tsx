"use client";

import { LockKeyhole } from "lucide-react";
import { useDemo } from "@/features/demo/demo-provider";
import { PageHeader } from "@/components/layout/page-header";

export default function IntegrationsPage() {
  const { integrations, toggleIntegration } = useDemo();
  return <><PageHeader eyebrow="Integrações" title="As ferramentas que sua empresa já usa" description="Conecte fontes de dados e canais. Cada funcionário acessa somente o que você autorizar." /><div className="card card-pad" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}><span className="metric-icon"><LockKeyhole size={15} /></span><div><h3>Credenciais protegidas e permissões granulares</h3><p className="subtitle">O modo demo simula conexões. Em produção, segredos ficam no servidor e nunca são enviados ao navegador.</p></div></div><section className="integration-grid">{integrations.map((integration) => <article className="card integration-card" key={integration.id}><span className="integration-logo">{integration.initials}</span><div><h3>{integration.name}</h3><p>{integration.description}</p></div><button className={`toggle ${integration.connected ? "on" : ""}`} onClick={() => toggleIntegration(integration.id)} aria-label={`${integration.connected ? "Desconectar" : "Conectar"} ${integration.name}`}><span /></button></article>)}</section></>;
}
