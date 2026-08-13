import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { LandingCinematic } from "./landing-cinematic";
import styles from "./landing-hero.module.css";
import experience from "./landing-experience.module.css";

const employees = [
  { name: "Ana", image: "/employees/ana.png", department: "Financeiro", description: "Organiza documentos, acompanha o caixa e prepara cobranças." },
  { name: "Carlos", image: "/employees/carlos.png", department: "Compras", description: "Compara fornecedores, preços, prazos e condições." },
  { name: "Sofia", image: "/employees/sofia.png", department: "Atendimento", description: "Resolve solicitações e mantém o contexto de cada cliente." },
  { name: "Lucas", image: "/employees/lucas.png", department: "Comercial", description: "Qualifica oportunidades e mantém o funil em movimento." },
  { name: "Julia", image: "/employees/julia.png", department: "Marketing", description: "Planeja campanhas e transforma estratégia em conteúdo." },
  { name: "Marta", image: "/employees/marta.png", department: "Fiscal", description: "Monitora obrigações e sinaliza riscos antes do prazo." },
  { name: "Rafael", image: "/employees/rafael.png", department: "Imobiliário", description: "Acompanha leads, imóveis e oportunidades comerciais." },
];

export default function Home() {
  return <main className="landing-page landing-page-cinematic">
    <header className="landing-nav">
      <Link href="/" className="landing-logo" aria-label="CrewOS — página inicial"><Logo /></Link>
      <nav aria-label="Navegação principal"><a href="#produto">Produto</a><a href="#equipe">Equipe digital</a><a href="#integracoes">Integrações</a><a href="#produto">Como funciona</a></nav>
      <div className="landing-nav-actions"><Link href="/acesso">Entrar</Link><Link href="/lista-de-espera" className="landing-nav-cta">Entrar na lista <ArrowRight size={13} /></Link></div>
    </header>

    <section className="landing-hero">
      <div className="landing-hero-grid" aria-hidden="true" />
      <div className={`landing-hero-copy ${styles.heroCopy}`}>
        <span className="landing-pill"><i /> A nova força de trabalho digital</span>
        <h1>Sua empresa.<br />Sua equipe <em>digital.</em></h1>
        <p>Contrate funcionários de IA especializados para executar, colaborar e gerar resultados todos os dias.</p>
        <div className={`landing-hero-actions ${styles.heroActions}`}>
          <Link href="/lista-de-espera" className="landing-primary-cta">Entrar na lista de espera <ArrowRight size={16} /></Link>
          <a href="#produto" className="landing-secondary-cta"><Play size={13} fill="currentColor" /> Conhecer a CrewOS</a>
        </div>
      </div>

      <div className={`landing-robot-wrap ${styles.robotWrap}`}>
        <div className="landing-robot-glow" />
        <Image src="/crewos-humanoide.png" alt="Funcionário digital humanoide da CrewOS usando uniforme amarelo" width={1024} height={1536} priority sizes="(max-width: 700px) 92vw, 660px" />
      </div>

      <div className="landing-scroll"><span>Descubra</span><i /></div>
    </section>

    <section className={experience.team} id="equipe">
      <div className={experience.teamHeading}>
        <div><span>02 · SUA EQUIPE DIGITAL</span><h2>Um especialista para<br />cada parte da <em>empresa.</em></h2></div>
        <p>Comece por uma área e amplie conforme a operação cresce. Cada funcionário possui contexto, ferramentas e responsabilidades próprias.</p>
      </div>
      <div className={experience.employeeRail}>
        {employees.map((employee, index) => (
          <article key={employee.name}>
            <div className={experience.employeePhoto}><Image src={employee.image} alt={`${employee.name}, especialista de ${employee.department}`} fill sizes="(max-width: 600px) 78vw, 280px" /></div>
            <div className={experience.employeeInfo}><span>0{index + 1} · {employee.department}</span><h3>{employee.name}</h3><p>{employee.description}</p><Link href="/lista-de-espera">Quero acesso antecipado <ArrowRight size={14} /></Link></div>
          </article>
        ))}
      </div>
    </section>

    <LandingCinematic employees={employees} />

    <footer className={experience.footer}><Logo /><p>CrewOS é o sistema operacional da sua equipe digital.</p><div><Link href="/acesso">Painel</Link><Link href="/lista-de-espera">Lista de espera</Link></div><small>© 2026 CrewOS. Sua empresa. Sua equipe digital.</small></footer>
  </main>;
}
