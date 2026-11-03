# Shell flutuante Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Todo código de front-end é escrito pelo agent `frontend-developer`.

**Goal:** Trocar a moldura das telas logadas (topo, dock, painel direito, cards, cabeçalho de página) por superfícies flutuantes coerentes, sem a faixa branca no topo.

**Architecture:** Tokens CSS de superfície em `index.css` (claro e escuro, derivados de `--cor-card` e `--cor-principal`, então presets funcionam) + classe `.superficie`. `AppShell` vira um grid de 2 linhas: dock ocupa as duas linhas, o topo (pílulas) atravessa à direita da dock, e `main` e painel direito ficam na linha de baixo. Um componente `CabecalhoPagina` junta título e ações.

**Tech Stack:** React 19, Tailwind 4 (variáveis `--cor-*`), react-router 8, Vitest + Testing Library. Rodar testes com `cd frontend && npx vitest run --reporter=dot` (o script `npm test` entra em watch).

**Spec:** `docs/superpowers/specs/2026-11-03-shell-flutuante-design.md`

## Global Constraints

- Sem `bg-white`, hex fixo em `bg-[#…]`/`text-[#…]` nem `text-white` em TSX de produção (teste em `estilos.test.ts`).
- Contraste de texto 4,5:1 sobre as superfícies, no claro e no escuro; foco visível; alvos de 44 px (`min-h-11`); respeitar `prefers-reduced-motion`.
- `Ctrl K`, menu do avatar (tema, preferências, senha, sair), dock recolhível, painel de produtividade, preferências `barraFixa` e `layoutLargura` continuam funcionando.
- `main` e `<Outlet />` ficam na mesma posição da árvore: cruzar 1280 px não remonta a rota (teste existente em `AppShell.test.tsx`).
- Abaixo de 1280 px: barra fina com "Abrir menu" e menu em gaveta continuam; painel direito só em ≥ 1536 px (`2xl`) ou por botão.
- Sem mudança de backend, rotas ou regras de negócio. O interior de tabelas, gráficos e formulários não é redesenhado.
- Uma branch e um PR por tarefa; commits pequenos; nunca mergear sem autorização do usuário.
- Valores numéricos de opacidade, vão e altura abaixo são ponto de partida; ajustar vendo a tela.

## Review Focus

- Tema escuro com superfície translúcida: texto continua legível (teste de contraste no pior ponto do degradê).
- Presets lima, esmeralda e índigo: degradê e superfícies não ficam lavanda fixo.
- `barraFixa` ligada: conteúdo rolando por trás das pílulas fica ilegível ou vaza sem a máscara (teste de classes + checagem visual).
- Painel de produtividade aberto abaixo de `2xl`: grid ganha a 3ª coluna e o painel não cai para outra linha.
- Dropdown do avatar não é cortado por `overflow` nem por `z-index` das pílulas e do painel.
- Cards com estilo próprio (cartões de crédito premium) não são afetados pelo `.card` novo.

---

## File Structure

- Modify `frontend/src/index.css`: tokens de superfície, `--fundo-degrade`, classe `.superficie`, `.card`.
- Modify `frontend/src/estilos.test.ts`: testes dos tokens e do contraste.
- Modify `frontend/src/layout/AppShell.tsx`: grid de 2 linhas, fundo degradê, dock sem `border`/sombra própria duplicada.
- Modify `frontend/src/layout/HeaderPrincipal.tsx`: duas pílulas, botão de painel dentro do grupo.
- Modify `frontend/src/layout/PainelLateralDireito.tsx`: sem `border-l` nem fundo; blocos como superfícies.
- Create `frontend/src/layout/CabecalhoPagina.tsx` (+ `.test.tsx`): título, subtítulo, ações.
- Modify `frontend/src/layout/SeletorMes.tsx`, `FaixaFinanceira.tsx`: superfície padrão (a faixa passa a ser consumida pelo `CabecalhoPagina`).
- Modify `frontend/src/paginas/inicio/InicioPage.tsx`, `lancamentos/LancamentosPage.tsx`, `cartoes/CartoesPage.tsx`: usar `CabecalhoPagina`.
- Testes a atualizar: `AppShell.test.tsx`, `HeaderPrincipal.test.tsx`, `PainelLateralDireito.test.tsx`, `FaixaFinanceira.test.tsx`.

---

### Task 1: Tokens de superfície, fundo e `.card` global

Branch `feat/shell-tokens-superficie`.

**Files:**
- Modify: `frontend/src/index.css` (bloco `:root`, bloco `:root[data-tema='escuro']`, `@layer components`)
- Test: `frontend/src/estilos.test.ts`

**Interfaces:**
- Produces (variáveis CSS, valem em claro e escuro):
  - `--superficie`: `color-mix(in srgb, var(--cor-card) 75%, transparent)`
  - `--superficie-borda`: `color-mix(in srgb, var(--cor-card) 90%, transparent)` no claro; no escuro `var(--cor-linha)`
  - `--sombra-flutuante`: `0 2px 8px color-mix(in srgb, var(--cor-principal) 10%, transparent)`
  - `--fundo-degrade`: `linear-gradient(160deg, color-mix(in srgb, var(--cor-principal) 10%, var(--cor-fundo)) 0%, var(--cor-fundo) 45%, color-mix(in srgb, var(--cor-principal) 12%, var(--cor-fundo)) 100%)`
- Produces (classes): `.superficie` (fundo, borda 1px, sombra, `backdrop-filter: blur(8px)`) e `.card` reescrita para as mesmas propriedades mais `border-radius: var(--raio-card)` e `padding: 1rem`.

- [ ] **Step 1: Escrever os testes que falham** em `estilos.test.ts`, num `describe('superfícies flutuantes')`:
  - `declara_os_tokens_de_superficie`: `token('superficie')`, `token('superficie-borda')`, `token('sombra-flutuante')` e `token('fundo-degrade')` definidos em `:root`; `--superficie` contém `color-mix` e `var(--cor-card)`.
  - `card_e_superficie_usam_os_tokens`: regex em `css` confirma que `.superficie` e `.card` referenciam `var(--superficie)`, `var(--superficie-borda)` e `var(--sombra-flutuante)`.
  - `superficie_translucida_mantem_contraste_AA`: usa as funções de luminância já presentes no arquivo (extrair para helpers do topo do arquivo se estiverem dentro de `it`). Para claro (`:root`) e escuro (bloco `data-tema='escuro'`): fundo efetivo = `--cor-card` a 75% sobre o pior ponto do degradê (`--cor-principal` a 12% sobre `--cor-fundo`, mistura em sRGB); afirma contraste ≥ 4,5 com `--cor-texto` e com `--cor-mutado`. Se `--cor-mutado` no claro ficar abaixo de 4,5 sobre esse fundo, o teste deve falhar e a correção é escurecer `--cor-mutado` só quando usado sobre superfície (anotar no PR), nunca baixar o limite.
- [ ] **Step 2: Rodar e ver falhar.** `cd frontend && npx vitest run src/estilos.test.ts --reporter=dot` → FAIL (tokens ausentes).
- [ ] **Step 3: Implementar** os tokens no `:root` (claro) e a variante escura de `--superficie-borda` e `--sombra-flutuante` (sombra mais forte, `rgb(0 0 0 / 35%)`); criar `.superficie` e reescrever `.card` em `@layer components`. Respeitar `@media (prefers-reduced-motion: reduce)` removendo o `backdrop-filter` não é necessário; só não animar os tokens.
- [ ] **Step 4: Rodar e ver passar.** Mesmo comando → PASS. Depois a suíte toda: `npx vitest run --reporter=dot` → sem novas falhas (testes que checam classe `card` continuam verdes).
- [ ] **Step 5: Verificação visual.** `npm run dev`, abrir Orçamento e Cartões no claro e no escuro: cards continuam legíveis; os cartões de crédito premium (`CartoesPage`) não mudam. Anotar casos que destoam no PR.
- [ ] **Step 6: Commit.** `git add frontend/src/index.css frontend/src/estilos.test.ts` e `git commit -m "feat(layout): tokens de superfície flutuante e .card global"`.

---

### Task 2: Moldura do desktop (grid, topo em pílulas, dock, painel direito)

Branch `feat/shell-topo-flutuante`, a partir da Task 1 mergeada.

**Files:**
- Modify: `frontend/src/layout/AppShell.tsx` (blocos `dockDesktop` e o `return`, linhas ~143-215)
- Modify: `frontend/src/layout/HeaderPrincipal.tsx`
- Modify: `frontend/src/layout/PainelLateralDireito.tsx` (classes do `<aside>` e dos cards, linhas ~255-330)
- Test: `AppShell.test.tsx`, `HeaderPrincipal.test.tsx`, `PainelLateralDireito.test.tsx`

**Interfaces:**
- Consumes: `.superficie`, `--fundo-degrade` (Task 1).
- Produces: `HeaderPrincipal` mantém as props atuais (`nomeUsuario`, `aoSair`, `onAbrirBusca`, `onAlternarPainelProdutividade`, `painelProdutividadeAberto`, `onAbrirPreferencias`) e renderiza um `<header>` sem fundo nem borda que contém duas pílulas `.superficie rounded-full h-11`: busca (`flex-1`, botão com `aria-label="Buscar páginas e atalhos"`, `Ctrl K`) e grupo (botão de painel `aria-label="Alternar painel de produtividade"` só abaixo de `2xl`, sino `aria-label="Notificações"`, avatar `aria-label="Perfil do usuário"` com o dropdown atual). Nada de `border-b`, `shadow-xs` nem `bg-[var(--cor-card)]` no `<header>`.

- [ ] **Step 1: Escrever os testes que falham.**
  - `HeaderPrincipal.test.tsx`, `header_nao_tem_faixa_nem_borda`: `screen.getByRole('banner')` não tem as classes `border-b` nem `bg-[var(--cor-card)]`; a busca e o grupo do avatar têm a classe `superficie`.
  - `HeaderPrincipal.test.tsx`, `botao_de_painel_fica_no_mesmo_grupo_do_sino`: o botão "Alternar painel de produtividade" e o botão "Notificações" têm o mesmo `parentElement`.
  - `PainelLateralDireito.test.tsx`, `painel_nao_tem_borda_lateral_nem_fundo_proprio`: o `aside` com nome "Painel de Produtividade" não tem `border-l` nem `bg-[var(--cor-fundo)]`.
  - `AppShell.test.tsx`, `desktop_usa_grid_de_duas_linhas`: com `window.innerWidth = 1400`, o contêiner do grid tem a classe `grid-rows-[auto_1fr]`; o `main` está dentro dele; o `banner` e o `main` são irmãos de linha diferentes (header antes do main no DOM).
  - `AppShell.test.tsx`, `painel_aberto_abaixo_de_2xl_ganha_terceira_coluna`: clicar em "Alternar painel de produtividade" troca o grid para a classe `grid-cols-[auto_1fr_20rem]`.
- [ ] **Step 2: Rodar e ver falhar.** `npx vitest run src/layout --reporter=dot` → FAIL nos 5 testes novos.
- [ ] **Step 3: Implementar `AppShell` (desktop).** Contêiner raiz com `style={{ background: 'var(--fundo-degrade)' }}` (ou classe equivalente); grid `grid min-h-dvh grid-rows-[auto_1fr] gap-3 p-3` com colunas `grid-cols-[auto_1fr]`, `2xl:grid-cols-[auto_1fr_20rem]`, e `grid-cols-[auto_1fr_20rem]` quando `painelProdutividadeAberto`. Dock: `row-span-2`, `sticky top-0 h-[calc(100dvh-1.5rem)]`, usa `.superficie rounded-3xl` (remove `border`, `bg` e `shadow-lg` atuais). Topo: `col-start-2 col-span-full row-start-1`, envolvido por `preferencias.barraFixa ? 'sticky top-3 z-20' : 'relative z-20'` mais máscara de degradê (`mask-image: linear-gradient(to bottom, black 85%, transparent)`) só no modo fixo. `main` em `row-start-2 col-start-2`; painel em `row-start-2 col-start-3`. Manter `main`/`Outlet` na mesma posição da árvore (teste de não remontagem).
- [ ] **Step 4: Implementar `HeaderPrincipal`** conforme o bloco Interfaces; reaproveitar o dropdown existente sem mudar roles nem textos (os testes antigos seguem valendo).
- [ ] **Step 5: Implementar `PainelLateralDireito`:** `<aside>` sem `border-l`, sem `bg`, sem `p-4` externo (o vão vem do grid); cada bloco (calendário, tarefas de hoje, próximas) usa `.superficie rounded-2xl p-3.5` e rótulo `text-[11px] font-semibold uppercase tracking-wide text-[var(--cor-mutado)]`.
- [ ] **Step 5b: Atualizar testes antigos** que dependam do markup removido (ex.: seletor por `border-l`), sem enfraquecer as asserções.
- [ ] **Step 6: Rodar e ver passar.** `npx vitest run src/layout --reporter=dot` → PASS; depois `npx vitest run --reporter=dot`, `npm run lint`, `npm run build` → sem erros.
- [ ] **Step 7: Verificação visual** (claro, escuro, presets lima/esmeralda/índigo, 1920 px e 1280 px, `barraFixa` ligada e desligada, painel aberto abaixo de `2xl`, dropdown do avatar aberto): nenhuma faixa branca, nenhum vão sem linha, dropdown não cortado. Capturar prints para o PR.
- [ ] **Step 8: Commit.** `git commit -m "feat(layout): topo em pílulas flutuantes, dock e painel direito como superfícies"`.

---

### Task 3: Cabeçalho de página compartilhado

Branch `feat/cabecalho-pagina`, a partir da Task 2 mergeada.

**Files:**
- Create: `frontend/src/layout/CabecalhoPagina.tsx`, `frontend/src/layout/CabecalhoPagina.test.tsx`
- Modify: `frontend/src/layout/SeletorMes.tsx`, `frontend/src/layout/FaixaFinanceira.tsx`
- Modify: `frontend/src/paginas/inicio/InicioPage.tsx` (bloco `titulo`, linha ~28), `paginas/lancamentos/LancamentosPage.tsx` (linha ~52), `paginas/cartoes/CartoesPage.tsx` (linha ~215)
- Test: `FaixaFinanceira.test.tsx` e os testes das três páginas

**Interfaces:**
- Produces: `export function CabecalhoPagina(props: { titulo: string; subtitulo?: string; aoLancar?: () => void; acaoExtra?: ReactNode }): JSX.Element`. Renderiza, na mesma linha, `<h1>` + subtítulo à esquerda e, à direita, `SeletorMes`, o link "+ Lançar" (mesmo comportamento atual de `FaixaFinanceira`, incluindo `aoLancar` com `preventDefault`) e `acaoExtra`. Abaixo de `md` o bloco título/subtítulo continua `sr-only`, como hoje. `FaixaFinanceira` deixa de ser usada pelas páginas; manter como componente interno do cabeçalho ou removê-la se ficar sem uso (atualizar seu teste para `CabecalhoPagina`).
- Consumes: `.superficie` (Task 1).

- [ ] **Step 1: Escrever os testes que falham** em `CabecalhoPagina.test.tsx` (copiar o setup de `FaixaFinanceira.test.tsx`):
  - `mostra_titulo_subtitulo_seletor_e_lancar_com_o_mes_na_url`: heading nível 1 "Orçamento", subtítulo, "Mês anterior", "Mês seguinte" e link "+ Lançar" com `?ano=&mes=`.
  - `aoLancar_intercepta_o_clique`: com `aoLancar`, clicar chama a função e não navega.
  - `acaoExtra_aparece_na_mesma_linha`: com `acaoExtra={<button>+ Novo cartão</button>}`, o botão está no mesmo contêiner das ações.
  - `alvos_de_toque_de_44px`: seletor e "+ Lançar" têm `min-h-11`.
- [ ] **Step 2: Rodar e ver falhar.** `npx vitest run src/layout/CabecalhoPagina.test.tsx --reporter=dot` → FAIL (módulo inexistente).
- [ ] **Step 3: Implementar** `CabecalhoPagina` e ajustar `SeletorMes` para `.superficie rounded-full` (remover `bg-[var(--cor-card)]` e `shadow-sm`). Migrar Início, Orçamento e Cartões: trocar o bloco `titulo` por `<CabecalhoPagina titulo=… subtitulo=… />`; Cartões passa `aoLancar={() => setLancandoGeral(true)}` e `acaoExtra` com o botão "+ Novo cartão" existente.
- [ ] **Step 4: Rodar e ver passar.** `npx vitest run --reporter=dot`, `npm run lint`, `npm run build` → sem erros.
- [ ] **Step 5: Verificação visual** nas três telas, em 1920 px, 1024 px e 375 px (sem rolagem horizontal; título `sr-only` abaixo de `md`).
- [ ] **Step 6: Commit.** `git commit -m "feat(layout): cabeçalho de página compartilhado com mês e ações"`.

---

### Task 4: Barra fina abaixo de 1280 px e fechamento visual

Branch `feat/shell-mobile-e-qa`, a partir da Task 3 mergeada.

**Files:**
- Modify: `frontend/src/layout/AppShell.tsx` (bloco `barraSuperior`, linha ~118, e gaveta, linha ~215)
- Test: `AppShell.test.tsx`

**Interfaces:**
- Consumes: `.superficie`, `--fundo-degrade`.

- [ ] **Step 1: Escrever o teste que falha** em `AppShell.test.tsx`, `barra_fina_usa_superficie_flutuante`: com `window.innerWidth = 900`, o `banner` tem a classe `superficie` e não tem `border-b` nem `bg-[var(--cor-card)]`; o botão "Abrir menu" mantém `min-h-11`.
- [ ] **Step 2: Rodar e ver falhar.** `npx vitest run src/layout/AppShell.test.tsx --reporter=dot` → FAIL.
- [ ] **Step 3: Implementar:** barra fina como pílula/cartão flutuante com margem (`m-3 rounded-2xl .superficie`), `sticky top-3`; gaveta do menu com `.superficie` no lugar de `bg-[var(--cor-card)] border-r`. Os testes de foco, Esc, trava de rolagem e não remontagem seguem verdes.
- [ ] **Step 4: Rodar e ver passar.** Suíte completa, `npm run lint`, `npm run build` → sem erros.
- [ ] **Step 5: Revisão final e QA visual.** Rodar o agent `code-reviewer` uma vez no diff final da branch (e não a cada tarefa); QA em claro/escuro, 3 presets, 1920/1280/1024/375 px; anotar no PR qualquer card próprio que destoa.
- [ ] **Step 6: Commit.** `git commit -m "feat(layout): barra fina e gaveta com superfície flutuante"`.
