# Cérebros dos funcionários

Cada funcionário do CrewOS usa um cérebro especializado em `src/agents/brains`. O cérebro não é um modelo treinado separadamente: é a camada de competência que orienta o modelo escolhido pelo roteador.

Um cérebro define:

- identidade, missão e senioridade;
- domínios de especialidade;
- princípios e método de trabalho;
- critérios objetivos de qualidade;
- regras de escalonamento e aprovação;
- política de memória;
- autonomia por ferramenta;
- nível de raciocínio preferencial.

O `registry.ts` resolve primeiro a chave explícita `configuration.brainKey` do funcionário. Para cadastros antigos, usa o cargo e o departamento como fallback. O `ContinuousWorker` transforma a definição em uma política de sistema antes de pedir o plano ao provider.

## Criar um novo cérebro

1. Crie um módulo com `defineBrain(...)`.
2. Cadastre-o em `registry.ts` e adicione um matcher de cargo.
3. Grave sua chave em `digital_employees.configuration.brainKey`.
4. Implemente as ferramentas reais declaradas no cérebro.
5. Adicione testes de resolução, autonomia e critérios de qualidade.

As autonomias possíveis são `read`, `draft`, `act_within_scope`, `approval_required` e `forbidden`. A política global continua exigindo aprovação para pagamentos, compras, publicações, envios externos e ações irreversíveis, mesmo que uma configuração individual seja permissiva demais.

## Limite importante

Especialidade não deve depender apenas de prompt. Para produção, cada domínio deve ganhar ferramentas determinísticas, fontes autorizadas, avaliações com casos reais e memória recuperada por organização. O cérebro define como pensar e verificar; as ferramentas e os dados determinam o que o funcionário consegue realmente fazer.
