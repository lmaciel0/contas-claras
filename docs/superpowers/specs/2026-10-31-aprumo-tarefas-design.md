# Aprumo, módulo 2: Tarefas

Data: 2026-10-31. Segundo módulo do Aprumo (depois da base, PR #3).

## Intenção e porquê

O dono anota atividades essenciais e precisa tê-las sempre à vista para não esquecer. O ponto central é **visibilidade, não gestão**: a lista pendente do dia deve aparecer sem esforço, na tela inicial, e a página própria deve ser rápida de usar. Referência de estilo: Microsoft To Do (lista simples, "Meu dia"). O Microsoft Planner (quadros kanban) fica para o módulo 4, projetos.

## Objetivos

1. Criar uma tarefa em segundos (só título; data é opcional).
2. Um card "Hoje" na tela inicial mostra as tarefas de hoje e as atrasadas, com adicionar rápido e marcar como feita sem sair da tela.
3. Uma página Tarefas (aba no menu lateral) organiza tudo em Atrasadas, Hoje, Próximas e Concluídas.
4. Dados por usuário, isolados como no resto do app.

## Não objetivos

Listas nomeadas, subtarefas ou passos, repetição, lembretes ou notificações, prioridade, anexos, notas dentro da tarefa, atribuição a pessoas, arrastar para reordenar, busca, quadro kanban (módulo 4), integração com calendário (módulo 5).

## Anti-objetivos (seria falha mesmo funcionando)

- Exigir preencher campos além do título para criar.
- O card atrasar ou bloquear a tela inicial. A saudação e o resumo financeiro continuam aparecendo sem esperar as tarefas.
- Qualquer sinal de cobrança ou burocracia: nada de formulário longo, nada de confirmações desnecessárias.

## Comportamento

### Modelo de uma tarefa
Título (1 a 200 caracteres, sem espaços nas pontas), data opcional (só dia, sem hora), estado concluída ou não (com o momento da conclusão), momento de criação.

### Agrupamento (decisões do dono e minhas, ver marcações)
O "hoje" é sempre o dia em `America/Sao_Paulo`.
- **Atrasadas:** abertas com data anterior a hoje.
- **Hoje:** abertas com data de hoje.
- **Próximas:** abertas com data futura, seguidas das abertas sem data (a linha mostra "sem data"). *(Minha escolha: sem data fica junto de Próximas, como no mockup aprovado.)*
- **Concluídas:** recolhida por padrão, com contagem. Mostra as 50 mais recentes por momento de conclusão. *(Minha escolha.)*

### Card "Hoje" na tela inicial
- Mostra Atrasadas e Hoje abertas mais as concluídas hoje (riscadas, esmaecidas, no fim). Título do card "Hoje"; contador "X de Y feitas", onde Y = abertas de hoje e atrasadas + concluídas hoje, e X = concluídas hoje. *(Minha definição.)*
- Marcar como feita é clicar no círculo; clicar de novo reabre.
- Adicionar rápido: campo de título; a tarefa criada ali recebe a data de hoje. *(Minha escolha.)*
- Mostra até 5 itens, com "+N" levando à página quando passar disso. *(Minha escolha.)*
- Link "Ver todas" leva a `/tarefas`.
- Sem tarefas: mensagem curta convidando a adicionar. Erro de API: mensagem dentro do card, sem derrubar a tela.

### Página Tarefas (`/tarefas`)
- Campo "Adicionar uma tarefa" no topo; a tarefa criada ali fica **sem data**. *(Minha escolha: diferente do card, que assume hoje.)* A data se define depois, ao editar.
- Seções na ordem: Atrasadas, Hoje, Próximas, Concluídas (seções vazias não aparecem, exceto Concluídas sempre recolhida com contagem).
- Editar: título e data, na própria linha. Excluir: pela linha, seguindo o padrão de exclusão já usado em categorias.
- Marcar como feita e reabrir, igual ao card.

### Menu e paleta
Item "Tarefas" entra em `layout/itensMenu.ts` (aparece no menu lateral e na paleta Ctrl K automaticamente). Rota `/tarefas` dentro da moldura do usuário, protegida.

## Restrições e padrões a seguir

- Backend segue o padrão dos módulos existentes: pacote `tarefa/` em `dev.lmaciel.contasclaras` com controller, service, repository, entidade e DTOs como records; mensagens de erro em português como constantes; id alheio ou inexistente devolve 404; usuário via `UsuarioLogado`; hora via `Clock` injetado (`America/Sao_Paulo`).
- Migration `V5__tarefa.sql`, sem prefixo de schema, com `usuario_id` referenciando `usuario` com `on delete cascade`, índice por usuário, `check` no tamanho do título. Hibernate em `validate`.
- Frontend segue o padrão: `useQuery` e `useMutation` do TanStack Query, endpoints em `api/endpoints.ts`, tipos em `api/tipos.ts`, `invalidar.ts` por módulo, página em `paginas/tarefas/`, card como componente irmão de `FinancasDoMes` em `paginas/painel/`, com seu próprio `useQuery` e estados de carregamento e erro dentro do bloco. Datas são strings `yyyy-MM-dd`, sem passar por `Date` do navegador.
- Estilo respeita os tokens de tema claro e escuro do módulo 1.
- O agrupamento (atrasadas, hoje, próximas) é calculado no backend com o `Clock`, para o fuso ter uma única fonte de verdade. *(Minha escolha.)*

## Fica a cargo de quem for construir

Formato exato dos endpoints e do JSON, nomes de classes e colunas, texto das mensagens, detalhes visuais do card e da página dentro dos tokens existentes, forma de editar na linha, estratégia de invalidação de cache.

## Testes esperados

Backend: integração com Testcontainers cobrindo criar, listar agrupado (com relógio fixo), editar, concluir e reabrir, excluir, validação do título, e isolamento entre dois usuários (404 para tarefa alheia). Frontend: teste do card (adicionar, concluir, estado vazio, erro) e da página (agrupamento e ações) com msw.

## Fora deste módulo

Deploy segue o procedimento existente depois do merge. Módulos seguintes (notas, projetos, calendário e contas a pagar) têm design próprio.

## Referências visuais

Mockup aprovado em conversa (card "Hoje" na tela inicial e página Tarefas com seções). Estrutura apenas; cores e tipografia vêm dos tokens do app.
