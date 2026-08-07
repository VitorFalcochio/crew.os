# Operação contínua do CrewOS

## Fluxo de uma delegação

1. `POST /api/tasks` cria a tarefa autenticada dentro da organização da sessão.
2. O trigger `enqueue_new_task` cria um job durável e idempotente.
3. O scheduler chama `/api/internal/tick`.
4. Um worker reivindica o job com lock e `SKIP LOCKED`.
5. O funcionário carrega tarefa, identidade e contexto operacional.
6. O provider prepara um plano; sem chave de IA, existe fallback determinístico.
7. A ferramenta consulta os dados autorizados e registra `tool_executions`.
8. Ações sensíveis criam uma aprovação e deixam job/tarefa aguardando.
9. A aprovação humana dispara `resume_after_approval` automaticamente.
10. O worker continua exatamente uma vez, conclui a tarefa e registra a timeline.

## Testar Ana

Importe recebíveis pela sessão autenticada:

```http
POST /api/financial/accounts
Content-Type: application/json

{
  "accounts": [{
    "externalId": "ERP-1001",
    "customerName": "Cliente Exemplo",
    "document": "NF-1001",
    "amount": 3200,
    "dueDate": "2026-08-01",
    "direction": "receivable",
    "status": "overdue",
    "source": "erp-alpha"
  }]
}
```

Delegue a análise para o UUID real da Ana e execute o tick interno. A tarefa deve parar em `aguardando_aprovacao`. Ao aprovar pela interface, o banco enfileira a retomada; o tick seguinte conclui o fluxo.

O envio da cobrança ainda é marcado como `simulated: true`. A barreira de aprovação e toda a rastreabilidade já são reais; o próximo conector deve substituir somente a implementação da ferramenta de envio.

## Webhook genérico

Crie um endpoint autenticado por `POST /api/webhooks`. A resposta retorna uma URL e um segredo uma única vez. O sistema externo chama:

```http
POST /api/webhooks/{endpoint_key}
x-crewos-secret: {secret}
x-idempotency-key: evento-unico-do-sistema-origem
Content-Type: application/json

{ "recordId": "123", "status": "changed" }
```

O payload máximo é 1 MB. Chamadas repetidas com a mesma chave de idempotência retornam sucesso sem criar outra tarefa.

## Recorrências

`POST /api/recurring` cria uma rotina com intervalo mínimo de 15 minutos. A cada tick, `enqueue_due_recurring_delegations` cria as tarefas vencidas e avança `next_run_at` sob lock transacional.

## Escala e segurança

- A service role existe apenas no worker e em webhooks externos autenticados.
- Usuários comuns continuam limitados por RLS.
- Vários workers podem rodar em paralelo sem reivindicar o mesmo job.
- Jobs com lease expirado voltam à fila.
- Backoff dobra a cada falha, limitado a uma hora.
- Após o máximo de tentativas, o job vai para `dead` para análise humana.
- Para alto volume, execute o worker em serviço dedicado e mantenha o endpoint do Next.js apenas como opção de MVP.
