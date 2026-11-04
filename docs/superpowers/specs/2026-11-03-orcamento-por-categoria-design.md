# Orçamento por categoria: design

Data: 2026-11-03. Estado: aguardando aprovação.

## Contexto e intenção

O Aprumo responde "quanto sobra no mês" e "onde estou gastando mais", mas não diz se o gasto de uma categoria passou do que o dono queria gastar. Hoje só existe limite em cartão. O dono quer definir um **teto mensal por categoria de despesa** e ver, mês a mês, quanto gastou contra esse teto, para perceber a tempo quando uma categoria está estourando.

Esta é a primeira de cinco entregas combinadas, nesta ordem: (1) orçamento por categoria, (2) contas e saldo real, com resultado positivo/negativo por mês e gráfico do ano na Visão geral, (3) lembretes de vencimento, (4) insights e alertas, (5) PWA. Cada uma tem o próprio brainstorming, design e plano. Este documento cobre só a primeira.

## Objetivos

- Definir um teto mensal para qualquer categoria do tipo DESPESA.
- Ver, para o mês selecionado, o gasto de cada categoria com teto contra o teto, com barra de progresso e a diferença (quanto resta ou quanto estourou).
- Ver no Início um resumo só das categorias que merecem atenção.
- Mudar um teto sem reescrever o passado: meses anteriores mantêm o teto que valia na época.

## Fora do escopo

- Teto por item (só por categoria).
- Teto para categoria de RECEITA.
- Notificação, e-mail ou push quando uma categoria estoura (vem nas entregas 3 e 4).
- Sobra de um mês passando para o próximo.
- Teto diferente por mês escolhido à mão em vários meses de uma vez (o teto vale "a partir de um mês", ver abaixo).
- Metas de economia.

## Anti-objetivos (seria falha mesmo funcionando)

- Mudar o teto hoje alterar a leitura de meses fechados.
- A página ficar mais pesada de operar do que a planilha: editar um teto deve ser um gesto rápido, na própria linha da categoria.
- Poluir o Início quando está tudo dentro do teto.

## Regras decididas pelo dono

1. O teto é definido por categoria, vale igual em todos os meses até ser mudado.
2. "Gasto" é a soma dos lançamentos previstos e pagos da categoria no mês.
3. Existe uma página nova **Orçamento** com o detalhe de todas as categorias que têm teto.
4. O Início mostra só um resumo, com as categorias em atenção e um link "ver orçamento completo".
5. O teto é editado na própria página Orçamento.
6. Meses antigos mantêm o teto da época: mudar o teto não altera meses anteriores.
7. A barra é verde até 80% do teto, amarela de 80% a 100% e vermelha acima de 100%.
8. Categoria sem teto não aparece na página nem no resumo do Início.
9. A página mostra no topo o teto total, o gasto total e quanto resta.
10. A página usa o seletor de mês que já existe.

## Comportamento

### Página Orçamento

- Item novo no grupo **Financeiro** do menu, e na paleta de navegação (Ctrl K).
- Topo: teto total, gasto total e quanto resta, do mês selecionado.
- Lista: uma linha por categoria de despesa que tem teto no mês selecionado, com nome (e ícone/cor já existentes da categoria), gasto, teto, barra e o texto "resta R$ X" ou "estourou R$ X".
- Ordem: as mais próximas ou acima do teto primeiro (maior percentual primeiro).
- Categorias de despesa sem teto ficam numa seção recolhida "Sem teto", cada uma com a ação de definir um teto. Assim a definição acontece na própria página.
- Editar o teto: na linha, o valor vira um campo; ao salvar, o novo valor passa a valer **a partir do mês selecionado**. Remover o teto também vale a partir do mês selecionado.
- Mês sem nenhum teto definido ainda: estado vazio explicando como definir.

### Início

- Novo bloco "Atenção no orçamento" com as categorias em amarelo ou vermelho do mês selecionado, cada uma com "resta R$ X" ou "estourou R$ X", e o link "Ver orçamento completo".
- Se há tetos e nenhuma categoria está em atenção: uma linha dizendo que tudo está dentro do teto.
- Se nenhum teto foi definido: o bloco não aparece.
- O bloco existente "categorias onde mais gastou" continua como está.

### Cálculo

- Gasto do mês de uma categoria = soma de `valor` dos lançamentos (status PREVISTO ou PAGO) dos itens da categoria, naquele ano e mês.
- Teto vigente em um mês = o teto registrado com a vigência mais recente que não seja posterior a esse mês. Se o registro mais recente é uma remoção, a categoria está sem teto naquele mês.
- Percentual = gasto / teto. Verde abaixo de 80%, amarelo de 80% até 100% inclusive, vermelho acima de 100%.
- Teto total e gasto total da página somam apenas as categorias que têm teto no mês. "Resta" = teto total menos gasto total, podendo ser negativo.

## Restrições

- Mesma stack do projeto: Spring Boot, JPA, Flyway, PostgreSQL; React, TypeScript, TanStack Query, Tailwind.
- Dinheiro em `BigDecimal` no Java, `numeric(12,2)` no banco e string no JSON.
- Toda consulta filtra pelo usuário autenticado; recurso de outro usuário responde 404.
- Migration nova no Flyway, sem alterar as existentes.
- Lançamentos continuam sem ligação direta com o teto; o gasto é calculado, não gravado.
- A página precisa funcionar bem no celular, como o resto do app, mas não há trabalho de layout específico além do que já é padrão no projeto.
- Testes em cada camada, como no restante do projeto. Código Java pelo agent `java-spring`, front-end pelo `frontend-developer`.

## Decisões do construtor (minhas, para você conferir)

- **Modelo de vigência:** um teto é um registro "a partir de ano/mês" com valor (ou sem valor, para remoção) por categoria. O teto de um mês é o registro mais recente até aquele mês. Isso cumpre a regra 6 sem copiar valores mês a mês.
- **Editar vale a partir do mês selecionado:** se você está vendo dezembro e muda o teto, dezembro e os meses seguintes mudam; novembro e anteriores não. Se mudar vendo um mês passado, esse mês e os seguintes mudam (não há como proteger só o mês). A página avisa isso ao salvar.
- **Salvar um teto nunca apaga registros posteriores.** Se já existe uma mudança registrada para um mês futuro, o novo valor vale só até ela, e o aviso ao salvar diz isso ("em janeiro/2027 o teto continua R$ 500"). Escolhi não apagar porque é a opção que não destrói nada que o dono definiu antes. (Decisão delegada pelo dono ao construtor.)
- **Editar com um mês passado selecionado é permitido**, só com aviso claro de que aquele mês e os seguintes mudam. Sem bloqueio na API nem ação desabilitada na tela. (Decisão delegada pelo dono ao construtor.)
- **Teto não pode ser zero nem negativo.** Para não ter teto, use remover.
- **Itens arquivados contam no gasto** da categoria, e apagar uma categoria apaga os tetos dela.
- **Totais só com categorias que têm teto**, para que "resta" tenha sentido.
- **Início:** o bloco novo vai somado ao "onde mais gastou", sem substituí-lo.
- **Onde fica no menu:** logo depois de Categorias, no grupo Financeiro.
- **Ordem na lista:** maior percentual primeiro.
- **Ícone e cor** da categoria reaproveitam o que já existe.

## O que fica para o construtor

Nomes de endpoints, formato exato das respostas, estrutura de componentes, nomes de tabela e coluna, textos finais de interface, estados de carregamento e erro, e a escolha de como o front calcula percentuais e faixas (no servidor ou no cliente), desde que respeite as regras acima.
