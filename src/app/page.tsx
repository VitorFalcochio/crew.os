import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bot,
  Check,
  Clock3,
  Network,
  Play,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Avatar } from "@/components/ui/avatar";

const employees = [
  { name: "Ana", initials: "AN", color: "#8b5cf6", department: "Financeiro", description: "Controla o caixa, acompanha vencimentos e prepara cobranças.", icon: BarChart3 },
  { name: "Carlos", initials: "CA", color: "#3b82f6", department: "Compras", description: "Compara fornecedores, preços, prazos e condições.", icon: BadgeCheck },
  { name: "Sofia", initials: "SO", color: "#06b6d4", department: "Atendimento", description: "Organiza solicitações e responde clientes com consistência.", icon: Sparkles },
  { name: "Lucas", initials: "LU", color: "#f59e0b", department: "Comercial", description: "Qualifica oportunidades e mantém o funil em movimento.", icon: Zap },
];

const steps = [
  ["01", "Monte sua equipe", "Escolha funcionários digitais especializados nos departamentos da sua empresa."],
  ["02", "Conecte o contexto", "Integre ferramentas, documentos e regras para sua equipe trabalhar do seu jeito."],
  ["03", "Delegue o resultado", "Diga o que precisa acontecer. A CrewOS planeja, executa e presta contas."],
];

export default function Home() {
  return <main className="landing-page">
    <header className="landing-nav">
      <Link href="/" className="landing-logo" aria-label="CrewOS — página inicial"><Logo /></Link>
      <nav aria-label="Navegação principal"><a href="#produto">Produto</a><a href="#equipe">Equipe digital</a><a href="#como-funciona">Como funciona</a></nav>
      <div className="landing-nav-actions"><Link href="/login">Entrar</Link><Link href="/cadastro" className="landing-nav-cta">Começar agora <ArrowRight size={13} /></Link></div>
    </header>

    <section className="landing-hero">
      <div className="landing-hero-grid" aria-hidden="true" />
      <div className="landing-hero-copy">
        <span className="landing-pill"><i /> A nova força de trabalho digital</span>
        <h1>Sua empresa.<br />Sua equipe <em>digital.</em></h1>
        <p>Contrate funcionários de IA especializados para executar, colaborar e gerar resultados todos os dias.</p>
      </div>

      <div className="landing-robot-wrap">
        <div className="landing-robot-glow" />
        <Image src="/crewos-humanoide.png" alt="Funcionário digital humanoide da CrewOS usando uniforme amarelo" width={1024} height={1536} priority sizes="(max-width: 700px) 92vw, 660px" />
      </div>

      <div className="landing-float-card landing-float-left"><span><Network size={15} /></span><div><strong>5 funcionários</strong><small>trabalhando agora</small></div><i /></div>
      <div className="landing-float-card landing-float-right"><span><Clock3 size={15} /></span><div><strong>Operação 24/7</strong><small>sem perder contexto</small></div></div>

      <div className="landing-hero-actions">
        <Link href="/cadastro" className="landing-primary-cta">Criar minha equipe <ArrowRight size={16} /></Link>
        <a href="#produto" className="landing-secondary-cta"><Play size={13} fill="currentColor" /> Conhecer a CrewOS</a>
      </div>
      <div className="landing-scroll"><span>Descubra</span><i /></div>
    </section>

    <section className="landing-proof" aria-label="Benefícios"><span><Check size={13} /> Configuração em minutos</span><span><ShieldCheck size={13} /> Você mantém o controle</span><span><Zap size={13} /> Trabalho contínuo</span><span><Bot size={13} /> Especialistas por departamento</span></section>

    <section className="landing-section landing-product" id="produto">
      <div className="landing-section-heading"><span className="landing-section-number">01 / PRODUTO</span><h2>Não é mais uma ferramenta.<br />É a sua <em>equipe.</em></h2><p>A CrewOS reúne funcionários digitais, contexto empresarial, integrações e controle humano em um único sistema operacional.</p></div>
      <div className="landing-product-grid">
        <article className="landing-feature-main"><div className="landing-feature-visual"><span className="landing-orbit one" /><span className="landing-orbit two" /><div className="landing-core"><Image src="/crewos-logo.png" alt="" width={68} height={68} /></div><div className="landing-node node-one">Financeiro</div><div className="landing-node node-two">Comercial</div><div className="landing-node node-three">Atendimento</div></div><div><span>INTELIGÊNCIA COORDENADA</span><h3>Uma equipe que trabalha em conjunto</h3><p>Seus funcionários compartilham contexto, colaboram entre departamentos e sabem quando chamar você.</p></div></article>
        <div className="landing-feature-stack"><article><span className="landing-feature-icon"><Clock3 size={18} /></span><div><small>CONTINUIDADE</small><h3>O trabalho não para</h3><p>Rotinas, análises e acompanhamentos continuam mesmo quando você está offline.</p></div></article><article><span className="landing-feature-icon"><ShieldCheck size={18} /></span><div><small>CONTROLE</small><h3>Você decide o limite</h3><p>Ações sensíveis aguardam sua aprovação. Toda decisão fica registrada e rastreável.</p></div></article></div>
      </div>
    </section>

    <section className="landing-section landing-team" id="equipe">
      <div className="landing-section-heading row"><div><span className="landing-section-number">02 / EQUIPE DIGITAL</span><h2>Especialistas prontos<br />para <em>trabalhar.</em></h2></div><p>Comece com os departamentos que mais precisam de velocidade. Amplie sua equipe conforme a empresa cresce.</p></div>
      <div className="landing-employee-grid">{employees.map(({ name, initials, color, department, description, icon: Icon }, index) => <article key={name}><div className="landing-employee-top"><span>0{index + 1}</span><Icon size={18} /></div><div className="landing-employee-avatar"><Avatar initials={initials} color={color} size="xl" status="trabalhando" /></div><small>{department}</small><h3>{name}</h3><p>{description}</p><Link href="/cadastro">Adicionar à equipe <ArrowRight size={13} /></Link></article>)}</div>
    </section>

    <section className="landing-section landing-how" id="como-funciona">
      <div className="landing-section-heading"><span className="landing-section-number">03 / COMO FUNCIONA</span><h2>Do objetivo ao resultado,<br />sem <em>complexidade.</em></h2></div>
      <div className="landing-steps">{steps.map(([number, title, description]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div><ArrowRight size={17} /></article>)}</div>
    </section>

    <section className="landing-final-cta">
      <div className="landing-cta-grid" aria-hidden="true" /><span className="landing-pill"><i /> Sua equipe está pronta</span><h2>O futuro do trabalho<br />começa <em>agora.</em></h2><p>Crie sua empresa na CrewOS e coloque seus primeiros funcionários digitais para trabalhar.</p><Link href="/cadastro" className="landing-primary-cta">Montar minha equipe <ArrowRight size={16} /></Link>
    </section>

    <footer className="landing-footer"><Logo /><p>CrewOS é o sistema que transforma trabalho em resultado.</p><div><Link href="/login">Entrar</Link><Link href="/cadastro">Criar conta</Link></div><small>© 2026 CrewOS. Sua empresa. Sua equipe digital.</small></footer>
  </main>;
}
