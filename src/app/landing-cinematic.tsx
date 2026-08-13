"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, Check, Clock3, ShieldCheck, Sparkles } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import gmailLogo from "../../assets/integrations/gmail.svg";
import googleDriveLogo from "../../assets/integrations/googledrive.png";
import contaAzulLogo from "../../assets/integrations/contaazul.jpg";
import omieLogo from "../../assets/integrations/omie.png";
import slackLogo from "../../assets/integrations/slack.png";
import styles from "./landing-cinematic.module.css";

export interface LandingEmployee {
  name: string;
  image: string;
  department: string;
  description: string;
}

const workflow = [
  { name: "Sofia", role: "Atendimento", x: 19, y: 31, activity: "Interpretando solicitação…", checks: ["Solicitação interpretada", "Cliente identificado", "Contexto recuperado"] },
  { name: "Lucas", role: "Comercial", x: 45, y: 66, activity: "Analisando oportunidade…", checks: ["Lead qualificado", "Oportunidade criada", "Próxima ação definida"] },
  { name: "Ana", role: "Financeiro", x: 70, y: 28, activity: "Validando condição financeira…", checks: ["Condição analisada", "Pagamento identificado", "Financeiro atualizado"] },
  { name: "Marta", role: "Fiscal", x: 86, y: 66, activity: "Validando documentação…", checks: ["Documento conferido", "Informação validada"] },
];

const integrationItems: Array<{ name: string; status: string; logo?: StaticImageData; initials?: string }> = [
  { name: "Gmail", status: "DISPONÍVEL", logo: gmailLogo },
  { name: "Google Drive", status: "DISPONÍVEL", logo: googleDriveLogo },
  { name: "WhatsApp", status: "DISPONÍVEL", initials: "WA" },
  { name: "Conta Azul", status: "DISPONÍVEL", logo: contaAzulLogo },
  { name: "Omie", status: "EM BREVE", logo: omieLogo },
  { name: "Slack", status: "EM BREVE", logo: slackLogo },
];

const demoActivities = [
  { name: "Ana", detail: "Conferindo pagamentos", time: "Agora", initials: "AN" },
  { name: "Lucas", detail: "Qualificando oportunidades", time: "há 1 min", initials: "LU" },
  { name: "Sofia", detail: "Respondendo clientes", time: "há 2 min", initials: "SO" },
  { name: "Julia", detail: "Preparando campanha", time: "há 4 min", initials: "JU" },
];

export function LandingCinematic({ employees }: { employees: LandingEmployee[] }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scope = root.current;
    if (!scope) return;
    gsap.registerPlugin(ScrollTrigger);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const useSmoothScroll = window.matchMedia("(min-width: 901px) and (pointer: fine)").matches;
    const lenis = useSmoothScroll ? new Lenis({ lerp: 0.18, smoothWheel: true, wheelMultiplier: 1 }) : undefined;
    const onScroll = () => ScrollTrigger.update();
    const tick = (time: number) => lenis?.raf(time * 1000);
    if (lenis) {
      lenis.on("scroll", onScroll);
      gsap.ticker.add(tick);
    }

    const ctx = gsap.context(() => {
      const desktop = window.matchMedia("(min-width: 901px)").matches;

      if (desktop) {
        gsap.timeline({ scrollTrigger: { trigger: "[data-scene='transition']", start: "top top", end: "bottom bottom", scrub: 0.16 } })
          .fromTo("[data-transition-title='individual']", { opacity: 1 }, { opacity: 0.08, yPercent: -35, duration: 0.24 })
          .fromTo("[data-crew-node]", { opacity: 0, scale: 0.75 }, { opacity: 1, scale: 1, stagger: 0.04, duration: 0.28 }, 0.16)
          .fromTo("[data-network-line]", { strokeDashoffset: 1 }, { strokeDashoffset: 0, stagger: 0.035, duration: 0.36 }, 0.24)
          .fromTo("[data-transition-title='together']", { opacity: 0, yPercent: 30 }, { opacity: 1, yPercent: 0, duration: 0.3 }, 0.56);

        const work = gsap.timeline({ scrollTrigger: { trigger: "[data-scene='workflow']", start: "top top", end: "bottom bottom", scrub: 0.14 } });
        work.fromTo("[data-work-intro]", { opacity: 1 }, { opacity: 0.1, yPercent: -20, duration: 0.06 });
        workflow.forEach((_, index) => {
          const position = 0.08 + index * 0.18;
          work.to(`[data-route='${index}']`, { strokeDashoffset: 0, duration: 0.11 }, position)
            .to(`[data-agent='${index}']`, { opacity: 1, scale: 1, duration: 0.06 }, position + 0.07)
            .to(`[data-packet='${index}']`, { opacity: 1, offsetDistance: "100%", duration: 0.09 }, position + 0.02)
            .to(`[data-agent='${index}'] [data-check]`, { opacity: 1, y: 0, stagger: 0.012, duration: 0.04 }, position + 0.11);
        });
        work.to("[data-operation-result]", { opacity: 1, scale: 1, duration: 0.08 }, 0.8)
          .to("[data-operation-map]", { opacity: 0.18, duration: 0.07 }, 0.86)
          .to("[data-not-chatbots]", { opacity: 1, duration: 0.05 }, 0.88)
          .to("[data-not-chatbots]", { opacity: 0, duration: 0.04 }, 0.94)
          .to("[data-a-team]", { opacity: 1, scale: 1, duration: 0.05 }, 0.95);

        gsap.timeline({ scrollTrigger: { trigger: "[data-scene='collaboration']", start: "top top", end: "bottom bottom", scrub: 0.16 } })
          .to("[data-task-card]", { xPercent: 0, opacity: 1, duration: 0.15 })
          .to("[data-collab-step='0']", { opacity: 1, duration: 0.1 })
          .to("[data-task-card]", { y: "18vh", duration: 0.14 })
          .to("[data-collab-step='1']", { opacity: 1, duration: 0.1 })
          .to("[data-task-card]", { y: "36vh", duration: 0.14 })
          .to("[data-collab-step='2']", { opacity: 1, duration: 0.1 })
          .to("[data-context-copy]", { opacity: 1, x: 0, duration: 0.15 });

        gsap.timeline({ scrollTrigger: { trigger: "[data-scene='live']", start: "top top", end: "bottom bottom", scrub: 0.16 } })
          .fromTo("[data-live-ui]", { opacity: 0.25, scale: 0.82, rotateX: 5 }, { opacity: 1, scale: 1, rotateX: 0, duration: 0.32 })
          .to("[data-live-row='0']", { opacity: 1, borderColor: "rgba(239,255,61,.5)", duration: 0.1 })
          .to("[data-live-row='0']", { opacity: 0.34, borderColor: "transparent", duration: 0.08 })
          .to("[data-live-row='1']", { opacity: 1, borderColor: "rgba(239,255,61,.5)", duration: 0.1 })
          .to("[data-live-row='1']", { opacity: 0.34, borderColor: "transparent", duration: 0.08 })
          .to("[data-live-row='2']", { opacity: 1, borderColor: "rgba(239,255,61,.5)", duration: 0.1 })
          .to("[data-live-row='2']", { opacity: 0.34, borderColor: "transparent", duration: 0.08 })
          .to("[data-live-row='3']", { opacity: 1, borderColor: "rgba(239,255,61,.5)", duration: 0.1 })
          .to("[data-week-results]", { opacity: 1, y: 0, duration: 0.16 });

        gsap.timeline({ scrollTrigger: { trigger: "[data-scene='integrations']", start: "top top", end: "bottom bottom", scrub: 0.16 } })
          .fromTo("[data-integration]", { opacity: 0, scale: 0.72 }, { opacity: 1, scale: 1, stagger: 0.04, duration: 0.28 })
          .fromTo("[data-integration-line]", { strokeDashoffset: 1 }, { strokeDashoffset: 0, stagger: 0.04, duration: 0.32 }, 0.24)
          .to("[data-crew-core]", { scale: 1.08, duration: 0.15 }, 0.54)
          .to("[data-output-node]", { opacity: 1, y: 0, stagger: 0.05, duration: 0.2 }, 0.64);

        gsap.timeline({ scrollTrigger: { trigger: "[data-scene='autonomy']", start: "top top", end: "bottom bottom", scrub: 0.18 } })
          .to("[data-level='0']", { opacity: 1, color: "#efff3d", duration: 0.12 })
          .to("[data-control-card='0']", { opacity: 1, y: 0, duration: 0.12 }, "<")
          .to("[data-level='0'], [data-control-card='0']", { opacity: 0.25, duration: 0.1 })
          .to("[data-level='1']", { opacity: 1, color: "#efff3d", duration: 0.12 })
          .to("[data-control-card='1']", { opacity: 1, y: 0, duration: 0.12 }, "<")
          .to("[data-level='1'], [data-control-card='1']", { opacity: 0.25, duration: 0.1 })
          .to("[data-level='2']", { opacity: 1, color: "#efff3d", duration: 0.12 })
          .to("[data-control-card='2']", { opacity: 1, y: 0, duration: 0.12 }, "<");

        gsap.timeline({ scrollTrigger: { trigger: "[data-scene='final']", start: "top top", end: "bottom bottom", scrub: 0.16 } })
          .to("[data-final-intro]", { opacity: 0, yPercent: -25, duration: 0.28 })
          .to("[data-final-character]", { opacity: 1, yPercent: 0, duration: 0.3 }, 0.22)
          .to("[data-final-node]", { opacity: 1, scale: 1, stagger: 0.04, duration: 0.24 }, 0.4)
          .to("[data-final-title]", { opacity: 1, yPercent: 0, duration: 0.26 }, 0.52)
          .to("[data-final-action]", { opacity: 1, y: 0, duration: 0.18 }, 0.7);
      }
    }, scope);

    ScrollTrigger.refresh();
    return () => {
      ctx.revert();
      if (lenis) {
        lenis.off("scroll", onScroll);
        lenis.destroy();
        gsap.ticker.remove(tick);
      }
    };
  }, []);

  return <div ref={root} className={styles.cinematic}>
    <section className={styles.transitionScene} data-scene="transition" aria-labelledby="transition-title">
      <div className={styles.sticky}>
        <h2 className={styles.transitionTitle} id="transition-title" data-transition-title="individual">INDIVIDUALMENTE,<br /><em>ESPECIALISTAS.</em></h2>
        <svg className={styles.networkSvg} viewBox="0 0 1000 650" preserveAspectRatio="none" aria-hidden="true">
          {[[150,170,420,120],[420,120,710,210],[150,170,290,430],[290,430,520,500],[520,500,710,210],[710,210,850,430],[520,500,850,430]].map((line, index) => <line key={index} data-network-line x1={line[0]} y1={line[1]} x2={line[2]} y2={line[3]} pathLength="1" />)}
        </svg>
        <div className={styles.transitionNodes}>{employees.map((employee, index) => <div className={styles.crewNode} data-crew-node key={employee.name} style={{ "--node-x": `${[15,42,71,29,52,85,67][index]}%`, "--node-y": `${[26,18,32,66,76,66,52][index]}%` } as React.CSSProperties}><i /><strong>{employee.name}</strong><span>{employee.department}</span></div>)}</div>
        <h2 className={`${styles.transitionTitle} ${styles.togetherTitle}`} data-transition-title="together">JUNTOS,<br />UMA <em>CREW.</em></h2>
      </div>
    </section>

    <section className={styles.workflowScene} data-scene="workflow" id="produto" aria-labelledby="workflow-title">
      <div className={styles.sticky}>
        <div className={styles.workflowIntro} data-work-intro><span>04 · OPERAÇÃO AO VIVO</span><h2 id="workflow-title">VEJA SUA<br /><em>CREW TRABALHAR.</em></h2><p>Enquanto você cuida da empresa,<br />sua Crew cuida da operação.</p></div>
        <div className={styles.operationMap} data-operation-map>
          <div className={styles.request}><i /><span>NOVA SOLICITAÇÃO RECEBIDA</span><time>09:41:02</time></div>
          <svg viewBox="0 0 1000 650" preserveAspectRatio="none" aria-hidden="true">
            {[
              "M90,330 C130,330 145,200 190,200",
              "M230,200 C310,200 330,430 450,430",
              "M490,430 C560,430 610,180 700,180",
              "M740,180 C800,180 800,430 860,430",
            ].map((path, index) => <path key={path} data-route={index} d={path} pathLength="1" />)}
          </svg>
          {workflow.map((agent, index) => <article className={styles.workflowAgent} data-agent={index} key={agent.name} style={{ left: `${agent.x}%`, top: `${agent.y}%` }}><header><i /><div><strong>{agent.name}</strong><span>{agent.role}</span></div><em>TRABALHANDO</em></header><p>{agent.activity}</p><ul>{agent.checks.map((check) => <li data-check key={check}><Check size={11} />{check}</li>)}</ul></article>)}
          {workflow.map((_, index) => <span className={styles.packet} data-packet={index} key={index} style={{ offsetPath: `path('${["M90,330 C130,330 145,200 190,200","M230,200 C310,200 330,430 450,430","M490,430 C560,430 610,180 700,180","M740,180 C800,180 800,430 860,430"][index]}')` }}><i />{["TASK","CONTEXT","PAYMENT","DOC"][index]}</span>)}
        </div>
        <div className={styles.operationResult} data-operation-result><span>OPERAÇÃO</span><strong>CONCLUÍDA</strong><time>00:02:41</time><small>4 funcionários envolvidos · 1 solicitação resolvida</small></div>
        <h2 className={styles.statement} data-not-chatbots>NÃO SÃO<br />CHATBOTS.</h2>
        <h2 className={`${styles.statement} ${styles.aTeam}`} data-a-team>É UMA<br /><em>EQUIPE.</em></h2>
      </div>
    </section>

    <section className={styles.collaborationScene} data-scene="collaboration" aria-labelledby="collab-title">
      <div className={styles.sticky}>
        <div className={styles.sceneHeading}><span>05 · COLABORAÇÃO</span><h2 id="collab-title">UMA TAREFA.<br /><em>VÁRIOS ESPECIALISTAS.</em></h2></div>
        <div className={styles.collabFlow}>{["SOFIA · Atendimento","LUCAS · Comercial","ANA · Financeiro"].map((item,index)=><div data-collab-step={index} key={item}><i />{item}<Check size={13}/></div>)}</div>
        <article className={styles.taskCard} data-task-card><small>NOVO CLIENTE</small><strong>ACME LTDA.</strong><div><span>CONTEXT</span><b>CLIENT · HISTORY · DOCUMENTS · STATUS</b></div></article>
        <div className={styles.contextCopy} data-context-copy><span>CONTEXTO COMPARTILHADO</span><h3>O CONTEXTO<br /><em>VAI JUNTO.</em></h3><p>Sua Crew compartilha o que precisa saber para continuar o trabalho de onde o outro parou.</p></div>
      </div>
    </section>

    <section className={styles.liveScene} data-scene="live" aria-labelledby="live-title">
      <div className={styles.sticky}>
        <div className={styles.liveHeading}><span>06 · CREWOS / LIVE ACTIVITY</span><h2 id="live-title">VEJA O TRABALHO<br /><em>ACONTECENDO.</em></h2></div>
        <div className={styles.liveUi} data-live-ui>
          <aside><div className={styles.miniLogo}><Image src="/crewos-logo.png" alt="" width={34} height={34}/><strong>CrewOS</strong></div>{["Central","Equipe","Atividades","Aprovações","Integrações"].map((item,index)=><span className={index===0?styles.activeNav:""} key={item}>{item}</span>)}</aside>
          <main><header><div><small>CENTRAL DA EMPRESA</small><h3>Sua equipe agora</h3></div><span><i/> Operação ao vivo</span></header><div className={styles.liveMetrics}>{[["Concluídas","47"],["Em andamento","4"],["Tempo poupado","12h"]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong><small>DADOS DEMONSTRATIVOS</small></div>)}</div><section className={styles.activityPanel}><header><span>FLUXO DE ATIVIDADE</span><small>Tempo real</small></header>{demoActivities.map((activity,index)=><article data-live-row={index} key={activity.name}><i>{activity.initials}</i><div><strong>{activity.name}</strong><span>{activity.detail}</span></div><time>{activity.time}</time></article>)}</section></main>
        </div>
        <div className={styles.weekResults} data-week-results><span>ESTA SEMANA · DEMONSTRAÇÃO</span><div><strong>47<small>TAREFAS CONCLUÍDAS</small></strong><strong>12h<small>POUPADAS</small></strong><strong>8<small>OPORTUNIDADES</small></strong></div></div>
      </div>
    </section>

    <section className={styles.integrationScene} data-scene="integrations" id="integracoes" aria-labelledby="integration-title">
      <div className={styles.sticky}>
        <div className={styles.sceneHeading}><span>07 · CONECTE SUA EMPRESA</span><h2 id="integration-title">SUA CREW TRABALHA<br />ONDE SUA EMPRESA<br /><em>JÁ ESTÁ.</em></h2></div>
        <svg className={styles.integrationLines} viewBox="0 0 1000 650" preserveAspectRatio="none" aria-hidden="true">{[[180,180],[500,115],[820,180],[180,485],[500,540],[820,485]].map(([x,y],index)=><line data-integration-line key={index} x1={x} y1={y} x2="500" y2="330" pathLength="1" />)}</svg>
        <div className={styles.integrationCore} data-crew-core><Image src="/crewos-logo.png" alt="CrewOS" width={58} height={58}/><strong>CREWOS</strong></div>
        <div className={styles.integrationCloud}>{integrationItems.map((item,index)=><article data-integration key={item.name} style={{ "--integration-x": `${[18,50,82,18,50,82][index]}%`, "--integration-y": `${[28,18,28,74,82,74][index]}%` } as React.CSSProperties}><div>{item.logo?<Image src={item.logo} alt={`Logo ${item.name}`} sizes="36px"/>:<span>{item.initials}</span>}</div><strong>{item.name}</strong><small>{item.status}</small></article>)}</div>
        <div className={styles.outputNodes}>{["ANA","SOFIA","LUCAS"].map(name=><span data-output-node key={name}><i/>{name}</span>)}</div>
      </div>
    </section>

    <section className={styles.autonomyScene} data-scene="autonomy" aria-labelledby="autonomy-title">
      <div className={styles.sticky}>
        <div className={styles.sceneHeading}><span>08 · VOCÊ CONTINUA NO CONTROLE</span><h2 id="autonomy-title">AUTONOMIA<br /><em>NA MEDIDA CERTA.</em></h2></div>
        <div className={styles.levels}>{["OBSERVAR","SUGERIR","EXECUTAR"].map((level,index)=><div data-level={index} key={level}><small>0{index+1}</small><strong>{level}</strong></div>)}</div>
        <div className={styles.controlCards}>
          <article data-control-card="0"><span>ANA · FINANCEIRO</span><strong>Encontrou uma cobrança vencida.</strong><small><Clock3 size={12}/> Somente leitura</small></article>
          <article data-control-card="1"><span>ANA · FINANCEIRO</span><strong>Sugere enviar um lembrete.</strong><button type="button">APROVAR</button></article>
          <article data-control-card="2"><span>ANA · FINANCEIRO</span><strong>Enviou o lembrete dentro das permissões definidas.</strong><small><ShieldCheck size={12}/> Ação registrada</small></article>
        </div>
      </div>
    </section>

    <section className={styles.finalScene} data-scene="final" aria-labelledby="final-title">
      <div className={styles.sticky}>
        <h2 className={styles.finalIntro} data-final-intro>SUA EMPRESA<br />NÃO PRECISA<br />TRABALHAR SOZINHA.</h2>
        <div className={styles.finalCharacter} data-final-character><Image src="/crewos-humanoide.png" alt="Funcionário digital humanoide da CrewOS" fill sizes="(max-width: 700px) 90vw, 560px"/></div>
        <div className={styles.finalOrbit} aria-hidden="true">{employees.slice(0,6).map((employee,index)=><span data-final-node key={employee.name} style={{ "--orbit-angle": `${index*60}deg` } as React.CSSProperties}><i/>{employee.name}</span>)}</div>
        <div className={styles.finalContent}><span><Sparkles size={13}/> SUA EQUIPE ESTÁ PRONTA</span><h2 id="final-title" data-final-title>MONTE<br /><em>SUA CREW.</em></h2><div data-final-action><Link href="/lista-de-espera">ENTRAR NA LISTA <ArrowRight size={16}/></Link><small>Comece com uma área. Cresça no seu ritmo.</small></div></div>
      </div>
    </section>
  </div>;
}
