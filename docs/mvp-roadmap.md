# MVP CrewOS — Ana Financeiro

## Objetivo

Entregar um fluxo financeiro real, seguro e auditável no qual Ana identifica recebíveis vencidos, prepara cobranças, solicita a decisão humana quando necessário, executa por um canal autorizado e comprova o resultado.

O MVP não considera uma tarefa concluída sem uma entrega verificável. Dados simulados devem permanecer identificados como demonstração.

## Fluxo de sucesso

1. O usuário cria uma empresa e contrata Ana.
2. Importa contas a receber por CSV ou API.
3. Uma rotina analisa os recebíveis vencidos.
4. A policy persistida decide entre observar, solicitar aprovação, executar ou bloquear.
5. Ana apresenta dados utilizados, motivo, mensagem preparada e impacto esperado.
6. O gestor aprova, edita ou recusa.
7. Um conector autorizado envia a cobrança.
8. A execução, o resultado e eventuais erros ficam na auditoria.
9. A Central mostra apenas métricas verificáveis.

## Partes

### 0. Validação local do produto

- [x] Criar conta e sessão persistidas somente no navegador.
- [x] Criar empresa e contratar Ana no onboarding local.
- [x] Começar com dados operacionais vazios, sem métricas do seed.
- [x] Cadastrar contas a receber manualmente ou por massa de teste.
- [x] Executar análise local de vencimentos.
- [x] Criar aprovação rastreável e registrar aprovação, recusa ou ajuste.
- [x] Informar explicitamente que nenhum envio externo aconteceu.
- [x] Permitir apagar o ambiente e repetir toda a validação.
- [ ] Permitir editar o conteúdo da cobrança antes de aprovar.
- [ ] Consolidar os aprendizados dos testes com usuários.

### 1. Fundação segura

- [x] Inicializar o repositório Git na branch `main`.
- [x] Corrigir a instalação da migration de Crew Intelligence.
- [x] Documentar todas as migrations e os segredos do worker/cron.
- [x] Identificar visualmente o modo demonstração.
- [x] Bloquear demo implícita em produção.
- [x] Adicionar testes da política de deployment.
- [ ] Aplicar as migrations em um projeto Supabase de desenvolvimento.
- [ ] Validar RLS usando duas organizações reais.

### 2. Policy Engine único

- Persistir e editar as políticas da Ana.
- Remover a duplicidade entre regras do frontend, cérebro e worker.
- Exigir decisão central antes de cada ferramenta.
- Registrar regra, limites, entrada e decisão na atividade.

### 3. Approval Flow completo

- Revisar e editar a cobrança antes da decisão.
- Aprovar, recusar ou solicitar ajuste sem deixar jobs órfãos.
- Retomar uma execução exatamente uma vez.
- Exibir falhas e permitir recuperação segura.

### 4. Envio real

- Escolher um primeiro canal em sandbox.
- Guardar credenciais somente no servidor.
- Implementar idempotência do envio.
- Registrar identificador e resposta do provedor.

### 5. Verdade operacional

- Calcular impacto a partir de execuções reais.
- Persistir detalhes completos das atividades.
- Gerar briefing usando evidências do período.
- Atualizar a interface em tempo real.

### 6. Prontidão do MVP

- Testes E2E do fluxo completo.
- Testes de concorrência, dupla aprovação e retry.
- Testes multi-tenant e de permissões.
- Revisão de acessibilidade, responsividade e estados vazios/erro.

## Fora do MVP inicial

- Crew Network, handoffs e missions.
- Execução operacional dos demais funcionários.
- Marketplace completo.
- Billing próprio.
- Múltiplos canais de cobrança.

Essas áreas permanecem na visão do produto, mas só avançam depois que o fluxo da Ana estiver comprovado de ponta a ponta.
