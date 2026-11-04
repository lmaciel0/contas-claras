# Visão geral: resultado de cada mês (etapa 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Todo código de front-end é escrito pelo agent `frontend-developer`. Commit e push só quando o dono pedir; merge nunca sem autorização.

**Goal:** Trocar o gráfico "Receitas × Despesas" da Visão geral por um gráfico de resultado mensal (barras espelhadas, resultado escrito por mês), mostrar "% da receita" no card de sobra e adicionar um bloco de resumo dos cartões.

**Architecture:** Tudo no front-end (`frontend/src`), sem mudança no backend. O resultado por mês é calculado no cliente a partir de `ResumoResponse.serieAno`. O bloco de cartões usa `endpoints.cartoes.listar`, consultado pela própria `InicioPage`. O gráfico continua em Recharts, carregado com `lazy`.

**Tech Stack:** React 19, TypeScript, Recharts 3, TanStack Query, Tailwind v4, Vitest, Testing Library, MSW.

**Spec:** `docs/superpowers/specs/2026-11-03-visao-geral-resultado-mensal-design.md`

## Global Constraints

- Identidade visual atual do Aprumo: tokens de `frontend/src/index.css` (`--cor-grafico-*`, `--cor-positivo-texto`, `--cor-negativo-texto`), temas claro e escuro, sem nova fonte nem paleta.
- Dinheiro: string decimal na API; contas em centavos inteiros com `paraCentavos` (`paginas/inicio/valores.ts`), nunca ponto flutuante direto.
- Sinal negativo escrito com `−` (U+2212), como em `formatarComSinal`. O resultado nunca depende só de cor: sempre tem `+` ou `−`.
- "Previsto" por barra: parte paga sólida, parte `PREVISTO` listrada, em qualquer mês, nos dois lados da linha zero.
- Sem animação nas barras (`isAnimationActive={false}`), o que atende `prefers-reduced-motion`.
- Contraste mínimo de 4,5:1 nos textos; foco visível em links.
- Mensagens e rótulos em português do Brasil.
- Rodar a verificação com saída filtrada: `cd frontend && npm test -- --run 2>&1 | tail -30`.

## Review Focus

- `serieAno` vazia (o handler base de teste devolve `[]`): gráfico, acumulado e tabela escondida não quebram e mostram zero.
- Receita do mês igual a zero: "% da receita" não aparece; sobra zero mostra `0%` sem sinal.
- Resultado de 1 milhão ou mais e resultado entre −1 e +1 real: rótulo curto continua legível (`+1.234,6 mil`, `0`).
- Cartão com uso acima de 100%: barra limitada a 100% de largura, `aria-valuenow` limitado a 100, texto mostra o percentual real.
- Consulta de cartões falhando: resto da página renderiza normal, bloco some, sem `role="alert"` por causa dele.
- Largura de 375 px: sem rolagem horizontal; rótulos do eixo não se sobrepõem (formato compacto `k`).

## File Structure

- Modify `frontend/src/paginas/inicio/valores.ts` (+ `valores.test.ts`): funções puras de resultado.
- Create `frontend/src/paginas/inicio/GraficoResultado.tsx`, `BarrasDoResultado.tsx`, `TooltipResultado.tsx` (+ testes): bloco do gráfico. Delete `GraficoAno.tsx` e `BarrasDoAno.tsx`.
- Modify `frontend/src/paginas/inicio/CardSobra.tsx`: percentual da receita.
- Create `frontend/src/paginas/cartoes/faixas.ts`: cores/classes por faixa, extraídas de `CardCartao.tsx`.
- Create `frontend/src/paginas/inicio/ResumoCartoes.tsx` (+ teste).
- Modify `frontend/src/paginas/inicio/OndeMaisGastou.tsx`, `ProximasContas.tsx`, `InicioPage.tsx` (+ `InicioPage.test.tsx`) e `frontend/src/teste/servidor.ts`: grade e consulta de cartões.

---

### Task 1: Funções puras do resultado mensal

**Files:**
- Modify: `frontend/src/paginas/inicio/valores.ts`
- Test: `frontend/src/paginas/inicio/valores.test.ts`

**Interfaces:**
- Consumes: `PontoSerie` (`api/tipos.ts`), `paraCentavos`, `ROTULOS_CURTOS` (já em `valores.ts`).
- Produces (usado pelas Tasks 2 e 3):

```ts
export interface PontoDoResultado {
  mes: number
  rotulo: string // 'Jan'..'Dez'
  receitasPagas: number // reais, >= 0
  receitasPrevistas: number // reais, >= 0
  despesasPagas: number // reais, <= 0 (a barra desce)
  despesasPrevistas: number // reais, <= 0
  receitas: number // total em reais, >= 0 (pago + previsto)
  despesas: number // total em reais, >= 0
  resultado: number // receitas - despesas, em reais
  sentido: 'sobrou' | 'faltou' | 'zero'
}
export function serieDoResultado(serie: PontoSerie[]): PontoDoResultado[]
export function resultadoAcumulado(serie: PontoSerie[], ateMes: number): string // decimal com 2 casas, ex. "-1234.50"
export function resultadoCurto(resultado: number, compacto: boolean): string
export function percentualDaReceita(sobra: string, receitas: string): string | null
```

`serieDoGrafico` e `PontoDoGrafico` continuam nesta task (o `GraficoAno` ainda os usa); a Task 2 os remove junto com o `GraficoAno`.

- [ ] **Step 1: Escrever os testes que falham em `valores.test.ts`**

Casos exatos (comparar com `semNbsp` onde houver `R$`):
  - `serieDoResultado`: ponto `{mes:11, receitas:'1000.00', receitasPrevistas:'400.00', despesas:'800.00', despesasPrevistas:'200.00'}` gera `receitasPagas 600`, `receitasPrevistas 400`, `despesasPagas -600`, `despesasPrevistas -200`, `receitas 1000`, `despesas 800`, `resultado 200`, `sentido 'sobrou'`, `rotulo 'Nov'`. Despesas maiores que receitas dão `sentido 'faltou'`; ambos zero dão `'zero'`. Lista vazia dá `[]`.
  - `resultadoAcumulado`: série com resultados `[-100, 50, 30]` nos meses 1 a 3 e zero no resto: `ateMes 2` → `"-50.00"`, `ateMes 3` → `"-20.00"`; série vazia → `"0.00"`.
  - `resultadoCurto(80,false)` → `"+80"`; `(-1200,false)` → `"−1,2 mil"`; `(-1200,true)` → `"−1,2k"`; `(2000,false)` → `"+2 mil"`; `(2000,true)` → `"+2k"`; `(0,false)` → `"0"`; `(-0.4,false)` → `"0"`; `(999.6,false)` → `"+1 mil"`; `(1234567,false)` → `"+1.234,6 mil"`.
  - `percentualDaReceita('-1884.20','5270.00')` → `"−36%"`; `('799.50','5000.00')` → `"+16%"`; `('0.00','5000.00')` → `"0%"`; `('-0.10','5000.00')` → `"0%"`; `('100.00','0.00')` → `null`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && npx vitest run src/paginas/inicio/valores.test.ts 2>&1 | tail -20`
Expected: FAIL (funções não definidas).

- [ ] **Step 3: Implementar as quatro funções e `PontoDoResultado` em `valores.ts`**

Todas em centavos inteiros. `resultadoCurto`: `reais = Math.round(Math.abs(resultado))`; abaixo de 1000 usa o inteiro; a partir de 1000 usa `Math.round(reais / 100) / 10` formatado com `toLocaleString('pt-BR', { maximumFractionDigits: 1 })`, sufixo ` mil` (ou `k` colado se `compacto`); `reais === 0` devolve `"0"` sem sinal. `percentualDaReceita`: `Math.round(Math.abs(sobraCentavos) * 100 / receitasCentavos)`, meio para cima; resultado `0` sai `"0%"` sem sinal; receita zero devolve `null`. Não mexer em `serieDoGrafico`.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd frontend && npx vitest run src/paginas/inicio/valores.test.ts 2>&1 | tail -20`
Expected: PASS.

- [ ] **Step 5: Commit (só com autorização do dono)**

```bash
git add frontend/src/paginas/inicio/valores.ts frontend/src/paginas/inicio/valores.test.ts
git commit -m "feat(inicio): funções de resultado mensal e percentual da receita"
```

---

### Task 2: Bloco "Resultado de cada mês"

**Files:**
- Create: `frontend/src/paginas/inicio/GraficoResultado.tsx`, `BarrasDoResultado.tsx`, `TooltipResultado.tsx`
- Delete: `frontend/src/paginas/inicio/GraficoAno.tsx`, `BarrasDoAno.tsx`
- Modify: `frontend/src/paginas/inicio/valores.ts` (remover `serieDoGrafico`, `PontoDoGrafico`) e `valores.test.ts` (remover os testes dela)
- Modify: `frontend/src/paginas/inicio/InicioPage.tsx` (trocar `GraficoAno` por `GraficoResultado`, sem mexer na grade; a Task 5 reorganiza)
- Test: `frontend/src/paginas/inicio/GraficoResultado.test.tsx`, `TooltipResultado.test.tsx`

**Interfaces:**
- Consumes: `serieDoResultado`, `resultadoAcumulado`, `resultadoCurto`, `PontoDoResultado` (Task 1); `formatarComSinal`; `nomeMes` (`formato/mes.ts`); `useEhDesktop` (`layout/useEhDesktop.ts`); cores em `cores.ts`.
- Produces (usado pela Task 5):

```tsx
export function GraficoResultado(props: { ano: number; mes: number; serie: PontoSerie[]; className?: string }): JSX.Element
// BarrasDoResultado.tsx (export default, carregado com lazy)
export default function BarrasDoResultado(props: { dados: PontoDoResultado[]; mesSelecionado: number; compacto: boolean }): JSX.Element
// TooltipResultado.tsx
export function TooltipResultado(props: { ponto: PontoDoResultado | null }): JSX.Element | null
```

`GraficoResultado` aceita `className` para a Task 5 posicionar na grade; a seção continua com a classe `card`.

- [ ] **Step 1: Escrever os testes que falham**

`GraficoResultado.test.tsx` (usar o mesmo jeito de `InicioPage.test.tsx` para o Recharts ter dimensão em jsdom; série de teste: janela com novembro `receitas '1000.00'`, `receitasPrevistas '400.00'`, `despesas '800.00'`, `despesasPrevistas '200.00'`, resto zero; `ano 2026`, `mes 10`):
  - `tem_regiao_nomeada_grupo_e_legenda`: região `Resultado de cada mês em 2026`; grupo `Gráfico do resultado de cada mês em 2026`; lista `Legenda do gráfico` com itens `['Receitas','Despesas','Previsto']`.
  - `barras_espelhadas_com_parte_prevista_listrada`: 4 `.recharts-bar`; fills `var(--cor-grafico-receitas)` e `var(--cor-grafico-despesas)` nas pagas e `url(#id)` de dois `<pattern>` nas previstas; alturas receitas pagas/previstas ≈ 1,5, despesas pagas/previstas ≈ 3, total receitas/total despesas ≈ 1,25; o `y` do retângulo de despesas é maior ou igual ao `y + height` do de receitas (a barra desce da linha zero).
  - `mostra_o_resultado_com_sinal_abaixo_do_mes`: o texto `+200` aparece no eixo (novembro) e `0` nos meses zerados; o rótulo `Out` do mês selecionado tem `data-selecionado="true"` e os demais não.
  - `mostra_o_acumulado_do_ano_ate_o_mes_selecionado`: texto `Acumulado até outubro` com o valor de `formatarComSinal(resultadoAcumulado(serie, 10))`.
  - `tabela_escondida_com_os_doze_meses`: `role="table"` de nome `Resultado de cada mês em 2026` com 12 linhas de dados mais cabeçalho `Mês, Receitas, Despesas, Resultado`; a linha de novembro tem `Nov`, `R$ 1.000,00`, `R$ 800,00`, `R$ 200,00` (comparar sem nbsp).
  - `serie_vazia_nao_quebra`: com `serie=[]` renderiza a região, o acumulado `R$ 0,00` e a tabela sem linhas de dados.
`TooltipResultado.test.tsx`: com um `PontoDoResultado` de novembro mostra o nome do mês, `Receitas`, `pago R$ 600,00`, `previsto R$ 400,00`, `Despesas`, `pago R$ 600,00`, `previsto R$ 200,00` e `Resultado` com o valor assinado; com `ponto={null}` devolve `null`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && npx vitest run src/paginas/inicio/GraficoResultado.test.tsx src/paginas/inicio/TooltipResultado.test.tsx 2>&1 | tail -20`
Expected: FAIL (módulos não existem).

- [ ] **Step 3: Implementar `TooltipResultado`**

Componente puro que recebe o `PontoDoResultado` e lista Receitas, Despesas e Resultado, cada um com total e, para receitas e despesas, `pago X · previsto Y`. Resultado em `formatarComSinal`, na cor `--cor-positivo-texto` ou `--cor-negativo-texto` conforme `sentido`.

- [ ] **Step 4: Implementar `BarrasDoResultado`**

Um `BarChart` do Recharts com uma única pilha (`stackId="fluxo"`) de quatro `Bar`: `receitasPagas`, `receitasPrevistas`, `despesasPagas`, `despesasPrevistas` (as de despesa já vêm negativas, então descem da linha zero; positivos e negativos empilham em lados separados). Padrões listrados e cores copiados do `BarrasDoAno` atual. `ReferenceLine y={0}` com `--cor-linha`. `XAxis` com `tick` personalizado em duas linhas: o rótulo do mês (negrito e `data-selecionado="true"` no mês selecionado) e, abaixo, `resultadoCurto(resultado, compacto)` colorido pelo `sentido` (`--cor-positivo-texto`, `--cor-negativo-texto`, `--cor-mutado` para zero). O mês selecionado também recebe um contorno (por exemplo `ReferenceArea` em torno da coluna). `Tooltip` com `content` que usa `TooltipResultado`. `isAnimationActive={false}` em todas as barras.

- [ ] **Step 5: Implementar `GraficoResultado`**

Seção `card` (mais o `className` recebido) com `aria-labelledby`; `h2` `Resultado de cada mês em {ano}`; legenda HTML como a atual (`Receitas`, `Despesas`, `Previsto`); linha `Acumulado até {nome do mês em minúsculas}:` seguida de `formatarComSinal(resultadoAcumulado(serie, mes))`; grupo com `role="group"` e `aria-label` `Gráfico do resultado de cada mês em {ano}`, altura fixa (`h-[240px] md:h-[220px]`) para não saltar enquanto o lazy carrega, com `Suspense` e `BarrasDoResultado` via `lazy`; `compacto = !useEhDesktop()`. Tabela `sr-only` com legenda `Resultado de cada mês em {ano}`, colunas `Mês`, `Receitas`, `Despesas`, `Resultado`, uma linha por ponto de `serieDoResultado(serie)`.

- [ ] **Step 6: Trocar o uso na `InicioPage` e apagar o antigo**

Em `InicioPage.tsx`, usar `<GraficoResultado ano={ano} mes={mes} serie={resumo.serieAno} />` no lugar de `GraficoAno`. Apagar `GraficoAno.tsx` e `BarrasDoAno.tsx`; remover `serieDoGrafico`/`PontoDoGrafico` e seus testes de `valores.ts` e `valores.test.ts`. Em `InicioPage.test.tsx`, ajustar o nome da região esperada (`Receitas × Despesas 2026` → `Resultado de cada mês em 2026`) e remover os dois testes do gráfico antigo (`o_grafico_tem_regiao_nomeada_e_legenda`, `o_grafico_empilha_a_parte_prevista...`), já cobertos em `GraficoResultado.test.tsx`.

- [ ] **Step 7: Rodar e ver passar**

Run: `cd frontend && npx vitest run src/paginas/inicio 2>&1 | tail -30`
Expected: PASS.

- [ ] **Step 8: Commit (só com autorização do dono)**

```bash
git add frontend/src/paginas/inicio
git commit -m "feat(inicio): gráfico de resultado de cada mês com barras espelhadas"
```

---

### Task 3: "% da receita" no card de sobra

**Files:**
- Modify: `frontend/src/paginas/inicio/CardSobra.tsx`, `frontend/src/paginas/inicio/InicioPage.tsx`
- Test: `frontend/src/paginas/inicio/InicioPage.test.tsx`

**Interfaces:**
- Consumes: `percentualDaReceita(sobra, receitas)` (Task 1).
- Produces: `CardSobra` passa a receber `receitas: string` (além das props atuais).

- [ ] **Step 1: Escrever os testes que falham em `InicioPage.test.tsx`**

  - `sobra_mostra_percentual_da_receita`: com o fixture padrão (`sobra '799.50'`, `receitas '5000.00'`) o card `Sobra do mês` contém `+16% da receita`.
  - `sobra_negativa_mostra_percentual_com_sinal_menos`: `sobra '-1884.20'`, `receitas '5270.00'` → `−36% da receita`.
  - `esconde_percentual_quando_receita_e_zero`: `receitas '0.00'`, `sobra '-100.00'` → o card não contém `da receita`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && npx vitest run src/paginas/inicio/InicioPage.test.tsx -t "percentual" 2>&1 | tail -20`
Expected: FAIL.

- [ ] **Step 3: Implementar**

Em `CardSobra`, abaixo do valor, uma linha `{percentual} da receita` no mesmo estilo discreto do texto de comparação, só quando `percentualDaReceita(sobra, receitas)` não for `null`. `InicioPage` passa `receitas={resumo.receitas}`.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd frontend && npx vitest run src/paginas/inicio/InicioPage.test.tsx 2>&1 | tail -20`
Expected: PASS.

- [ ] **Step 5: Commit (só com autorização do dono)**

```bash
git add frontend/src/paginas/inicio
git commit -m "feat(inicio): mostra a sobra do mês como percentual da receita"
```

---

### Task 4: Bloco de cartões

**Files:**
- Create: `frontend/src/paginas/cartoes/faixas.ts`, `frontend/src/paginas/inicio/ResumoCartoes.tsx`
- Modify: `frontend/src/paginas/cartoes/CardCartao.tsx` (importa de `faixas.ts`), `frontend/src/teste/servidor.ts`
- Test: `frontend/src/paginas/inicio/ResumoCartoes.test.tsx`

**Interfaces:**
- Consumes: `CartaoResponse`, `FaixaUso` (`api/tipos.ts`); `formatarMoeda`; `formatarPercentual`, `larguraDaBarra` (`paginas/inicio/valores.ts`).
- Produces (usado pela Task 5):

```ts
// faixas.ts
export const COR_DA_BARRA: Record<Exclude<FaixaUso, 'SEM_LIMITE'>, string> // mesmos valores de CardCartao hoje
export const CLASSE_DO_CHIP: Record<Exclude<FaixaUso, 'SEM_LIMITE'>, string>
// ResumoCartoes.tsx
export function ResumoCartoes(props: { cartoes: CartaoResponse[]; busca: string; className?: string }): JSX.Element
```

`busca` é a query string do mês (`useMesSelecionado().busca`, ex. `?ano=2026&mes=10`).

- [ ] **Step 1: Escrever os testes que falham em `ResumoCartoes.test.tsx`**

Fixture: dois cartões, `Aurora` (`fatura '2558.05'`, `limite '3000.00'`, `uso '0.8527'`, `faixa 'AMARELO'`) e `Inter` (`fatura '372.00'`, `limite '2000.00'`, `uso '0.1860'`, `faixa 'VERDE'`); renderizar com `renderComApp` dentro de uma rota.
  - `lista_cartoes_com_fatura_limite_e_barra`: região `Cartões`; cada cartão mostra nome, `R$ 2.558,05` e `R$ 3.000,00`; um `role="meter"` por cartão com `aria-valuenow` `85` e `19`.
  - `cartao_sem_limite_mostra_so_a_fatura`: `limite null`, `uso null`, `faixa 'SEM_LIMITE'` → mostra a fatura e nenhum `meter`.
  - `uso_acima_de_100_limita_a_barra_mas_mostra_o_percentual_real`: `uso '1.2500'`, `faixa 'VERMELHO'` → `aria-valuenow` `100` e texto `125%`.
  - `link_ver_cartoes_preserva_o_mes`: link `Ver cartões` com `href` `/cartoes?ano=2026&mes=10` quando `busca` é `?ano=2026&mes=10`.
  - `sem_cartoes_nao_renderiza_nada`: `cartoes=[]` não renderiza a região.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && npx vitest run src/paginas/inicio/ResumoCartoes.test.tsx 2>&1 | tail -20`
Expected: FAIL.

- [ ] **Step 3: Extrair `faixas.ts` e implementar `ResumoCartoes`**

Mover `COR_DA_BARRA` e `CLASSE_DO_CHIP` de `CardCartao.tsx` para `faixas.ts` (sem mudar valores) e importar nos dois lugares. `ResumoCartoes`: seção `card` com `h2` `Cartões` e link `Ver cartões` para `{ pathname: '/cartoes', search: busca }`; por cartão, nome, `fatura` e, se houver limite, `de {limite}` e a barra no padrão acessível de `CardCartao` (`role="meter"`, `aria-valuemin 0`, `aria-valuemax 100`, `aria-valuenow` limitado por `larguraDaBarra(uso)`, cor por `COR_DA_BARRA[faixa]`) com o percentual real via `formatarPercentual(uso)`. `cartoes` vazio devolve `null`.

- [ ] **Step 4: Handler base de teste**

Em `teste/servidor.ts`, adicionar `http.get('/api/cartoes', ...)` devolvendo `{ totalFaturas: '0.00', limiteTotal: '0.00', usoGeral: null, cartoes: [] }`, porque a `onUnhandledFrame: 'error'` derruba qualquer teste que chegue à Visão geral sem esse handler. Atualizar o comentário do arquivo.

- [ ] **Step 5: Rodar e ver passar (inclui os testes da página Cartões)**

Run: `cd frontend && npx vitest run src/paginas/inicio src/paginas/cartoes 2>&1 | tail -20`
Expected: PASS.

- [ ] **Step 6: Commit (só com autorização do dono)**

```bash
git add frontend/src/paginas frontend/src/teste/servidor.ts
git commit -m "feat(inicio): bloco de resumo dos cartões na visão geral"
```

---

### Task 5: Grade da Visão geral, consulta de cartões e verificação final

**Files:**
- Modify: `frontend/src/paginas/inicio/InicioPage.tsx`, `OndeMaisGastou.tsx`, `ProximasContas.tsx`
- Test: `frontend/src/paginas/inicio/InicioPage.test.tsx`

**Interfaces:**
- Consumes: `GraficoResultado` (Task 2), `CardSobra` (Task 3), `ResumoCartoes` (Task 4), `endpoints.cartoes.listar(ano, mes): Promise<CartoesResponse>`, `useMesSelecionado()` (`ano`, `mes`, `busca`).
- Produces: `OndeMaisGastou` e `ProximasContas` passam a aceitar `className?: string` que substitui o `md:col-span-*` fixo de hoje (cada um mantém seu padrão se não receber).

Grade desktop (35 colunas, a partir de `md`, como hoje):
- Linha 1: `CardSobra` (col-span-11), `CardsTotais` (col-span-10), `ProximasContas` (col-span-14, `col-start-22`, `row-start-1`, `row-span-2`).
- Linha 2: `GraficoResultado` (col-span-21, `col-start-1`, `row-start-2`).
- Linha 3: `OndeMaisGastou` (col-span-20) e `ResumoCartoes` (col-span-15); sem cartões, `OndeMaisGastou` ocupa `col-span-35`.

Ordem no HTML (celular, uma coluna): Sobra, Totais, Resultado, Onde você mais gastou, Próximas contas, Cartões. Esta ordem é decisão do construtor: o gráfico sobe porque agora é o que o dono mais quer ver, e a altura fixa evita salto de layout.

- [ ] **Step 1: Escrever os testes que falham em `InicioPage.test.tsx`**

  - Atualizar `no_celular_os_blocos_seguem_a_ordem...` para a nova ordem de regiões: `['Sobra do mês','Receitas','Despesas','Resultado de cada mês em 2026','Onde você mais gastou em outubro','Próximas contas','Cartões']` (com um handler de cartões devolvendo ao menos um cartão).
  - `mostra_o_bloco_de_cartoes_do_mes_selecionado`: handler `GET /api/cartoes` registra a query string; a Visão geral em `/?ano=2026&mes=10` consulta `?ano=2026&mes=10` e mostra a região `Cartões`.
  - `sem_cartoes_o_bloco_nao_aparece_e_a_pagina_continua`: `cartoes: []` → sem região `Cartões`, demais blocos presentes.
  - `falha_na_consulta_de_cartoes_nao_derruba_a_pagina`: `GET /api/cartoes` responde 500 → sem região `Cartões`, sem `role="alert"`, resto da página presente.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && npx vitest run src/paginas/inicio/InicioPage.test.tsx 2>&1 | tail -25`
Expected: FAIL.

- [ ] **Step 3: Implementar a consulta e a grade em `InicioPage.tsx`**

`useQuery({ queryKey: ['cartoes', ano, mes], queryFn: () => endpoints.cartoes.listar(ano, mes), placeholderData: keepPreviousData })`. `cartoes = consulta.data?.cartoes ?? []`; erro equivale a lista vazia (sem tratar como erro da página). Enquanto a consulta carrega, o layout assume que há cartões (evita um segundo salto se houver). Reordenar o JSX e aplicar as classes de grade acima; atualizar o comentário do componente, que descreve a ordem antiga. `OndeMaisGastou` e `ProximasContas` recebem `className`.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd frontend && npx vitest run src/paginas/inicio 2>&1 | tail -25`
Expected: PASS.

- [ ] **Step 5: Verificação completa**

Run: `cd frontend && npm test -- --run 2>&1 | tail -30 && npm run lint 2>&1 | tail -15 && npm run build 2>&1 | tail -15`
Expected: todos os testes passam, lint sem erros, build conclui. Mostrar a saída real.

- [ ] **Step 6: Checagem visual**

Subir o app (`docker compose up -d`, API com perfil `dev,demo`, `npm run dev`), entrar com a conta demo e conferir em 375, 768, 1024 e 1440 px, tema claro e escuro: sem rolagem horizontal, rótulos do eixo sem sobreposição, mês selecionado destacado, bloco de cartões, tooltip ao tocar numa coluna. Reportar o que foi visto; se algo falhar, voltar à task dona do componente.

- [ ] **Step 7: Commit (só com autorização do dono)**

```bash
git add frontend/src/paginas/inicio
git commit -m "feat(inicio): reorganiza a visão geral com resultado mensal e cartões"
```

---

## Fechamento

Depois das tasks: um único `code-reviewer` no diff da branch (`superpowers:requesting-code-review`), `superpowers:verification-before-completion` com a saída real dos comandos do Step 5 da Task 5, e `superpowers:finishing-a-development-branch`. Sem `security-auditor`: não há autenticação, dado novo nem entrada externa. Branch sugerida: `feat/visao-geral-resultado-mensal`, a partir de `main`; PR sem merge automático.
