# Saldo do Itaú e card de receitas no Orçamento — design

Data: 2026-11-04. Projeto: contas-claras (Aprumo).

## Intenção

O dono quer ver, dentro do Aprumo, quanto dinheiro tem de verdade, isto é, o que está na conta hoje, sem contar fatura de cartão em aberto nem receita que ainda vai entrar. Hoje o Aprumo só mostra "sobra" do mês, que mistura previsto e pago.

Junto disso, a aba Orçamento (rota `/lancamentos`) mostra as receitas (Salário, Camila) com o mesmo card e as mesmas linhas das despesas, incluindo os rótulos "Pago/Previsto". O dono não gostou: receita deve parecer receita. As duas mudanças moram na mesma página e se complementam, então entram no mesmo design.

## Metas

- Mostrar no topo do Orçamento uma faixa com o saldo do Itaú e o total recebido no mês.
- Calcular o saldo sozinho, a partir dos lançamentos marcados como pagos.
- Dar às receitas um card próprio, diferente do das despesas, com o total recebido em destaque.

## Não metas

- Não criar entidade Conta, cadastro de contas nem escolha de conta ao marcar um lançamento como pago. Tudo entra e sai pelo Itaú, sempre (palavras do dono).
- Não pedir saldo inicial digitado.
- Não mexer na Visão geral (`InicioPage`), que está no PR #35 ainda aberto.
- Não alterar o card das despesas nem o dos cartões de crédito, a não ser o necessário para separar as receitas.
- Não ajustar layout de celular além do que a página já faz hoje.

## Anti-metas (seria falha mesmo que "funcione")

- A sobra de um mês aparecer em mês anterior a ele.
- Previsto contar como dinheiro em mãos.
- Receita e despesa continuarem visualmente parecidas.

## Regras de negócio (decididas pelo dono)

1. **Início do cálculo: novembro de 2026.** Não há saldo inicial digitado. O saldo começa em zero nesse mês, que é onde estão os lançamentos hoje. Lançamentos de meses anteriores são ignorados. O mês de início deve ser um valor único de configuração, fácil de mudar depois (o dono disse que pode querer mudar).
2. **A sobra anda só para a frente.** Se novembro sobrar R$ 500, esse valor conta em dezembro e nos seguintes, nunca em outubro. O saldo de um mês é o acumulado desde o mês de início até aquele mês, inclusive.
3. **Só conta o que foi pago.** Lançamento PAGO de categoria RECEITA soma; PAGO de categoria DESPESA subtrai. PREVISTO não entra.
4. **Fatura de cartão paga subtrai.** Os itens com `cartao=true` entram como despesa comum quando PAGO, porque o dinheiro saiu do Itaú. Fatura em aberto (PREVISTO) não entra. (Palpite do assistente, confirmado no resumo final pelo dono.)
5. **Antes do mês de início, a faixa fica escondida.** (Palpite do assistente, confirmado no resumo final pelo dono.)

## Decisões de desenho (visuais, escolhidas pelo dono)

### Card de receitas: opção "B, total em destaque com barra"

Referência visual salva em `.superpowers/brainstorm/*/content/receitas-card.html` (opção B). Em resumo:

- Um bloco com fundo pontilhado suave no topo do card, com o rótulo "Recebido no mês", o total recebido grande em verde, uma barra de recebido contra previsto, e a legenda "X% do previsto · a receber R$ Y".
- Abaixo, uma linha por fonte de renda (nome, data, valor) com selo **"Recebido"** (verde) ou **"A receber"** (neutro). Esses rótulos valem só para receitas. Despesas continuam com "Pago/Previsto".
- Mantém a identidade visual atual do app: fundo lavanda, cards brancos arredondados, índigo escuro como cor primária, verde para dinheiro que entrou.
- As referências do catálogo 21st (Animated Dashboard Card, Transaction List, Payment Summary Card) servem só de inspiração. Não usar o código pago delas; implementar no estilo do projeto.

### Faixa do saldo: opção "B, faixa no topo do Orçamento"

Referência em `.superpowers/brainstorm/*/content/saldo-onde.html` (opção B). Em resumo:

- Faixa em degradê índigo, acima dos cards, abaixo do cabeçalho "Orçamento".
- À esquerda: rótulo e valor grande do saldo. À direita: "Recebido no mês" com o total recebido.
- Escolhido em vez do card na Visão geral (conflitaria com o PR #35) e do chip no cabeçalho.

## Escolhas do assistente (marcadas como minhas, o dono não decidiu)

- Rótulo da faixa: no mês corrente, "Dinheiro no Itaú hoje". Em outro mês, "Saldo no Itaú ao fim de {mês}".
- Um único card consolidado "Receitas" para todas as categorias de tipo RECEITA, em vez de um card por categoria como hoje (Salário e Camila hoje são dois cards). O mockup aprovado mostra um card só.
- O mês de início fica em propriedade de configuração do backend (por exemplo `aprumo.saldo.inicio=2026-11`).
- Mês futuro: o saldo é sempre o acumulado só de lançamentos PAGO do mês de início até o mês selecionado. Previsto nunca entra, nem em meses futuros. O rótulo é o de "ao fim de {mês}".
- "Recebido no mês" (faixa e card) é a soma dos lançamentos PAGO de categorias RECEITA no mês selecionado. Vem do mesmo endpoint do saldo, para a faixa não depender dos lançamentos carregados na página.
- Barra do card: o denominador é a soma de todas as receitas do mês (PAGO + PREVISTO). Se for zero, a barra não aparece.
- Mês sem receitas: o card de Receitas continua aparecendo, com a mensagem "Nenhuma receita neste mês", para o dono saber onde elas entrariam.
- Mês anterior ao início: só a faixa do saldo (que inclui o "recebido no mês" dela) fica escondida. O card de Receitas aparece normalmente, porque mostra lançamentos que existem.

## Restrições do que já existe

- O `valor` do lançamento é sempre positivo (`numeric(12,2)` com restrição `> 0`), então não existe estorno negativo: o sinal vem só do tipo da categoria.
- Lançamento tem `ano`, `mes`, `valor`, `status` (`PREVISTO`/`PAGO`), sem data de pagamento nem conta. Receita ou despesa vem da categoria do item (`categoria.tipo`). Um lançamento por item por mês.
- Cartão é um item com `cartao=true`, a fatura é um lançamento comum.
- Não existe nenhuma estrutura de conta ou saldo hoje; não há migration necessária para o cálculo, que sai dos lançamentos. Última migration é V13; `ddl-auto` é `validate`.
- Backend em Java/Spring, pacote por feature em `dev.lmaciel.contasclaras.<feature>`, controllers com `@AuthenticationPrincipal Jwt`. O "hoje" deve vir do `Clock` injetável (ClockConfig) para ser testável.
- Frontend React 19, react-query 5, Tailwind 4, vitest + MSW. Endpoint novo chamado pela página pode exigir handler base em `src/teste/servidor.ts`.
- Acessibilidade: contraste mínimo 4,5:1, foco visível, `cursor-pointer` em clicáveis, respeitar `prefers-reduced-motion`, sem emoji como ícone.

## Fica a cargo de quem for construir

- Formato do endpoint do saldo (novo `GET /api/saldo?ano&mes` ou campo novo em endpoint existente) e como calcular o acumulado (agregação em SQL por mês).
- Como separar receitas das despesas na página sem quebrar o comportamento atual dos cards, da busca e do botão "+ Lançar".
- Comportamento dos selos clicáveis: se o selo atual alterna Pago/Previsto, o novo deve continuar alternando, só com outro texto.
- Estado de carregando e de erro da faixa.
- Testes (TDD): cálculo do saldo (início, acumulado, previsto ignorado, fatura paga, mês anterior ao início) e telas.

## Ordem sugerida

1. Card de receitas (só frontend, sem dado novo).
2. Cálculo do saldo no backend, com testes.
3. Faixa do saldo no frontend, ligada ao endpoint.

Branch a partir da `main`. Independente dos PRs #35 e #36.
