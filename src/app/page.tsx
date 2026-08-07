import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Activity,
  BadgeCheck,
  Bot,
  BrainCircuit,
  Check,
  Clock3,
  FileCheck2,
  Network,
  Play,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
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
      <div className={`landing-hero-copy ${styles.heroCopy}`}>
        <span className="landing-pill"><i /> A nova força de trabalho digital</span>
        <h1>Sua empresa.<br />Sua equipe <em>digital.</em></h1>
        <p>Contrate funcionários de IA especializados para executar, colaborar e gerar resultados todos os dias.</p>
        <div className={`landing-hero-actions ${styles.heroActions}`}>
          <Link href="/cadastro" className="landing-primary-cta">Criar minha equipe <ArrowRight size={16} /></Link>
          <a href="#produto" className="landing-secondary-cta"><Play size={13} fill="currentColor" /> Conhecer a CrewOS</a>
        </div>
      </div>

      <div className={`landing-robot-wrap ${styles.robotWrap}`}>
        <div className="landing-robot-glow" />
        <Image src="/crewos-humanoide.png" alt="Funcionário digital humanoide da CrewOS usando uniforme amarelo" width={1024} height={1536} priority sizes="(max-width: 700px) 92vw, 660px" />
      </div>

      <div className="landing-float-card landing-float-left"><span><Network size={15} /></span><div><strong>5 funcionários</strong><small>trabalhando agora</small></div><i /></div>
      <div className="landing-float-card landing-float-right"><span><Clock3 size={15} /></span><div><strong>Operação 24/7</strong><small>sem perder contexto</small></div></div>

      <div className="landing-scroll"><span>Descubra</span><i /></div>
    </section>

    <section className={experience.proof} aria-label="Benefícios">
      <span><Check size={14} /> Configuração em minutos</span>
      <span><ShieldCheck size={14} /> Controle humano</span>
      <span><Zap size={14} /> Operação contínua</span>
      <span><Bot size={14} /> Especialistas por área</span>
    </section>

    <section className={experience.operation} id="produto">
      <div className={experience.sectionIntro}>
        <span>01 · A CREW EM OPERAÇÃO</span>
        <h2>Você diz o objetivo.<br />A equipe faz <em>acontecer.</em></h2>
        <p>O Diretor entende o que precisa ser feito, escolhe os especialistas certos e acompanha cada entrega sem perder o contexto da empresa.</p>
      </div>

      <div className={experience.operationStage}>
        <div className={experience.commandSide}>
          <div className={experience.commandLabel}><Sparkles size={15} /><span>Objetivo da empresa</span></div>
          <blockquote>“Revise o caixa deste mês e encontre oportunidades para reduzir custos com fornecedores.”</blockquote>
          <div className={experience.directorReply}>
            <span><BrainCircuit size={18} /></span>
            <div><small>DIRETOR CREW</small><strong>Plano criado. Duas frentes coordenadas.</strong><p>Vou acionar Financeiro e Compras, preservar as aprovações e acompanhar os resultados.</p></div>
          </div>
        </div>

        <div className={experience.executionSide}>
          <header><div><i /> Execução ao vivo</div><span>2 especialistas ativos</span></header>
          <div className={experience.assignment}>
            <Image src="/employees/ana.png" alt="Ana, especialista financeira" width={44} height={44} />
            <div><small>ANA · FINANCEIRO</small><strong>Analisando caixa e vencimentos</strong><span><b style={{ width: "82%" }} /></span></div>
            <em>82%</em>
          </div>
          <div className={experience.assignment}>
            <Image src="/employees/carlos.png" alt="Carlos, especialista em compras" width={44} height={44} />
            <div><small>CARLOS · COMPRAS</small><strong>Comparando contratos recorrentes</strong><span><b style={{ width: "64%" }} /></span></div>
            <em>64%</em>
          </div>
          <div className={experience.handoff}><Network size={15} /><div><strong>Contexto compartilhado</strong><p>Ana sinalizou dois fornecedores para renegociação.</p></div><Check size={14} /></div>
          <footer><Activity size={14} /> Tudo registrado na atividade da Crew</footer>
        </div>
      </div>
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
            <div className={experience.employeeInfo}><span>0{index + 1} · {employee.department}</span><h3>{employee.name}</h3><p>{employee.description}</p><Link href="/cadastro">Adicionar à equipe <ArrowRight size={14} /></Link></div>
          </article>
        ))}
      </div>
    </section>

    <section className={experience.control}>
      <div className={experience.controlCopy}>
        <span>03 · CONTROLE HUMANO</span>
        <h2>Autonomia sem<br />perder o <em>controle.</em></h2>
        <p>A Crew trabalha sozinha dentro dos limites que você definir. Decisões sensíveis chegam com contexto, impacto e dados usados.</p>
        <ul><li><Check size={14} /> Limites diferentes por funcionário</li><li><Check size={14} /> Aprovação antes de ações sensíveis</li><li><Check size={14} /> Histórico completo e rastreável</li></ul>
      </div>
      <div className={experience.approvalDemo}>
        <header><span><BadgeCheck size={16} /></span><div><small>APROVAÇÃO SOLICITADA</small><strong>Ana · Financeiro</strong></div><em>Agora</em></header>
        <h3>Enviar cobrança · Beta Engenharia</h3>
        <strong className={experience.approvalValue}>R$ 6.730</strong>
        <dl><div><dt>Motivo</dt><dd>Pagamento vencido há 7 dias.</dd></div><div><dt>Impacto</dt><dd>Recupera o valor no caixa desta semana.</dd></div></dl>
        <div className={experience.approvalButtons}><span>Aprovar</span><span>Editar</span><span>Recusar</span></div>
        <footer><FileCheck2 size={13} /> A decisão ficará registrada na auditoria.</footer>
      </div>
    </section>

    <section className={experience.how} id="como-funciona">
      <div className={experience.sectionIntro}><span>04 · COMO COMEÇAR</span><h2>Da configuração ao resultado,<br />sem <em>complexidade.</em></h2></div>
      <div className={experience.steps}>{steps.map(([number, title, description]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div><ArrowRight size={18} /></article>)}</div>
    </section>

    <section className={experience.finalCta}>
      <div className={experience.finalGlow} aria-hidden="true" />
      <span className="landing-pill"><i /> Sua equipe está pronta</span>
      <h2>Coloque sua empresa<br />em <em>movimento.</em></h2>
      <p>Monte sua primeira equipe digital e delegue o próximo resultado que precisa acontecer.</p>
      <Link href="/cadastro" className="landing-primary-cta">Criar minha equipe <ArrowRight size={16} /></Link>
    </section>

    <footer className={experience.footer}><Logo /><p>CrewOS é o sistema operacional da sua equipe digital.</p><div><Link href="/login">Entrar</Link><Link href="/cadastro">Criar conta</Link></div><small>© 2026 CrewOS. Sua empresa. Sua equipe digital.</small></footer>
  </main>;
}
