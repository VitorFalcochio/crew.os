import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { WaitlistForm } from "./waitlist-form";
import styles from "./waitlist.module.css";

export const metadata: Metadata = { title: "Lista de espera", description: "Entre na lista de espera da CrewOS e acompanhe o desenvolvimento da sua futura equipe digital." };

const crew = [{ name: "Ana", area: "Financeiro", image: "/employees/ana.png" }, { name: "Carlos", area: "Compras", image: "/employees/carlos.png" }, { name: "Sofia", area: "Atendimento", image: "/employees/sofia.png" }, { name: "Lucas", area: "Comercial", image: "/employees/lucas.png" }];

export default function WaitlistPage() {
  return <main className={styles.page} id="top">
    <header className={styles.header}><Link href="/"><Logo /></Link><nav><Link href="/"><ArrowLeft size={13} /> Conhecer a CrewOS</Link><Link href="/acesso"><LockKeyhole size={13} /> Painel protegido</Link></nav></header>
    <section className={styles.hero}>
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.copy}>
        <span className={styles.pill}><i /> Construindo em público</span>
        <h1>Sua próxima equipe<br />pode ser <em>digital.</em></h1>
        <p>Estamos criando funcionários de IA especializados que entendem sua empresa, trabalham juntos e mantêm você no controle das decisões importantes.</p>
        <ul><li><Check size={14} /> Prioridade nos primeiros acessos</li><li><Check size={14} /> Bastidores do desenvolvimento</li><li><Check size={14} /> Convites para testar novas capacidades</li></ul>
        <div className={styles.crew}><div>{crew.map((member) => <Image key={member.name} src={member.image} alt={member.name} width={38} height={38} />)}</div><span><strong>4 especialistas em validação</strong><small>Financeiro, Compras, Atendimento e Comercial</small></span></div>
      </div>
      <WaitlistForm />
    </section>
    <section className={styles.preview}>
      <div><span>O QUE VOCÊ VAI ACOMPANHAR</span><h2>Uma empresa operando com uma <em>Crew.</em></h2><p>Da cobrança real por Gmail ao relacionamento com clientes e fornecedores — sempre com aprovação humana.</p></div>
      <div className={styles.crewCards}>{crew.map((member) => <article key={member.name}><Image src={member.image} alt={`${member.name}, ${member.area}`} width={320} height={320} /><span>{member.area}</span><strong>{member.name}</strong></article>)}</div>
    </section>
    <section className={styles.bottomCta}><Sparkles size={20} /><h2>Quer acompanhar desde o começo?</h2><p>Entre na fila agora. Quando chegar sua vez, enviaremos o convite pelo e-mail cadastrado.</p><a href="#top" className={styles.anchor}>Preencher cadastro <ArrowRight size={14} /></a></section>
    <footer><Logo /><span><ShieldCheck size={13} /> Dados protegidos</span><Link href="/acesso">Já tenho acesso</Link></footer>
  </main>;
}
