# Visão geral renovada, etapa 1: resultado de cada mês

Data: 2026-11-03. Estado: aguardando aprovação.

## Contexto e intenção

A Visão geral (rota `/financeiro`, título "Início") já mostra a sobra do mês, receitas e despesas com comparação ao mês anterior, um gráfico de receitas × despesas com as 12 colunas do ano, onde mais gastou e próximas contas. O que falta é o dono bater o olho no ano e ver, mês a mês, **quanto sobrou ou faltou**. Hoje ele precisa comparar duas barras de cabeça em cada mês.

O dono também mostrou como referência um painel de outro app (saldo total, resumo do mês, fluxo de caixa espelhado, gastos por categoria, cartões, últimas transações) e disse que gostou de ser "completo, abordando um pouco de tudo". A foto é só inspiração: vale o espírito, não o layout nem os tipos de gráfico.

Esta é a etapa 1 de duas. A etapa 2 (contas cadastradas e saldo total no topo) tem design próprio depois. Faz parte de uma lista maior combinada: orçamento por categoria (design já escrito, plano adiado), contas e saldo, lembretes de vencimento, insights e alertas, PWA.

## Objetivos

- Mostrar o resultado de cada um dos 12 meses do ano do mês selecionado (receitas menos despesas), num gráfico próprio, legível de relance.
- Dizer a sobra do mês também como percentual da receita.
- Tornar a Visão geral mais completa com um resumo dos cartões, sem precisar abrir a página Cartões.
- Manter a identidade visual do Aprumo (cores, cartões, tema claro e escuro, listrado de "previsto").

## Fora do escopo

- Contas, carteiras e saldo total (etapa 2).
- Nota de saúde financeira e alertas (insights, entrega posterior).
- Gráfico de rosca de gastos e bloco de últimas transações.
- Orçamento e teto por categoria.
- Clicar numa coluna para trocar o mês selecionado (o seletor de mês existente continua sendo o único jeito).
- Mudar páginas que não sejam a Visão geral.
- Novos componentes de UI vindos de bibliotecas externas: o gráfico é feito com o Recharts que o projeto já usa.

## Anti-objetivos (seria falha mesmo funcionando)

- O gráfico novo ser mais difícil de ler que o atual.
- Depender só de cor (verde/vermelho) para dizer se sobrou ou faltou.
- A Visão geral piorar no celular ou ficar mais lenta para carregar.
- Trocar o visual do Aprumo por outro estilo (vidro, outra fonte, outra paleta).

## Decisões do dono

1. O gráfico próprio de resultado mostra as barras espelhadas: receitas para cima e despesas para baixo de uma linha zero, e o resultado de cada mês marcado.
2. O resultado do mês é receitas menos despesas, contando previsto e pago, como o "Sobra do mês" de hoje.
3. O que ainda não foi pago aparece como previsto (listrado), como o gráfico atual; um mês futuro fica inteiro listrado.
4. O card "Sobra do mês" ganha "% da receita".
5. Entra um bloco de resumo dos cartões; o resto da Visão geral continua como está.
6. Pode aproveitar o que as referências têm de melhor em vez de copiá-las.

## Comportamento

### Gráfico "Resultado de cada mês"

- Substitui o gráfico "Receitas × Despesas" atual, no mesmo lugar da página.
- Ano mostrado: o do mês selecionado. Jan a Dez.
- Por mês: barra de receitas para cima, barra de despesas para baixo da linha zero, ambas do mesmo eixo.
- O resultado de cada mês aparece escrito abaixo do nome do mês, com sinal explícito (+ ou −) e abreviado (por exemplo "−1,2 mil", "+80"), em verde quando sobrou e vermelho quando faltou. O sinal garante a leitura sem depender da cor.
- Mês selecionado destacado com contorno.
- "Previsto" funciona como no gráfico atual: em cada barra, a parte já paga é sólida e a parte ainda não paga (status PREVISTO) é listrada, em qualquer mês. Um mês futuro, onde tudo é previsto, fica inteiro listrado. Isso vale para os dois lados da linha zero: receitas para cima e despesas para baixo, cada lado com sua parte paga e sua parte prevista empilhadas.
- Ao passar o mouse ou tocar numa coluna: dica com receitas, despesas e resultado do mês, valores completos em reais.
- Acima ou ao lado do gráfico: legenda (receitas, despesas, previsto) e o resultado acumulado do ano até o mês selecionado, com sinal.
- Acessibilidade: o gráfico tem descrição em texto e uma tabela escondida com os 12 meses (mês, receitas, despesas, resultado) para leitor de tela.
- Mês sem lançamentos: barras zeradas e resultado "0" sem cor de alerta.

### Card "Sobra do mês"

- Continua com o valor e a comparação com o mês anterior.
- Novo: "X% da receita", onde X é a sobra dividida pela receita do mês, arredondado para inteiro, com sinal (−36%, +17%). Se a receita do mês é zero, o percentual não aparece.

### Bloco "Cartões"

- Lista os cartões do usuário com a fatura do mês selecionado contra o limite e uma barra de uso, usando as mesmas faixas verde, amarelo e vermelho da página Cartões (as faixas vêm prontas do servidor).
- Cartão sem limite definido mostra só o valor da fatura, sem barra.
- Link "Ver cartões" leva à página Cartões preservando o mês.
- Sem nenhum cartão cadastrado: o bloco não aparece.

### Demais blocos

"Onde você mais gastou" e "Próximas contas" continuam como estão, reorganizados na grade para acomodar o gráfico e o bloco de cartões. No celular os blocos empilham em uma coluna, como hoje.

## Restrições

- Stack existente: React, TypeScript, Recharts, TanStack Query, Tailwind; backend Spring Boot só se for preciso expor dados que a API ainda não entrega (o resultado por mês pode ser calculado no cliente a partir dos totais mensais que o gráfico atual já recebe).
- Dinheiro continua como string no JSON; a conta do resultado e do percentual não usa ponto flutuante impreciso (usar a mesma abordagem de centavos já usada em `paginas/inicio/valores.ts`).
- Cores via tokens do tema, funcionando nos temas claro e escuro, com contraste mínimo de 4,5:1 nos textos.
- Respeitar `prefers-reduced-motion` em animações do gráfico.
- O que o servidor devolve para o Início deve continuar isolado por usuário.
- Testes de front como no projeto (Vitest, Testing Library, MSW); se o Início passar a chamar um endpoint novo, o handler base de testes precisa ser atualizado.
- Código de front-end pelo agent `frontend-developer`; Java, se houver, pelo `java-spring`.

## Decisões do construtor (minhas, para você conferir)

- **Percentual da receita:** sobra dividida pela receita do mês, inteiro, sinal explícito, escondido quando a receita é zero.
- **Resultado acumulado do ano** (soma de Jan até o mês selecionado, previsto incluído) aparece junto ao gráfico. O card de sobra já tem "No ano" com o ano inteiro; os dois podem conviver, o acumulado do gráfico vai até o mês selecionado.
- **Sem clique na coluna** para trocar de mês nesta etapa.
- **Cálculo no cliente** do resultado por mês, a partir dos dados que já existem, para não criar endpoint à toa. O construtor decide se algo precisa mudar no servidor.
- **Tabela escondida e descrição em texto** do gráfico por acessibilidade.
- **Cartões:** mesmas faixas do servidor, sem barra quando não há limite, bloco escondido sem cartões.
- **Dica ao passar o mouse ou tocar** com receitas, despesas e resultado, mostrando também quanto de cada lado está pago e quanto está previsto.
- **Fonte dos dados dos cartões:** o bloco faz uma consulta própria à API de cartões que já existe (`/api/cartoes` com ano e mês), sem mexer no backend. Se essa consulta falhar, o resto da página aparece normalmente e só o bloco de cartões some. Cartões inativos ou sem fatura seguem o que o servidor já devolver, sem filtro extra no cliente.
- **"Previsto" por barra, não por mês:** mantive a divisão atual entre pago (sólido) e previsto (listrado) em todos os meses, em vez de listrar só meses futuros.
- **Referências:** do 21st aproveito a ideia de rótulo de valor, tabela escondida e padrão listrado para previsto; da foto, as barras espelhadas e a sensação de painel completo.

## O que fica para o construtor

Estrutura de componentes e arquivos, nomes e formato de qualquer endpoint novo, textos finais de interface, estados de carregamento e erro, escolha entre `ComposedChart` ou barras com valores negativos do Recharts, e a organização exata da grade entre os blocos, respeitadas as regras acima.
