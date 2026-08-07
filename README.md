# CrewOS

Primeira versão funcional do sistema operacional da força de trabalho digital. O produto apresenta funcionários, tarefas, decisões e resultados como uma operação de equipe — não como um chatbot.

## Executar

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. A aplicação inicia em modo demonstração, sem depender de serviços externos. O estado de delegações, contratações, integrações e aprovações é persistido no `localStorage`.

O modo demonstração é identificado na interface e não executa ações externas. Em produção ele fica bloqueado por padrão; use `CREWOS_ALLOW_DEMO=true` somente em ambientes de apresentação controlados.

Rotas de apresentação:

- `/login` — entrada e recuperação de acesso;
- `/onboarding` — configuração da empresa e montagem da equipe;
- `/central` — visão executiva e resultados;
- `/equipe/ana` — perfil, conversa, memória, ferramentas e desempenho;
- `/delegacoes` — criação e acompanhamento de tarefas;
- `/aprovacoes` — supervisão humana e continuação do fluxo da Ana;
- `/atividades`, `/store`, `/integracoes` e `/assinatura`.

## Backend multiusuário com Supabase

1. Crie um projeto no Supabase.
2. Copie `.env.example` para `.env.local` e preencha URL, chave pública e URL da aplicação.
3. Aplique as migrations, em ordem:
   - `supabase/migrations/202608060001_initial_schema.sql`;
   - `supabase/migrations/202608060002_multi_user_backend.sql`.
   - `supabase/migrations/202608060003_continuous_operations.sql`.
   - `supabase/migrations/202608060004_crew_intelligence.sql`.
4. Execute `supabase/seed.sql` para publicar os cinco modelos de funcionários e as ferramentas iniciais. As linhas finais do seed criam a Construtora Alpha apenas para demonstração; em produção, podem ser omitidas.
5. Em Authentication → URL Configuration, adicione `http://localhost:3000/auth/callback` e a URL equivalente de produção aos redirects permitidos.

Com as variáveis configuradas, o modo multiusuário é ativado automaticamente. Sem elas, a aplicação mantém o modo demo local para apresentações.

O backend implementa:

- cadastro, login, confirmação de e-mail, recuperação e logout com cookies SSR;
- atualização segura da sessão pelo `proxy.ts` do Next.js;
- proteção otimista de rotas e autorização novamente na camada de dados;
- perfil por usuário e associação a uma ou mais organizações;
- onboarding transacional com empresa, proprietário, assinatura e equipe inicial;
- contexto de organização sempre derivado da sessão e validado por RLS;
- APIs autenticadas em `/api/bootstrap`, `/api/me`, `/api/tasks` e `/api/approvals`;
- aprovação transacional, atualização da tarefa, atividade e audit log;
- rate limiting básico por usuário e validação Zod.

## Operação contínua

A terceira migration adiciona fila durável, lease atômico com `SKIP LOCKED`, retries exponenciais, recuperação de jobs abandonados, recorrências, eventos, execuções de ferramentas e métricas de providers.

Configure no ambiente do servidor:

```env
SUPABASE_SERVICE_ROLE_KEY=...
CREWOS_WORKER_SECRET=um-segredo-longo-e-aleatorio
CRON_SECRET=outro-segredo-longo-para-o-agendador
OPENAI_API_KEY=...
```

O endpoint interno `GET /api/internal/tick?batch=5` deve receber `Authorization: Bearer <CREWOS_WORKER_SECRET>` ou o `CRON_SECRET` do ambiente. O `vercel.json` agenda essa chamada a cada minuto; em outra infraestrutura, configure o mesmo cabeçalho no agendador equivalente.

Quando `OPENAI_API_KEY` não existe, o worker usa um plano determinístico seguro. Quando existe, usa a Responses API e roteia tarefas rápidas, padrão e complexas entre os modelos configurados, sem persistir as respostas no provedor (`store: false`).

Consulte [docs/operations.md](docs/operations.md) para testar o fluxo completo.

Templates e ferramentas têm leitura pública limitada; dados da empresa exigem associação à organização. A `SUPABASE_SERVICE_ROLE_KEY` não é usada no frontend e deve ser reservada para workers internos futuros.

## Arquitetura

- `src/app`: rotas e composição da interface;
- `src/features/demo`: serviço de dados demonstrativo, separado da UI;
- `src/agents`: contratos de providers/ferramentas e orquestrador supervisionado;
- `src/agents/brains`: um cérebro especializado por funcionário, com método, qualidade, memória, autonomia e escalonamento;
- `src/lib/supabase`: cliente preparado para adoção gradual do backend;
- `supabase`: schema, RLS e seed.

O orquestrador verifica contexto, permissão e necessidade de aprovação antes de executar uma ferramenta. A implementação mock de Ana cobre consulta de contas e geração de cobrança. Providers de IA entram pelo contrato `AIProvider`, permitindo seleção posterior por complexidade, custo e disponibilidade.

Os cérebros de Ana, Carlos, Sofia, Júlia, Lucas, Marta e Rafael são módulos TypeScript independentes. Consulte [docs/brains.md](docs/brains.md) para a estrutura e o processo de criação de novas especialidades.

## Qualidade

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Antes de produção em escala, substitua o rate limiting em memória por Redis/KV, configure um cofre de segredos para integrações e execute o orquestrador em workers assíncronos com idempotência e retries.
