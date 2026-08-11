# CREW.OS Integration Engine

## Visão geral

O Integration Engine é a fronteira única entre funcionários digitais e sistemas externos. Agentes nunca recebem tokens, escolhem organizações ou chamam SDKs de terceiros. O backend injeta `organizationId`, `employeeId` e `taskId` a partir da sessão e da tarefa e expõe somente a ferramenta controlada `crew_execute_action`.

```text
Employee → Capability → Action Gateway → Provider Registry → Adapter → API externa
                    ↘ Permission / Autonomy / Approval / Audit / Crew Live
```

O projeto continua em Next.js + TypeScript + Supabase. Foram reaproveitados `organizations`, `digital_employees`, `tasks`, `approvals`, `activities`, `automation_events`, `jobs` e `audit_logs`.

## Módulos

- `src/integrations/core`: contratos, catálogo de capabilities, provider registry, resolução, erros, rate limit, retry e Action Gateway.
- `src/integrations/security`: sanitização recursiva e cofre AES-256-GCM. A tabela de credenciais não possui policy para clientes autenticados.
- `src/integrations/providers`: adapters. Os adapters V1 atuais são mocks deliberados; não contêm endpoints ou scopes inventados.
- `src/integrations/events`: Event Bus e Trigger Engine.
- `src/integrations/webhooks`: validação, deduplicação e normalização de webhooks por adapter.
- `src/integrations/persistence`: implementação Supabase do store multi-tenant.
- `src/integrations/flows`: primeiro fluxo financeiro da Ana, reutilizando o classificador documental existente.

## Segurança e multi-tenancy

Todas as consultas persistentes recebem `organizationId`. Rotas públicas nunca aceitam `organizationId` ou `employeeId` livres para executar uma ação: o tenant vem da sessão e o funcionário vem da tarefa validada. Payloads que tentem alterar permission, autonomy, credentials ou system prompts são rejeitados. Entradas de email e documentos recebem a marca `untrustedExternalContent`.

Credenciais são cifradas com AES-256-GCM usando `CREWOS_CREDENTIAL_ENCRYPTION_KEY`. Somente a service role acessa `integration_credentials`; respostas ao navegador mostram no máximo uma referência opaca. Tokens e campos sensíveis são removidos de input, output, audit e activity.

## Capabilities e providers

`CapabilityRegistry` contém o contrato universal. Cada adapter declara um `ReadonlySet` das capabilities que suporta. `ProviderRegistry.resolve` escolhe a conexão ativa de maior prioridade previamente filtrada pelo tenant. Assim, trocar Conta Azul por Omie não altera a Ana.

Para adicionar uma capability:

1. Registre a definição e o risco em `capability-registry.ts`.
2. Implemente-a em pelo menos um adapter.
3. Adicione permissão e política explícitas para os funcionários autorizados.
4. Cubra normalização, idempotência e falhas em testes.

Para adicionar Pipedrive:

1. Crie `providers/pipedrive/adapter.ts` implementando `CrewIntegrationAdapter`.
2. Declare apenas capabilities verificadas na documentação oficial atual.
3. Registre o adapter em `runtime.ts`.
4. Implemente OAuth/webhook no próprio adapter, nunca no Core.
5. Crie testes com transporte falso antes de ativar chamadas reais.

## Action Gateway, autonomia e approvals

O gateway valida capability, permissão, conexão, política, idempotência e rate limit. Leitura não crítica sem política pode ser automática; ação crítica sem política exige aprovação. A política mais específica (`employee + capability`) vence a política organizacional ou curinga.

Níveis: `observe_only`, `suggest`, `approval_required`, `automatic` e `automatic_with_limits`. Uma action acima do limite fica `awaiting_approval`. A approval existente é ligada por `integration_action_id`; ao aprovar, `POST /api/integrations/approvals/:id/execute` consome a decisão uma vez.

## Eventos, webhooks e triggers

Adapters verificam assinatura sobre o corpo bruto, normalizam payload para `CrewEvent`, e o Webhook Engine reserva o `externalId` antes de publicar. O Trigger Engine avalia regras declarativas e cria tarefas no sistema existente. Conteúdo externo permanece dado não confiável.

## Endpoints

- `GET/POST /api/integrations/connections`: listar ou criar conexão mock.
- `DELETE /api/integrations/connections/:id`: desconectar.
- `POST /api/integrations/connections/:id/test`: testar saúde.
- `POST /api/integrations/permissions`: configurar permissão e autonomia.
- `POST /api/integrations/actions`: executar uma capability no contexto de uma tarefa.
- `POST /api/integrations/approvals/:id/execute`: executar action já aprovada.
- `POST /api/integrations/mock/gmail/events`: simular Gmail → tarefa da Ana → financeiro.
- `GET /api/integrations/google/connect`: iniciar OAuth único para Gmail e Calendar.
- `GET /api/integrations/google/callback`: validar state/PKCE, trocar o código e guardar tokens cifrados.

### Google Workspace

A conexão `google-workspace` reúne Gmail e Google Calendar no mesmo consentimento. Configure `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` e uma chave válida para o cofre. O fluxo usa Authorization Code com PKCE, `state`, acesso offline e scopes mínimos para ler Gmail/anexos e ler ou administrar eventos do Calendar. O refresh token nunca é enviado ao frontend.

## Modo de desenvolvimento

Defina `INTEGRATION_MODE=mock`. Nesse modo Gmail, Drive, Calendar, WhatsApp, Conta Azul, Omie, Asaas e HubSpot executam somente em memória e retornam `simulated: true`. Em produção, mocks recusam execução se o modo mock não estiver explicitamente habilitado. Nenhuma transação financeira real é realizada.

Para testar o fluxo completo, conecte um provider financeiro mock, conceda `finance.accountsPayable.create` à Ana, configure `automatic_with_limits` ou `approval_required` e publique um email pelo endpoint de simulação. O boleto usa o pipeline atual de classificação, gera action, approval, audit e Crew Live.

## Estado dos adapters V1

Gmail, Google Drive, Google Calendar, WhatsApp, Conta Azul, Omie, Asaas e HubSpot têm contrato, capabilities e mock. Google Sheets e chamadas reais ficaram fora desta fase porque não há credenciais nem documentação oficial versionada no repositório. Para produção ainda são necessários OAuth, scopes e endpoints oficiais confirmados, refresh token, assinatura específica de webhook, filas distribuídas para rate limit/retry e rotação da chave do cofre.
