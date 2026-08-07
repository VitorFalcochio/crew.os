"use client";

import { useState, useTransition } from "react";
import { Check, ChevronRight, LoaderCircle } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { employees } from "@/features/demo/services/seed";
import { Avatar } from "@/components/ui/avatar";
import { onboardOrganization } from "@/features/organizations/actions";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createLocalWorkspace } from "@/features/local/local-workspace";

const backendEnabled = isSupabaseConfigured();

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState(backendEnabled ? ["ana", "carlos", "sofia"] : ["ana"]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [company, setCompany] = useState({ name: "Construtora Alpha", industry: "Construção civil", size: "11-50", departments: "Financeiro, Compras, Comercial", difficulties: "Acompanhar vencimentos, cobrar clientes e comparar fornecedores sem perder prazos." });
  function toggle(id: string) { setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current); }
  function finish() { setError(""); startTransition(async () => { try { if (backendEnabled) await onboardOrganization({ ...company, employees: selected }); else { createLocalWorkspace(company, selected); router.push("/central"); } } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível criar a empresa."); } }); }

  return <main className="onboarding"><div className="onboarding-wrap"><Logo /><div className="stepper">{[1, 2, 3].map((item) => <span className={item <= step ? "done" : ""} key={item} />)}</div>
    {step === 1 && <section className="card card-pad"><p className="eyebrow">Etapa 1 de 3</p><h1>Conte um pouco sobre a empresa</h1><p className="subtitle" style={{ marginBottom: 22 }}>Isso ajuda sua equipe a começar com o contexto certo.</p><div className="form-grid"><div className="field"><label>Nome da empresa</label><input className="input" value={company.name} onChange={(event) => setCompany({ ...company, name: event.target.value })} /></div><div className="field"><label>Segmento</label><input className="input" value={company.industry} onChange={(event) => setCompany({ ...company, industry: event.target.value })} /></div><div className="field"><label>Funcionários humanos</label><select className="select" value={company.size} onChange={(event) => setCompany({ ...company, size: event.target.value })}><option>1-10</option><option>11-50</option><option>51-200</option><option>200+</option></select></div><div className="field"><label>Principais departamentos</label><input className="input" value={company.departments} onChange={(event) => setCompany({ ...company, departments: event.target.value })} /></div><div className="field full"><label>Principais dificuldades</label><textarea className="textarea" value={company.difficulties} onChange={(event) => setCompany({ ...company, difficulties: event.target.value })} /></div></div></section>}
    {step === 2 && <section><p className="eyebrow">Etapa 2 de 3</p><h1>Escolha os primeiros funcionários</h1><p className="subtitle" style={{ marginBottom: 18 }}>{backendEnabled ? "Seu plano inclui até 3. Você poderá mudar a equipe depois." : "Nesta validação, Ana é a única funcionária operacional. Os demais entram depois que o fluxo financeiro estiver aprovado."}</p><div className="employee-grid">{employees.slice(0, 5).map((employee) => { const unavailable = !backendEnabled && employee.id !== "ana"; return <button type="button" disabled={unavailable} className="card employee-card" style={{ textAlign: "left", borderColor: selected.includes(employee.id) ? "rgba(255,244,92,.5)" : undefined, opacity: unavailable ? .45 : 1 }} onClick={() => toggle(employee.id)} key={employee.id}><div className="employee-top"><Avatar initials={employee.initials} color={employee.color} size="lg" /><div className="employee-title"><h3>{employee.name}</h3><p>{unavailable ? "Disponível depois do MVP" : employee.role}</p></div>{selected.includes(employee.id) && <span className="metric-icon"><Check size={14} /></span>}</div><p className="subtitle">{employee.description}</p></button>; })}</div></section>}
    {step === 3 && <section className="card card-pad" style={{ textAlign: "center", padding: "52px 28px" }}><div className="onboarding-logo"><Logo iconOnly /></div><h1>Sua equipe está pronta.</h1><p className="subtitle" style={{ margin: "10px auto 24px" }}>Vamos criar o espaço da {company.name}, configurar {selected.length} funcionários e preparar a Central da Empresa.</p>{error && <div className="form-alert error">{error}</div>}<Button size="lg" disabled={pending || selected.length === 0} onClick={finish}>{pending ? <LoaderCircle size={15} className="spin" /> : <>Criar minha empresa <ChevronRight size={15} /></>}</Button></section>}
    {step < 3 && <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}><Button variant="ghost" disabled={step === 1} onClick={() => setStep((value) => value - 1)}>Voltar</Button><Button disabled={(step === 1 && (!company.name.trim() || !company.industry.trim())) || (step === 2 && selected.length === 0)} onClick={() => setStep((value) => value + 1)}>Continuar <ChevronRight size={15} /></Button></div>}
  </div></main>;
}
