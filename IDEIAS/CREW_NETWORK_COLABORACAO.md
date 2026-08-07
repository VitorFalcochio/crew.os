# CrewOS --- Crew Network: Colaboração Real entre Funcionários Digitais

## Objetivo

Implementar na base atual da **CrewOS** uma camada de colaboração real
entre funcionários digitais.

A CrewOS não deve funcionar como uma coleção de agentes independentes. O
objetivo é fazer os funcionários se comportarem como uma **equipe
coordenada**, onde um funcionário consegue detectar uma situação,
solicitar trabalho a outro funcionário, compartilhar somente o contexto
necessário, acompanhar a execução e receber o resultado de volta.

A experiência final deve transmitir:

> **"Minha Crew não apenas trabalha para mim. Ela trabalha em equipe."**

------------------------------------------------------------------------

# 1. REGRA PRINCIPAL: NÃO RECRIAR O PROJETO

Antes de escrever qualquer código:

1.  Analise toda a arquitetura existente da CrewOS.
2.  Identifique:
    -   frontend;
    -   backend;
    -   banco de dados;
    -   autenticação;
    -   modelo de tenant/workspace/company;
    -   funcionários digitais existentes;
    -   sistema de atividades;
    -   sistema de autonomia;
    -   aprovações;
    -   delegações;
    -   rotinas;
    -   Crew Live / Activity Feed;
    -   Crew Briefing;
    -   integrações;
    -   serviços de IA existentes.
3.  Reutilize estruturas já existentes sempre que possível.
4.  Não duplique conceitos.
5.  Não remova funcionalidades existentes.
6.  Não substitua tecnologias sem necessidade.
7.  Crie migrations seguras quando alterações no banco forem
    necessárias.

A implementação deve parecer uma evolução natural da arquitetura atual.

------------------------------------------------------------------------

# 2. CONCEITO: CREW NETWORK

Criar uma camada conceitualmente chamada **Crew Network**.

Ela será responsável por permitir:

-   comunicação estruturada entre funcionários;
-   handoffs;
-   solicitações de colaboração;
-   respostas;
-   follow-ups;
-   compartilhamento controlado de contexto;
-   coordenação de tarefas;
-   colaboração em objetivos;
-   prevenção de loops;
-   auditoria das interações.

IMPORTANTE:

Não implementar isso como simplesmente:

`Agent A envia mensagem para Agent B`

A colaboração precisa ser uma entidade real do sistema.

Fluxo desejado:

``` text
Funcionário detecta situação
        ↓
Cria necessidade de colaboração
        ↓
Crew Orchestrator avalia
        ↓
Verifica permissões e contexto
        ↓
Cria Handoff
        ↓
Funcionário responsável recebe
        ↓
Executa trabalho
        ↓
Retorna resultado
        ↓
Funcionário original continua o fluxo
        ↓
Tudo aparece no Activity Feed
```

------------------------------------------------------------------------

# 3. EXEMPLO DE EXPERIÊNCIA

Exemplo:

Ana, Financeiro Digital, identifica:

> "A projeção indica pressão de caixa de aproximadamente R\$18.400
> dentro de 21 dias."

Ela não deve apenas avisar o dono.

A Crew Network deve permitir que Ana solicite colaboração ao Comercial.

Handoff:

``` text
Origem:
Ana — Financeiro

Destino:
Lucas — Comercial

Objetivo:
Aumentar entrada de caixa nos próximos 7 dias.

Prioridade:
Alta

Contexto:
Existem quatro propostas abertas totalizando R$37.000.

Prazo:
7 dias
```

Lucas recebe a solicitação e analisa suas ferramentas/dados.

Lucas responde:

> "Duas propostas possuem maior probabilidade de fechamento. Também
> identifiquei dois clientes relacionados com pagamentos pendentes."

Lucas cria um retorno para Ana.

Ana recebe o resultado e pode continuar:

> "Identifiquei R\$6.730 em valores recuperáveis."

Dependendo da autonomia configurada:

-   executar cobrança;
-   preparar cobrança;
-   solicitar aprovação;
-   apenas recomendar.

O dono deve conseguir visualizar:

> **Sua Crew já está trabalhando para reduzir o risco de caixa.**

------------------------------------------------------------------------

# 4. CREW ORCHESTRATOR

Criar uma camada central de orquestração.

Nome sugerido:

`CrewOrchestrator`

Adapte ao padrão de nomenclatura existente.

Responsabilidades:

-   receber eventos relevantes dos funcionários;
-   determinar se existe necessidade de colaboração;
-   identificar funcionários capazes de ajudar;
-   validar permissões;
-   validar contexto compartilhável;
-   criar handoffs;
-   definir prioridade;
-   acompanhar andamento;
-   controlar follow-ups;
-   evitar loops;
-   evitar duplicidade;
-   limitar profundidade de colaboração;
-   controlar custos de IA;
-   registrar tudo para auditoria.

IMPORTANTE:

O Orchestrator NÃO deve depender exclusivamente de LLM.

Sempre que possível:

**TypeScript + regras determinísticas primeiro.**

LLM somente quando raciocínio semântico realmente for necessário.

------------------------------------------------------------------------

# 5. EVENT-DRIVEN

Preferir arquitetura orientada a eventos.

Exemplos de eventos:

``` text
CASHFLOW_RISK_DETECTED
PAYMENT_OVERDUE
HIGH_VALUE_LEAD_DETECTED
CUSTOMER_CHURN_RISK
SUPPLIER_PRICE_INCREASE
CAMPAIGN_PERFORMANCE_DROP
SALES_TARGET_AT_RISK
CUSTOMER_COMPLAINT_ESCALATED
INVENTORY_RISK
APPROVAL_REQUIRED
GOAL_AT_RISK
```

Um evento pode conter:

``` ts
{
  id,
  companyId,
  employeeId,
  type,
  severity,
  title,
  description,
  payload,
  relatedEntities,
  createdAt
}
```

O sistema deve conseguir mapear:

``` text
EVENTO
↓
QUEM PRECISA SABER?
↓
QUEM PODE AJUDAR?
↓
QUAL CONTEXTO PODE SER COMPARTILHADO?
↓
É NECESSÁRIO CRIAR UM HANDOFF?
```

------------------------------------------------------------------------

# 6. HANDOFF PROTOCOL

Criar um protocolo estruturado de handoff.

Um handoff deve possuir, conceitualmente:

``` ts
interface CrewHandoff {
  id: string
  companyId: string

  fromEmployeeId: string
  toEmployeeId: string

  type: string
  objective: string

  priority: 'low' | 'normal' | 'high' | 'critical'

  context: SharedContextReference[]

  expectedOutcome?: string

  status:
    | 'created'
    | 'accepted'
    | 'in_progress'
    | 'waiting'
    | 'completed'
    | 'failed'
    | 'cancelled'

  dueAt?: Date

  parentHandoffId?: string
  missionId?: string

  createdAt: Date
  acceptedAt?: Date
  completedAt?: Date

  result?: CrewHandoffResult
}
```

Adapte ao projeto existente.

------------------------------------------------------------------------

# 7. HANDOFF NÃO É CHAT

Não transformar colaboração em mensagens soltas.

Cada handoff deve ter:

-   objetivo;
-   responsável;
-   origem;
-   prioridade;
-   contexto;
-   prazo opcional;
-   status;
-   resultado esperado;
-   resultado final.

Mensagens podem existir dentro do handoff, mas o handoff é uma unidade
de trabalho.

------------------------------------------------------------------------

# 8. MEMÓRIA COMPARTILHADA

Criar arquitetura para três níveis de memória/contexto.

## 8.1 Memória individual

Informações específicas daquele funcionário.

Exemplos:

-   padrões aprendidos;
-   preferências;
-   histórico operacional;
-   decisões anteriores;
-   contexto especializado.

## 8.2 Memória departamental

Informações compartilhadas dentro de uma área.

Exemplo:

Comercial: - pipeline; - metas; - leads; - padrões de conversão.

Financeiro: - caixa; - contas; - recebimentos; - despesas.

## 8.3 Memória organizacional

Contexto relevante para vários departamentos.

Exemplos:

-   objetivos da empresa;
-   clientes;
-   fornecedores;
-   projetos;
-   prioridades;
-   indicadores;
-   acontecimentos importantes;
-   decisões estratégicas;
-   regras corporativas.

------------------------------------------------------------------------

# 9. NÃO COMPARTILHAR TUDO

Memória compartilhada NÃO significa acesso irrestrito.

Implementar controle de acesso ao contexto.

Antes de compartilhar informação entre funcionários, verificar:

``` text
PERMISSÃO
+
FINALIDADE
+
SENSIBILIDADE
+
NECESSIDADE
```

Exemplo:

Marketing não deve receber automaticamente informações confidenciais de
RH.

Comercial não precisa receber dados bancários completos para saber que
determinado cliente possui uma pendência.

Compartilhar o mínimo necessário.

------------------------------------------------------------------------

# 10. SHARED CONTEXT GRAPH

Preparar arquitetura para um **grafo de contexto organizacional**.

Não é obrigatório introduzir imediatamente um banco de grafos se isso
complicar a stack.

Pode começar utilizando o banco atual com entidades e relacionamentos.

Mas estruturar conceitualmente:

``` text
Company
├── Customers
├── Suppliers
├── Employees
├── Goals
├── Projects
├── Deals
├── Invoices
├── Campaigns
├── Events
├── Decisions
└── Insights
```

Os funcionários devem conseguir referenciar entidades compartilhadas sem
copiar dados desnecessariamente.

Exemplo:

``` text
customer:123
invoice:982
deal:441
goal:77
```

O handoff referencia essas entidades.

------------------------------------------------------------------------

# 11. CONTEXT RESOLVER

Criar uma camada equivalente a:

`ContextResolver`

Responsabilidades:

-   receber funcionário;
-   receber tarefa/handoff;
-   identificar contexto necessário;
-   verificar permissões;
-   buscar somente informações relevantes;
-   remover informações não autorizadas;
-   preparar contexto para regras ou LLM.

Evitar enviar bancos inteiros de dados para o modelo.

------------------------------------------------------------------------

# 12. COLABORAÇÃO AUTOMÁTICA

Permitir que determinados eventos gerem colaboração automaticamente.

Exemplo:

``` text
CASHFLOW_RISK_DETECTED
severity = HIGH
```

Regra:

``` text
Financeiro
↓
Comercial
```

Objetivo:

> Priorizar oportunidades capazes de gerar caixa dentro do período de
> risco.

Outro exemplo:

``` text
CUSTOMER_CHURN_RISK
```

Pode envolver:

``` text
Atendimento
↓
Comercial
```

Outro:

``` text
CAMPAIGN_PERFORMANCE_DROP
```

Pode envolver:

``` text
Marketing
↓
Financeiro
```

para verificar eficiência do investimento.

------------------------------------------------------------------------

# 13. COLABORAÇÃO MANUAL

O usuário também deve conseguir solicitar colaboração.

Exemplo:

> "Ana, veja com o Comercial como podemos melhorar o caixa deste mês."

O sistema deve identificar:

-   Ana;
-   Financeiro;
-   Comercial;
-   objetivo;
-   contexto;
-   necessidade de handoff.

E criar o fluxo apropriado.

------------------------------------------------------------------------

# 14. LIMITES DE COLABORAÇÃO

Evitar comportamento caótico.

Implementar proteções.

## Loop prevention

Exemplo proibido:

``` text
Ana → Lucas
Lucas → Ana
Ana → Lucas
Lucas → Ana
...
```

Criar:

-   `maxHandoffDepth`;
-   identificação de ciclos;
-   deduplicação;
-   cooldown;
-   correlação de eventos;
-   limite por missão;
-   limite por período.

------------------------------------------------------------------------

# 15. CORRELATION ID

Toda cadeia colaborativa deve possuir um identificador de correlação.

Exemplo:

``` text
correlationId:
cashflow-risk-2026-08-07-001
```

Assim conseguimos reconstruir:

``` text
Problema
↓
Evento
↓
Ana
↓
Lucas
↓
Ana
↓
Aprovação
↓
Cobrança
↓
Resultado
```

------------------------------------------------------------------------

# 16. AUTONOMIA + COLABORAÇÃO

Integrar com o sistema de autonomia existente.

Colaboração NÃO pode ignorar permissões.

Exemplo:

Ana pode automaticamente pedir uma análise ao Comercial.

Mas isso não significa que Comercial pode automaticamente enviar
propostas.

Cada ação continua passando pelo:

`AutonomyEngine / PermissionEngine`

ou equivalente existente.

Fluxo:

``` text
Handoff
↓
Funcionário trabalha
↓
Decide ação
↓
Autonomy Engine
↓
OBSERVE / APPROVAL / AUTONOMOUS / BLOCKED
```

------------------------------------------------------------------------

# 17. APPROVAL CENTER

A colaboração deve integrar com Aprovações.

Exemplo:

``` text
Ana → Lucas
↓
Lucas encontra oportunidade
↓
Lucas prepara proposta
↓
Autonomia exige aprovação
↓
Approval Center
```

O card deve explicar a cadeia:

> **Por que esta ação está sendo sugerida?**

"Financeiro identificou risco de caixa. Comercial analisou oportunidades
abertas e recomenda antecipar esta negociação."

Isso deixa a decisão muito mais compreensível.

------------------------------------------------------------------------

# 18. CREW LIVE --- MOSTRAR COLABORAÇÃO

Integrar profundamente ao Activity Feed existente.

Não mostrar apenas:

> "Lucas executou tarefa."

Mostrar narrativa operacional.

Exemplo:

``` text
09:12

ANA · FINANCEIRO

Detectou possível pressão no caixa dentro de 21 dias.

↓

SOLICITOU COLABORAÇÃO

Lucas · Comercial
```

Depois:

``` text
09:14

LUCAS · COMERCIAL

Recebeu prioridade do Financeiro.

Analisando 4 oportunidades abertas...
```

Depois:

``` text
09:17

LUCAS → ANA

Identificou duas oportunidades prioritárias e
R$6.730 relacionados a clientes com pendências.
```

Depois:

``` text
09:19

ANA · FINANCEIRO

Preparou quatro cobranças.

Impacto potencial:
R$6.730

AGUARDANDO APROVAÇÃO
```

------------------------------------------------------------------------

# 19. VISUAL DE HANDOFF

Criar componentes visuais para colaboração.

Exemplo:

``` text
[ANA]
Financeiro
   │
   │ solicitou apoio
   ↓
[LUCAS]
Comercial
```

Usar identidade visual existente da CrewOS.

Evitar transformar a interface em diagrama técnico.

Precisa parecer atividade de equipe.

------------------------------------------------------------------------

# 20. CARD "CREW TRABALHANDO EM CONJUNTO"

Criar um componente especial quando múltiplos funcionários estiverem
trabalhando no mesmo problema.

Exemplo:

## Crew trabalhando em conjunto

**Problema**

Possível pressão de caixa dentro de 21 dias.

**Equipe envolvida**

Ana --- Financeiro\
Lucas --- Comercial

**Resposta da Crew**

-   4 oportunidades analisadas;
-   2 priorizadas;
-   4 cobranças preparadas.

**Impacto potencial**

R\$18.400

**Status**

Em andamento

Esse card deve ser visualmente importante na Central.

------------------------------------------------------------------------

# 21. CREW MISSIONS

Criar arquitetura inicial para **Crew Missions**.

Uma Mission representa um objetivo que exige vários funcionários.

Exemplo:

``` text
MISSÃO

Aumentar receita em 15%

Prazo:
60 dias
```

Participantes:

``` text
Lucas — Comercial
Júlia — Marketing
Ana — Financeiro
Sofia — Atendimento
```

Cada funcionário possui responsabilidade própria.

------------------------------------------------------------------------

# 22. MODELO DE MISSION

Estrutura conceitual:

``` ts
interface CrewMission {
  id: string
  companyId: string

  title: string
  description?: string

  objective: string

  status:
    | 'planning'
    | 'active'
    | 'at_risk'
    | 'completed'
    | 'cancelled'

  priority: string

  ownerEmployeeId?: string

  participantEmployeeIds: string[]

  startAt?: Date
  dueAt?: Date

  progress?: number

  metrics?: MissionMetric[]

  createdAt: Date
  completedAt?: Date
}
```

------------------------------------------------------------------------

# 23. RESPONSABILIDADES DENTRO DA MISSION

Não basta adicionar funcionários.

Cada participante deve possuir responsabilidade.

Exemplo:

``` text
MISSÃO
+15% de receita

Lucas · Comercial
→ aumentar conversão.

Júlia · Marketing
→ aumentar demanda qualificada.

Ana · Financeiro
→ acompanhar margem e orçamento.

Sofia · Atendimento
→ encontrar oportunidades na base atual.
```

------------------------------------------------------------------------

# 24. MISSIONS NO ACTIVITY FEED

Atividades podem estar vinculadas a uma Mission.

Exemplo:

> "Júlia encontrou uma campanha com CAC 28% inferior."

> "Júlia enviou oportunidade para Lucas."

> "Lucas converteu 3 leads da campanha."

> "Ana atualizou impacto financeiro da missão."

O dono acompanha a empresa trabalhando em direção ao objetivo.

------------------------------------------------------------------------

# 25. CREW BRIEFING + COLABORAÇÃO

Integrar Crew Network ao Crew Briefing.

O briefing deve conseguir dizer:

> "Nesta semana, Financeiro e Comercial trabalharam juntos para reduzir
> um risco de caixa identificado para agosto."

E apresentar:

-   problema;
-   funcionários envolvidos;
-   ações;
-   decisões;
-   resultado;
-   próximos passos.

Não apenas listar atividades isoladas.

------------------------------------------------------------------------

# 26. FOLLOW-UP AUTOMÁTICO

Handoffs precisam de acompanhamento.

Exemplo:

Ana pede algo ao Lucas.

Se Lucas não concluir dentro do prazo:

``` text
Handoff overdue
↓
Orchestrator
↓
follow-up
```

Dependendo da prioridade:

-   lembrar funcionário;
-   aumentar prioridade;
-   registrar atenção;
-   informar usuário;
-   reatribuir, se permitido.

------------------------------------------------------------------------

# 27. CONFIANÇA ACUMULADA

Preparar arquitetura para um conceito de **Trust Score / confiança
operacional**.

Não usar confiança como desculpa para ignorar permissões explícitas.

O objetivo é registrar histórico como:

-   quantidade de ações aprovadas;
-   quantidade recusada;
-   alterações feitas pelo humano;
-   taxa de sucesso;
-   reversões;
-   erros;
-   performance;
-   consistência.

Isso poderá futuramente sugerir:

> "Você aprovou 97% das últimas 42 cobranças abaixo de R\$500. Deseja
> permitir que Ana execute esse tipo de ação automaticamente?"

A mudança de autonomia deve continuar exigindo decisão explícita do
usuário.

------------------------------------------------------------------------

# 28. TYPE SCRIPT FIRST

Este é um princípio importante da CrewOS.

Não utilizar LLM para tarefas que podem ser resolvidas
deterministicamente.

TypeScript deve controlar:

-   eventos;
-   regras;
-   workflows;
-   roteamento;
-   permissões;
-   autonomia;
-   estados;
-   deadlines;
-   cálculos;
-   thresholds;
-   deduplicação;
-   handoffs;
-   filas;
-   retries;
-   auditoria.

LLM deve ser utilizado para:

-   interpretação;
-   classificação semântica;
-   análise;
-   síntese;
-   planejamento;
-   linguagem natural;
-   raciocínio não determinístico.

------------------------------------------------------------------------

# 29. AI GATEWAY

Se já existir camada de IA, reutilizá-la.

Caso não exista, preparar uma abstração simples.

Conceitualmente:

``` text
Crew Brain
     ↓
AI Gateway
     ↓
Model Provider
```

O funcionário não deve depender diretamente de um único provedor.

Preparar arquitetura para futuramente suportar:

-   LLM próprio;
-   Qwen;
-   Llama;
-   Mistral;
-   APIs externas;
-   fallback entre modelos.

NÃO é necessário implementar todos os provedores nesta tarefa.

Apenas evitar acoplamento desnecessário.

------------------------------------------------------------------------

# 30. NÃO CRIAR UM LLM POR FUNCIONÁRIO

Ana, Lucas, Júlia etc. não precisam ser modelos diferentes.

Funcionário deve ser definido principalmente por:

``` text
IDENTIDADE
+
FUNÇÃO
+
FERRAMENTAS
+
MEMÓRIA
+
PERMISSÕES
+
AUTONOMIA
+
OBJETIVOS
+
CONTEXTO
```

Vários funcionários podem utilizar o mesmo LLM.

------------------------------------------------------------------------

# 31. BANCO DE DADOS

Analise o schema existente antes.

Caso necessário, considerar entidades equivalentes a:

``` text
crew_events
crew_handoffs
crew_handoff_messages
crew_context_entities
crew_context_relations
crew_missions
crew_mission_members
crew_mission_metrics
crew_collaboration_rules
employee_trust_metrics
```

NÃO criar automaticamente todas se estruturas existentes puderem ser
reutilizadas.

Criar índices adequados para:

-   company_id;
-   employee_id;
-   status;
-   correlation_id;
-   mission_id;
-   created_at;
-   due_at.

------------------------------------------------------------------------

# 32. MULTI-TENANT

Obrigatório.

Nenhum contexto pode atravessar empresas.

Toda operação deve respeitar:

``` text
companyId / workspaceId / tenantId
```

de acordo com arquitetura existente.

Validar isso em:

-   events;
-   handoffs;
-   memória;
-   missions;
-   activities;
-   approvals;
-   context resolver.

------------------------------------------------------------------------

# 33. IDEMPOTÊNCIA

Eventos e handoffs devem ser resistentes a duplicação.

Exemplo:

Se `CASHFLOW_RISK_DETECTED` for processado duas vezes, não criar duas
missões idênticas ou dez handoffs iguais.

Criar estratégia de:

-   idempotency key;
-   event correlation;
-   deduplication window.

------------------------------------------------------------------------

# 34. CONCORRÊNCIA

Considerar:

-   dois funcionários tentando alterar a mesma tarefa;
-   aprovação ocorrendo enquanto handoff atualiza;
-   evento repetido;
-   retry;
-   timeout;
-   funcionário offline;
-   integração indisponível.

Garantir estados consistentes.

------------------------------------------------------------------------

# 35. OBSERVABILIDADE

Registrar:

-   quem iniciou;
-   quem recebeu;
-   contexto utilizado;
-   regra aplicada;
-   LLM utilizado quando aplicável;
-   duração;
-   resultado;
-   erro;
-   custo quando disponível;
-   tokens quando disponíveis;
-   quantidade de handoffs;
-   correlationId.

Isso será importante para custo e debugging.

------------------------------------------------------------------------

# 36. MÉTRICAS

Adicionar capacidade de medir colaboração.

Exemplos:

``` text
handoffs criados
handoffs concluídos
tempo médio de resposta
colaborações por funcionário
missões ativas
missões concluídas
impacto financeiro
tempo economizado
taxa de sucesso
ações que exigiram aprovação
```

Evitar métricas de vaidade.

------------------------------------------------------------------------

# 37. UX --- PERFIL DO FUNCIONÁRIO

No perfil de cada funcionário, mostrar uma área de colaboração.

Exemplo:

## Trabalhou com

Lucas · Comercial\
12 colaborações

Júlia · Marketing\
4 colaborações

## Handoffs recentes

-   Solicitou análise comercial
-   Recebeu dados de cobrança
-   Participou da missão Receita +15%

Isso reforça a sensação de equipe.

------------------------------------------------------------------------

# 38. UX --- CENTRAL

A Central deve conseguir responder rapidamente:

-   Quem está trabalhando?
-   Quem está trabalhando junto?
-   Qual problema estão tentando resolver?
-   O que aconteceu?
-   O que precisa de mim?
-   Qual impacto está sendo gerado?

A colaboração deve enriquecer a Central, não deixá-la confusa.

------------------------------------------------------------------------

# 39. NÃO FAZER

Não:

-   criar chat infinito entre agentes;
-   permitir agentes chamarem uns aos outros sem controle;
-   compartilhar banco inteiro como contexto;
-   ignorar permissões;
-   deixar LLM decidir regras de segurança;
-   criar loops;
-   criar ações falsas para deixar feed movimentado;
-   simular trabalho inexistente em produção;
-   gerar números de impacto inventados;
-   criar um modelo diferente por funcionário;
-   fazer toda decisão passar por LLM;
-   quebrar Activity Feed existente;
-   recriar sistema de autonomia;
-   duplicar Approval Center;
-   comprometer isolamento multi-tenant.

------------------------------------------------------------------------

# 40. TESTES OBRIGATÓRIOS

Criar testes para pelo menos:

### Handoff normal

``` text
Ana → Lucas → conclusão → Ana recebe resultado
```

### Handoff que exige aprovação

``` text
Ana → Lucas → ação → Approval Center
```

### Ação autônoma permitida

Executar dentro da política.

### Ação bloqueada

Não executar.

### Loop

``` text
Ana → Lucas → Ana → Lucas
```

Sistema deve interromper.

### Evento duplicado

Não criar colaboração duplicada.

### Contexto proibido

Funcionário não recebe dado sem permissão.

### Multi-tenant

Empresa A nunca acessa contexto da Empresa B.

### Timeout

Handoff atrasado gera follow-up correto.

### Erro de integração

Registrar falha e manter estado consistente.

### Missão

Múltiplos funcionários conseguem trabalhar na mesma Mission sem perder
rastreabilidade.

------------------------------------------------------------------------

# 41. ORDEM DE IMPLEMENTAÇÃO

Implementar aproximadamente nesta ordem:

## Fase 1 --- Auditoria

Entender arquitetura atual.

## Fase 2 --- Event Model

Padronizar eventos relevantes.

## Fase 3 --- Handoff Protocol

Criar unidade de colaboração.

## Fase 4 --- Crew Orchestrator

Criar coordenação.

## Fase 5 --- Context Resolver

Compartilhar contexto de forma segura.

## Fase 6 --- Autonomy Integration

Integrar permissões existentes.

## Fase 7 --- Activity Feed

Mostrar colaboração.

## Fase 8 --- Follow-up / Loop Prevention

Adicionar controles.

## Fase 9 --- Crew Missions

Criar colaboração por objetivos.

## Fase 10 --- Crew Briefing

Adicionar narrativa das colaborações.

## Fase 11 --- Metrics / Observability

Instrumentar.

## Fase 12 --- Tests

Validar segurança e confiabilidade.

------------------------------------------------------------------------

# 42. PRIMEIRO CASO REAL

Antes de generalizar demais, fazer funcionar perfeitamente este cenário:

``` text
FINANCEIRO
detecta risco de caixa
↓
CREW ORCHESTRATOR
identifica necessidade comercial
↓
HANDOFF
Financeiro → Comercial
↓
COMERCIAL
analisa oportunidades
↓
RESULTADO
devolve oportunidades prioritárias
↓
FINANCEIRO
analisa recebíveis relacionados
↓
AUTONOMY ENGINE
verifica limites
↓
APPROVAL CENTER
caso necessário
↓
AÇÃO
↓
RESULTADO
↓
ACTIVITY FEED
mostra toda a colaboração
```

Esse deve ser nosso fluxo de referência.

Depois abstrair para outras combinações.

------------------------------------------------------------------------

# 43. CRITÉRIO DE SUCESSO

Ao final, preciso conseguir abrir a CrewOS e perceber claramente que os
funcionários:

-   conhecem suas responsabilidades;
-   percebem acontecimentos relevantes;
-   pedem ajuda uns aos outros;
-   compartilham contexto de forma controlada;
-   acompanham pedidos;
-   retornam resultados;
-   trabalham em objetivos comuns;
-   respeitam autonomia;
-   pedem aprovação quando necessário;
-   deixam tudo registrado;
-   não entram em loops;
-   não fingem executar tarefas.

O dono não deve precisar funcionar como o "cabo que conecta os
departamentos".

------------------------------------------------------------------------

# 44. PRINCÍPIO DE PRODUTO

A CrewOS deve evoluir de:

> "Tenho seis agentes de IA."

para:

> **"Tenho uma equipe digital."**

E de:

> "Cada IA executa sua tarefa."

para:

> **"Minha Crew percebe problemas, se organiza e trabalha em conjunto
> para resolvê-los."**

Essa diferença deve existir tanto na arquitetura quanto na experiência
visual.

------------------------------------------------------------------------

# 45. POSICIONAMENTO

Preservar como princípio de produto:

> **Outras IAs trabalham para você. Sua Crew trabalha em equipe.**

A Crew Network deve se tornar uma das fundações da CrewOS, juntamente
com:

1.  **Autonomia** --- até onde cada funcionário pode agir.
2.  **Transparência** --- o dono consegue acompanhar o trabalho.
3.  **Colaboração** --- funcionários trabalham uns com os outros.
4.  **Objetivos** --- a Crew trabalha coordenadamente por resultados da
    empresa.

------------------------------------------------------------------------

# 46. ENTREGA

Após implementar:

1.  Liste os arquivos criados.
2.  Liste os arquivos alterados.
3.  Explique migrations realizadas.
4.  Explique decisões arquiteturais importantes.
5.  Mostre como adicionar uma nova regra de colaboração.
6.  Mostre como um novo funcionário pode participar da Crew Network.
7.  Documente o fluxo Financeiro → Comercial.
8.  Informe testes criados e resultados.
9.  Informe limitações ou TODOs reais.
10. Não declare funcionalidade como pronta se ela estiver apenas
    mockada.

Comece analisando a base atual.

Somente depois implemente.

Priorize **arquitetura sólida, segurança, rastreabilidade e uma
experiência que faça a Crew parecer uma equipe de verdade**.
