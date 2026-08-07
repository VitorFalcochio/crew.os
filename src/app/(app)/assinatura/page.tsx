"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, CreditCard, Download, Save, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/features/demo/demo-provider";
import { currency } from "@/lib/utils";

export default function BillingPage() {
  const { employees, account } = useDemo();
  const [editingCard, setEditingCard] = useState(false);
  const [card, setCard] = useState({ number: "•••• •••• •••• 4242", holder: account.name, expiry: "12/29" });
  const hired = employees.filter((employee) => employee.hired);
  const included = 3;
  const additional = Math.max(0, hired.length - included);
  const extraTotal = hired.slice(included).reduce((total, employee) => total + employee.monthlyPrice, 0);
  const total = 299 + extraTotal;
  function updateCard(event: React.FormEvent) { event.preventDefault(); setEditingCard(false); toast.success("Forma de pagamento atualizada"); }
  function downloadInvoice() {
    const invoice = [`CREWOS — COMPROVANTE DE ASSINATURA`, `Empresa: ${account.organization}`, `Competência: Julho de 2026`, `Plano Crew Starter: ${currency(299)}`, `Funcionários adicionais: ${currency(extraTotal)}`, `Total pago: ${currency(total)}`, `Status: Pago`].join("\r\n");
    const url = URL.createObjectURL(new Blob([invoice], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "comprovante-crewos-julho-2026.txt"; anchor.click(); URL.revokeObjectURL(url);
    toast.success("Comprovante baixado");
  }
  return <><PageHeader eyebrow="Assinatura" title="Plano e investimento da sua equipe" description="Acompanhe o custo mensal e ajuste sua capacidade conforme a empresa cresce." action={<Link href="/store"><Button>Contratar mais funcionários</Button></Link>} />
    <div className="profile-grid"><section className="card plan-card"><div className="plan-header"><div><span className="status-pill success"><i />Plano ativo</span><h1 style={{ marginTop: 12 }}>Crew Starter</h1><p className="subtitle">Até 3 funcionários digitais incluídos.</p></div><div className="plan-price"><strong>{currency(299)}</strong><p className="subtitle">por mês</p></div></div><div className="plan-breakdown"><div className="plan-row"><span>Plano Crew Starter</span><strong>{currency(299)}</strong></div><div className="plan-row"><span>{additional} funcionário(s) adicional(is)</span><strong>{currency(extraTotal)}</strong></div><div className="plan-row total"><span>Total mensal</span><strong>{currency(total)}</strong></div></div></section>
      <aside className="card card-pad"><div className="settings-section-head"><span className="metric-icon"><CreditCard size={16} /></span><div><h2>Forma de pagamento</h2><p className="subtitle">Próxima cobrança em 18/08/2026</p></div></div>{editingCard ? <form onSubmit={updateCard} className="payment-form"><div className="field"><label>Número do cartão</label><input className="input" required value={card.number} onChange={(event) => setCard({ ...card, number: event.target.value })} /></div><div className="field"><label>Nome no cartão</label><input className="input" required value={card.holder} onChange={(event) => setCard({ ...card, holder: event.target.value })} /></div><div className="field"><label>Validade</label><input className="input" required value={card.expiry} onChange={(event) => setCard({ ...card, expiry: event.target.value })} /></div><div className="payment-actions"><Button type="button" variant="ghost" size="sm" onClick={() => setEditingCard(false)}><X size={13} />Cancelar</Button><Button type="submit" size="sm"><Save size={13} />Salvar cartão</Button></div></form> : <><div className="detail-box payment-card"><CreditCard size={20} /><div><strong>Visa final {card.number.slice(-4)}</strong><p className="subtitle">{card.holder} · {card.expiry}</p></div></div><Button variant="ghost" size="sm" style={{ marginTop: 12 }} onClick={() => setEditingCard(true)}>Atualizar cartão</Button></>}</aside></div>
    <div className="section-title"><h2>Funcionários da assinatura</h2><span className="subtitle">{hired.length} ativos · {included} incluídos</span></div><section className="card table-wrap"><table className="data-table"><thead><tr><th>Funcionário</th><th>Tipo</th><th>Valor mensal</th><th>Situação</th></tr></thead><tbody>{hired.map((employee, index) => <tr key={employee.id}><td><strong>{employee.name}</strong><div className="muted">{employee.role}</div></td><td>{index < included ? "Incluído no plano" : employee.level}</td><td>{index < included ? currency(0) : currency(employee.monthlyPrice)}</td><td><span style={{ color: "#4ade80", fontSize: 10 }}><Check size={12} style={{ display: "inline", verticalAlign: -2 }} /> Ativo</span></td></tr>)}</tbody></table></section>
    <div className="section-title"><h2>Histórico</h2></div><article className="card card-pad billing-history"><div><strong>Julho de 2026</strong><p className="subtitle">Crew Starter + adicionais · Pago</p></div><Button variant="ghost" size="sm" onClick={downloadInvoice}><Download size={13} />Baixar comprovante</Button></article>
  </>;
}
