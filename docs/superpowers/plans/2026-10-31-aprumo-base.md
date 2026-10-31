# Aprumo, módulo 1 (base) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a moldura do app por menu lateral, tema claro/escuro e tela inicial nova, com o nome Aprumo na tela.

**Architecture:** Só frontend. O tema vive em `data-tema` no `<html>` e em tokens CSS (`--cor-*`); todo componente lê token, nenhum usa cor fixa. A sidebar é um componente único que, abaixo de 1280 px, aparece como painel aberto por botão. As telas financeiras ganham uma faixa compartilhada (mês e "+ Lançar") no lugar do cabeçalho do shell.

**Tech Stack:** React 19, TypeScript, Vite 8, react-router 8, Tailwind 4, TanStack Query, Vitest + Testing Library + msw, oxlint. Código em `frontend/`.

**Spec:** `docs/superpowers/specs/2026-10-31-aprumo-base-design.md` (referências em `docs/superpowers/specs/2026-10-31-aprumo-base-referencias/`: `menu-e-inicio.html` e `botao-tema-referencia.md`).

## Global Constraints

- Só frontend: nenhum endpoint, migration ou mudança em `backend/`.
- Sem dependência nova (nada de styled-components). O botão de tema é CSS puro.
- Tema: atributo `data-tema` em `<html>`, valores `claro` e `escuro`; chave de `localStorage` `aprumo-tema`; sem escolha salva segue `prefers-color-scheme` em tempo real; a escolha é gravada na primeira vez que o botão é usado.
- Sidebar fixa a partir de 1280 px (`LARGURA_DESKTOP` em `frontend/src/layout/useEhDesktop.ts`); abaixo disso, painel aberto por botão e sem `NavbarInferior`.
- Menu: Início, grupo Financeiro (Visão geral, Lançamentos, Cartões, Categorias, Relatórios) e, no pé, usuário (inicial, nome, botão de tema, Alterar senha, Sair). Tarefas, Notas, Projetos e Calendário não aparecem.
- Rotas: `/` é a tela inicial nova; o painel financeiro de hoje passa a `/financeiro`.
- Contraste WCAG AA (4,5:1) no escuro; alvos de toque de pelo menos 44 px; foco visível; `aria-current="page"` no item ativo.
- Nome visível: "Aprumo" (nunca "Contas Claras") no frontend; ícones sem arte própria viram um "A" simples em `#27187e`.
- Textos de interface em português do Brasil.
- Todo código de front-end é escrito pelo agent `frontend-developer`. Verificação: `cd frontend && npm test -- --run`, `npm run lint`, `npm run build`.
- Branch de trabalho `feat/aprumo-base`, criada a partir de `docs/aprumo-base-design`.

## Review Focus

- `localStorage` indisponível (lança erro) ou com valor inválido em `aprumo-tema`: o app abre no tema do sistema, sem quebrar (Task 1).
- A API do resumo falha ou demora na tela inicial: a saudação aparece, o bloco financeiro mostra "Carregando…" ou o erro com "Tentar de novo" (Task 6).
- Nome do usuário vazio, só com espaços ou com um nome só: a saudação não deixa vírgula sobrando (Task 6).
- Janela redimensionada para ≥ 1280 px com o painel aberto: o painel some e o foco não fica perdido (Task 4).
- Nome muito longo no bloco do usuário: trunca, sem quebrar a sidebar (Task 4).
- Link antigo `/?ano=2026&mes=10` (favorito do painel financeiro): abre a tela inicial nova sem erro (Task 6).

---

## File Structure

- Create `frontend/src/tema/tema.ts` (funções puras do tema), `useTema.ts`, `BotaoTema.tsx`, `botao-tema.css`.
- Create `frontend/src/layout/itensMenu.ts`, `Sidebar.tsx`, `FaixaFinanceira.tsx`, `PaletaNavegacao.tsx`.
- Create `frontend/src/paginas/painel/PainelPage.tsx`, `saudacao.ts`, `FinancasDoMes.tsx`.
- Modify `frontend/src/index.css`, `frontend/index.html`, `frontend/src/App.tsx`, `frontend/src/layout/AppShell.tsx`, `frontend/src/paginas/inicio/InicioPage.tsx`, `LancamentosPage.tsx`, `CartoesPage.tsx`, `cores.ts`, `estilos.test.ts`, e os TSX com `bg-white` ou cor fixa (lista na Task 2).
- Delete `frontend/src/layout/AbasTopo.tsx`, `NavbarInferior.tsx`, `MenuUsuario.tsx` (Task 4).
- Cada arquivo novo tem teste ao lado (`*.test.ts(x)`), no estilo dos testes existentes (`renderComApp` de `frontend/src/teste/render.tsx`, msw em `frontend/src/teste/servidor.ts`).

---

### Task 1: Núcleo do tema (tokens escuros, hook e script anti-piscada)

**Files:**
- Create: `frontend/src/tema/tema.ts`, `frontend/src/tema/useTema.ts`
- Modify: `frontend/src/index.css`, `frontend/index.html`
- Test: `frontend/src/tema/useTema.test.tsx`, `frontend/src/estilos.test.ts`

**Interfaces:**
- Produces:
  - `export type Tema = 'claro' | 'escuro'`
  - `export const CHAVE_TEMA = 'aprumo-tema'`
  - `export function lerTemaSalvo(): Tema | null` (null se ausente, inválido ou se o acesso a `localStorage` lançar)
  - `export function gravarTema(tema: Tema): void` (engole erro de `localStorage`)
  - `export function temaDoSistema(): Tema` (via `matchMedia('(prefers-color-scheme: dark)')`; `claro` se `matchMedia` não existir)
  - `export function useTema(): { tema: Tema; alternar: () => void }`; aplica `document.documentElement.dataset.tema` a cada mudança.
  - Tokens novos em `:root` e `:root[data-tema='escuro']`: `--cor-card`, `--cor-erro-fundo`, `--cor-ok-fundo`, `--cor-aviso-fundo`, `--cor-aviso-texto`, `--cor-sobre-principal-suave` (o `#cfcbf2` do card de sobra), `--cor-grafico-receitas`, `--cor-grafico-despesas`, `--cor-grafico-receitas-previstas`, `--cor-grafico-despesas-previstas`, além dos `--cor-*` que já existem, redefinidos no escuro.

- [ ] **Step 1: Escrever os testes que falham** em `useTema.test.tsx` (mock de `window.matchMedia` controlável, pois o jsdom não o tem; limpar `localStorage` e `dataset.tema` em `beforeEach`):

```ts
it('sem escolha salva usa o tema do sistema', ...)            // sistema escuro → result.current.tema === 'escuro'
it('escolha salva vence o sistema', ...)                      // localStorage 'claro' + sistema escuro → 'claro'
it('sem escolha salva acompanha o sistema em tempo real', ...) // disparar 'change' no matchMedia → tema muda
it('com escolha salva ignora mudança do sistema', ...)
it('alternar muda o tema, grava em localStorage e atualiza data-tema', ...) // 'aprumo-tema' === 'escuro', html.dataset.tema === 'escuro'
it('valor inválido salvo é ignorado', ...)                    // 'roxo' → tema do sistema
it('localStorage que lança erro não quebra', ...)             // getItem/setItem lançam → renderiza, alternar funciona sem gravar
```

Em `estilos.test.ts` (ler o arquivo atual antes e seguir o padrão dele), acrescentar `it('o tema escuro mantém contraste AA entre texto e fundos')`: lê `index.css`, extrai os tokens de `:root[data-tema='escuro']` e exige razão de contraste ≥ 4,5 para `--cor-texto`, `--cor-mutado`, `--cor-positivo-texto` e `--cor-negativo-texto` sobre `--cor-card` e sobre `--cor-fundo`.

- [ ] **Step 2: Rodar e ver falhar:** `cd frontend && npm test -- --run src/tema src/estilos.test.ts`. Esperado: FAIL (módulos e tokens inexistentes).

- [ ] **Step 3: Implementar `tema.ts` e `useTema.ts`** conforme as assinaturas. `useTema` guarda `escolha: Tema | null` em estado (inicial `lerTemaSalvo()`), assina `matchMedia(...).change` só enquanto `escolha === null`, e `alternar` grava a escolha oposta ao tema atual.

- [ ] **Step 4: Tokens em `index.css`.** Em `:root` (claro) acrescentar os tokens novos com os valores que hoje estão fixos nos TSX (`--cor-card: #fff`, `--cor-erro-fundo: #fdecec`, `--cor-ok-fundo: #e9f6ee`, `--cor-aviso-fundo: #fff2cb`, `--cor-aviso-texto: #7a5f00`, `--cor-sobre-principal-suave: #cfcbf2`, gráficos com os valores de `frontend/src/paginas/inicio/cores.ts`). Em `:root[data-tema='escuro']` redefinir todos, derivando do roxo `#27187e` (fundo muito escuro puxado ao roxo, card um degrau acima, principal mais claro que o atual para ter contraste, textos claros). `.card` passa a usar `var(--cor-card)`; `html` ganha `color-scheme: light` e, no escuro, `color-scheme: dark`.

- [ ] **Step 5: Script anti-piscada em `frontend/index.html`**, inline no `<head>` antes de qualquer CSS: lê `localStorage['aprumo-tema']` (dentro de try/catch), usa o valor se for `claro` ou `escuro`, senão `matchMedia('(prefers-color-scheme: dark)')`, e define `document.documentElement.dataset.tema`.

- [ ] **Step 6: Rodar e ver passar:** mesmo comando do Step 2. Esperado: PASS. Depois `npm run lint`.

- [ ] **Step 7: Commit**

```bash
git checkout -b feat/aprumo-base   # só na primeira tarefa
git add frontend && git commit -m "feat(tema): tokens escuros, useTema e script anti-piscada"
```

---

### Task 2: Cores fixas viram tokens

**Files:**
- Modify: todos os TSX que usam `bg-white`, `bg-[#...]` ou hex fixo: `frontend/src/App.tsx`, `auth/CampoTexto.tsx`, `auth/LayoutAuth.tsx`, `auth/DefinirSenhaPage.tsx`, `layout/SeletorMes.tsx`, `paginas/categorias/{EditorCategoria,EditorItem,CategoriasPage}.tsx`, `paginas/inicio/{CardSobra,CardsTotais,ProximasContas}.tsx`, `paginas/inicio/cores.ts`, `paginas/lancamentos/{Campos,LancamentoForm,Moldura,GrupoCategoria,LancamentosPage}.tsx`, `paginas/relatorios/{RelatoriosPage,TabelaAnual}.tsx`, `paginas/cartoes/CardCartao.tsx`. (`AbasTopo`, `NavbarInferior`, `MenuUsuario` e `AppShell` saem na Task 4; não migrar.)
- Test: `frontend/src/estilos.test.ts`

**Interfaces:**
- Consumes: os tokens da Task 1.
- Produces: `COR_RECEITAS`, `COR_DESPESAS`, `FUNDO_RECEITAS_PREVISTAS`, `FUNDO_DESPESAS_PREVISTAS` em `cores.ts` passam a ser strings `'var(--cor-grafico-...)'` (mesmos nomes exportados; os gráficos Recharts continuam importando-os).

- [ ] **Step 1: Escrever o teste que falha** em `estilos.test.ts`:

```ts
it('nenhum TSX de produção usa bg-white nem fundo/texto com hex fixo', ...)
// varre frontend/src/**/*.tsx (exceto *.test.tsx e os arquivos da Task 4 ainda presentes) e exige zero ocorrências de /bg-white|bg-\[#|text-\[#/
```

Cores de estado do cartão (`VERDE`, `AMARELO`, `VERMELHO` em `CardCartao.tsx`) são cores de dado, não de tema: ficam como estão e o teste as ignora por não serem classes `bg-`/`text-`.

- [ ] **Step 2: Rodar e ver falhar:** `cd frontend && npm test -- --run src/estilos.test.ts`. Esperado: FAIL listando os arquivos.

- [ ] **Step 3: Migrar:** `bg-white` → `bg-[var(--cor-card)]`; `bg-[#fdecec]` → `bg-[var(--cor-erro-fundo)]`; `bg-[#e9f6ee]`/`bg-[#e5f5ec]`/`bg-[#e1f3e8]` → `bg-[var(--cor-ok-fundo)]`; `bg-[#fbe5e5]` → `bg-[var(--cor-erro-fundo)]`; `bg-[#fff2cb]` e `text-[#7a5f00]` → `--cor-aviso-fundo` e `--cor-aviso-texto`; `text-[#cfcbf2]` → `text-[var(--cor-sobre-principal-suave)]`. Em `cores.ts`, as quatro constantes viram `var(--cor-grafico-*)`. Em `App.tsx`, os toasts usam `bottom-6` em qualquer largura (sem `bottom-24 xl:bottom-6`) e os tokens.

- [ ] **Step 4: Rodar tudo:** `npm test -- --run` e `npm run lint`. Esperado: PASS (ajustar testes existentes que dependam de classe de cor, se houver).

- [ ] **Step 5: Commit**

```bash
git add frontend && git commit -m "refactor(estilos): cores fixas viram tokens de tema"
```

---

### Task 3: Botão de tema (sol e lua)

**Files:**
- Create: `frontend/src/tema/BotaoTema.tsx`, `frontend/src/tema/botao-tema.css`
- Modify: `frontend/src/index.css` (importar `./tema/botao-tema.css` ou o caminho que o Vite resolver)
- Test: `frontend/src/tema/BotaoTema.test.tsx`

**Interfaces:**
- Consumes: `useTema()` da Task 1.
- Produces: `export function BotaoTema(): JSX.Element`, sem props. Renderiza um `<input type="checkbox" role="switch">` com `aria-label="Tema escuro"`, `checked` = tema escuro, dentro de um `<label>`.

- [ ] **Step 1: Escrever os testes que falham:**

```ts
it('é um switch chamado "Tema escuro", desmarcado no tema claro', ...)  // getByRole('switch', { name: 'Tema escuro' }) → not.toBeChecked()
it('clicar liga o tema escuro e atualiza data-tema e o storage', ...)    // checked, html.dataset.tema === 'escuro', localStorage 'aprumo-tema' === 'escuro'
it('Espaço no teclado alterna', ...)                                     // userEvent.keyboard(' ') com foco no switch
it('o CSS respeita prefers-reduced-motion', ...)                         // texto de botao-tema.css contém '@media (prefers-reduced-motion: reduce)'
```

- [ ] **Step 2: Rodar e ver falhar:** `cd frontend && npm test -- --run src/tema/BotaoTema.test.tsx`. Esperado: FAIL.

- [ ] **Step 3: Implementar `BotaoTema.tsx` e `botao-tema.css`**, portando o CSS de `docs/superpowers/specs/2026-10-31-aprumo-base-referencias/botao-tema-referencia.md` para classes `.theme*` em CSS puro: trilho, bolinha, sol com raios que se recolhem e viram lua. Fora o `.theme__fill` (overlay de tela cheia com `mix-blend-mode: difference`). `--bg`, `--primary`, `--primaryT` e `--transDur` do original viram `--cor-principal`, `--cor-principal-clara` e uma duração local (0,3 s). Alvo de toque de 44 px de altura. Sob `prefers-reduced-motion: reduce`, transições a 0 s.

- [ ] **Step 4: Rodar e ver passar** (mesmo comando) e `npm run lint`. Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend && git commit -m "feat(tema): botao de tema sol e lua"
```

---

### Task 4: Sidebar, painel no celular e shell novo

**Files:**
- Create: `frontend/src/layout/itensMenu.ts`, `frontend/src/layout/Sidebar.tsx`
- Modify: `frontend/src/layout/AppShell.tsx`, `frontend/src/layout/AppShell.test.tsx`
- Delete: `frontend/src/layout/AbasTopo.tsx`, `frontend/src/layout/NavbarInferior.tsx`, `frontend/src/layout/MenuUsuario.tsx`
- Test: `frontend/src/layout/Sidebar.test.tsx`

**Interfaces:**
- Consumes: `useEhDesktop()`, `useMesSelecionado()`, `BotaoTema`, `Logo` (hoje dentro de `AppShell.tsx`; mover para `frontend/src/layout/Logo.tsx`, com "A" e "Aprumo").
- Produces:
  - `export interface ItemMenu { rotulo: string; caminho: string; exata?: boolean; comMes?: boolean }`
  - `export interface GrupoMenu { titulo: string | null; itens: ItemMenu[] }`
  - `export const GRUPOS_MENU: GrupoMenu[]`: grupo sem título com Início (`/`, `exata`); grupo "Financeiro" com Visão geral (`/financeiro`), Lançamentos (`/lancamentos`), Cartões (`/cartoes`), Categorias (`/categorias`), Relatórios (`/relatorios`); `comMes: true` em Visão geral, Lançamentos e Cartões (links levam `?ano=&mes=` via `useMesSelecionado().busca`).
  - `export function Sidebar(props: { nomeUsuario?: string; aoSair: () => void; aoNavegar?: () => void }): JSX.Element`: `<nav aria-label="Menu principal">` com os grupos, e o bloco do usuário (inicial, nome truncado, `BotaoTema`, link "Alterar senha" para `/conta/senha`, botão "Sair").
  - `AppShell` mantém as props `{ nomeUsuario?: string; aoSair?: () => void }` e renderiza `<Outlet />` em `<main>`.

- [ ] **Step 1: Escrever os testes que falham.** `Sidebar.test.tsx`:

```ts
it('lista os itens na ordem Início, Visão geral, Lançamentos, Cartões, Categorias, Relatórios', ...)
it('marca o item da rota atual com aria-current="page"', ...)        // rota /cartoes → só "Cartões"
it('links financeiros preservam o mês da URL', ...)                   // /?ano=2026&mes=10 → href de Lançamentos contém ano=2026&mes=10; Início não
it('mostra o nome, o switch de tema, Alterar senha e Sair', ...)
it('Sair chama aoSair', ...)
it('nome muito longo recebe a classe truncate', ...)
```

`AppShell.test.tsx` (reescrever os casos de abas e navbar inferior):

```ts
it('em 1280 px ou mais mostra a sidebar e nenhum botão de menu', ...)
it('abaixo de 1280 px mostra "Abrir menu" (aria-expanded=false) e esconde a sidebar', ...)
it('abrir o menu mostra o painel; Esc fecha e devolve o foco ao botão', ...)
it('clicar num link do painel navega e fecha o painel', ...)
it('não existe navegação inferior em nenhuma largura', ...)          // queryByRole('navigation', { name: 'Navegação principal' }) === null
it('redimensionar para ≥ 1280 px com o painel aberto fecha o painel e mostra a sidebar fixa', ...)
it('o logo diz Aprumo e leva a /', ...)
```

- [ ] **Step 2: Rodar e ver falhar:** `cd frontend && npm test -- --run src/layout`. Esperado: FAIL.

- [ ] **Step 3: Implementar** `itensMenu.ts`, `Logo.tsx` e `Sidebar.tsx` conforme as assinaturas, usando `NavLink` (`end` para Início). Ícones: SVG de linha simples por item, no padrão `iconeProps` de `NavbarInferior.tsx` (copiar antes de apagar o arquivo). Larguras: sidebar de 240 px, como no mockup `menu-e-inicio.html`.

- [ ] **Step 4: Reescrever `AppShell.tsx`.** Com `useEhDesktop()` verdadeiro: grid de duas colunas, `Sidebar` fixa à esquerda, conteúdo à direita (`max-w-6xl`). Falso: barra fina no topo com botão "Abrir menu" (≥ 44 px, `aria-expanded`, `aria-controls`) e `Logo`; o painel é a mesma `Sidebar` dentro de um contêiner deslizante com fundo escurecido; fecha com Esc (devolvendo o foco ao botão), clique no fundo e `aoNavegar`; fecha sozinho ao virar desktop. `AvisoServidor` continua no topo. Remover `ROTAS_SEM_MES`, o seletor de mês e o "+ Lançar" do shell (vão para a Task 5). Apagar `AbasTopo.tsx`, `NavbarInferior.tsx` e `MenuUsuario.tsx`.

- [ ] **Step 5: Rodar e ver passar:** `npm test -- --run src/layout`, depois `npm run lint`. Esperado: PASS. (Testes de outras telas que clicavam em "Sair" pelo `MenuUsuario` serão ajustados na Task 5.)

- [ ] **Step 6: Commit**

```bash
git add -A frontend && git commit -m "feat(layout): sidebar, painel no celular e shell sem abas"
```

---

### Task 5: Rotas, `/financeiro` e faixa financeira

**Files:**
- Create: `frontend/src/layout/FaixaFinanceira.tsx`
- Modify: `frontend/src/App.tsx`, `frontend/src/paginas/inicio/InicioPage.tsx`, `frontend/src/paginas/lancamentos/LancamentosPage.tsx`, `frontend/src/paginas/cartoes/CartoesPage.tsx`
- Test: `frontend/src/layout/FaixaFinanceira.test.tsx`, `frontend/src/App.test.tsx` (criar se não existir; senão estender)

**Interfaces:**
- Consumes: `SeletorMes`, `useMesSelecionado()`.
- Produces: `export function FaixaFinanceira(): JSX.Element`: linha com `SeletorMes` e o link "+ Lançar" para `{ pathname: '/lancamentos/novo', search: busca }`. Usada no topo de `InicioPage` (agora em `/financeiro`), `LancamentosPage` e `CartoesPage`. `RelatoriosPage` e `CategoriasPage` não a usam.

- [ ] **Step 1: Escrever os testes que falham:**

```ts
// FaixaFinanceira.test.tsx
it('mostra o seletor de mês e o link "+ Lançar" com o mês na URL', ...)   // href contém /lancamentos/novo?ano=2026&mes=10
it('trocar o mês muda ?ano=&mes= na URL', ...)

// App.test.tsx (App dentro de AuthProvider/RotaProtegida mockados como nos testes existentes)
it('/financeiro mostra o painel financeiro com a faixa', ...)
it('/lancamentos e /cartoes mostram a faixa; /relatorios e /categorias não', ...)
it('o mês escolhido em /financeiro continua em /lancamentos pelo menu', ...)
it('o toast "Saindo…" fica em bottom-6', ...)                              // classe da div do toast contém 'bottom-6' e não 'bottom-24'
```

- [ ] **Step 2: Rodar e ver falhar:** `cd frontend && npm test -- --run src/layout/FaixaFinanceira.test.tsx src/App.test.tsx`. Esperado: FAIL.

- [ ] **Step 3: Implementar `FaixaFinanceira.tsx`** e encaixá-la nas três páginas. O título de `InicioPage` passa de "Início" para "Visão geral" (ajustar `InicioPage.test.tsx`).

- [ ] **Step 4: `App.tsx`:** `<Route path="/financeiro" element={<InicioPage />} />` ao lado das demais; `/` fica reservada à Task 6 (por ora aponta para um `<p>` provisório só para a rota existir, trocado na Task 6). Ajustar qualquer teste que dependa de `/` ser o painel financeiro.

- [ ] **Step 5: Rodar tudo:** `npm test -- --run` e `npm run lint`. Esperado: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A frontend && git commit -m "feat(rotas): /financeiro e faixa financeira compartilhada"
```

---

### Task 6: Tela inicial nova em `/`

**Files:**
- Create: `frontend/src/paginas/painel/saudacao.ts`, `frontend/src/paginas/painel/FinancasDoMes.tsx`, `frontend/src/paginas/painel/PainelPage.tsx`
- Modify: `frontend/src/App.tsx` (rota `/` aponta para `PainelPage`, no lugar do provisório da Task 5)
- Test: `frontend/src/paginas/painel/saudacao.test.ts`, `frontend/src/paginas/painel/PainelPage.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` (`usuario?.nome`), `endpoints.resumo(ano, mes)`, `mesAtual()` de `frontend/src/formato/mes`, `CardSobra`, `CardsTotais`, `ProximasContas` de `frontend/src/paginas/inicio/`, `ErroApi` de `frontend/src/api/cliente`.
- Produces:
  - `export function saudacao(data: Date): 'Bom dia' | 'Boa tarde' | 'Boa noite'`: pela hora em `America/Sao_Paulo`; 5h–11h59 Bom dia, 12h–17h59 Boa tarde, 18h–4h59 Boa noite.
  - `export function dataPorExtenso(data: Date): string`: `'sábado, 31 de outubro'` (pt-BR, fuso de São Paulo).
  - `export function primeiroNome(nome: string | undefined): string | null`: primeira palavra depois de `trim`; `null` se vazio ou ausente.
  - `export function FinancasDoMes(): JSX.Element`: consulta o resumo do mês atual (sem seletor) e mostra os três cartões; tem estados de carregando (`role="status"`) e erro (`role="alert"` com "Tentar de novo"); link "Ver visão geral" para `/financeiro`.
  - `export function PainelPage(): JSX.Element`: `<h1>` "Bom dia, Lucas" (ou só "Bom dia" sem nome), a data por extenso e `FinancasDoMes`.

- [ ] **Step 1: Escrever os testes que falham.** `saudacao.test.ts` (São Paulo é UTC-3; datas em UTC):

```ts
it('04:59 em SP é Boa noite', ...)   // new Date('2026-10-31T07:59:00Z')
it('05:00 em SP é Bom dia', ...)     // '2026-10-31T08:00:00Z'
it('11:59 é Bom dia e 12:00 é Boa tarde', ...)   // '14:59Z' e '15:00Z'
it('17:59 é Boa tarde e 18:00 é Boa noite', ...) // '20:59Z' e '21:00Z'
it('dataPorExtenso formata sábado, 31 de outubro', ...)  // '2026-10-31T15:00:00Z'
it('primeiroNome pega a primeira palavra e trata vazio', ...) // 'Lucas Maciel'→'Lucas'; '  Ana '→'Ana'; ''/'   '/undefined → null
```

`PainelPage.test.tsx` (msw para `/api/resumo` como em `InicioPage.test.tsx`; auth como em `frontend/src/teste/auth.ts`):

```ts
it('mostra a saudação com o primeiro nome e a data', ...)
it('sem nome mostra só a saudação, sem vírgula sobrando', ...)    // heading exato 'Bom dia' (ou Boa tarde/noite, com relógio fake)
it('o resumo falhando mostra erro com Tentar de novo e mantém a saudação', ...) // servidor 500 → role alert + heading presente; clicar refaz a consulta
it('enquanto carrega mostra "Carregando"', ...)
it('com resumo ok mostra os cartões e o link para /financeiro', ...)
it('abre sem erro com ?ano=2026&mes=10 na URL e consulta o mês atual', ...)
```

- [ ] **Step 2: Rodar e ver falhar:** `cd frontend && npm test -- --run src/paginas/painel`. Esperado: FAIL.

- [ ] **Step 3: Implementar** as três funções puras com `Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', ... })`, depois `FinancasDoMes` (query key `['resumo', ano, mes]` igual à de `InicioPage`, para dividir cache) e `PainelPage`. Layout do mockup `menu-e-inicio.html`: título grande com o nome na cor principal, data embaixo, bloco "Finanças do mês" em card. Sem blocos de tarefas, agenda, projetos ou notas.

- [ ] **Step 4: Ligar a rota** `/` em `App.tsx`; atualizar testes que esperavam outra coisa em `/`.

- [ ] **Step 5: Rodar tudo:** `npm test -- --run` e `npm run lint`. Esperado: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A frontend && git commit -m "feat(painel): tela inicial com saudacao e financas do mes"
```

---

### Task 7: Ctrl K, seletor de páginas (cortável)

Se o plano apertar, esta tarefa é cortada por inteiro: a tela inicial fica sem campo de busca e nada mais muda.

**Files:**
- Create: `frontend/src/layout/PaletaNavegacao.tsx`, `frontend/src/layout/paleta.ts`
- Modify: `frontend/src/layout/AppShell.tsx`, `frontend/src/paginas/painel/PainelPage.tsx`
- Test: `frontend/src/layout/PaletaNavegacao.test.tsx`

**Interfaces:**
- Consumes: `GRUPOS_MENU` (Task 4).
- Produces:
  - `export function normalizar(texto: string): string` (minúsculas e sem acentos).
  - `export function PaletaNavegacao(props: { aberta: boolean; aoFechar: () => void }): JSX.Element | null`: `role="dialog"`, `aria-modal="true"`, `aria-label="Ir para"`; campo de texto, lista com `role="listbox"` e itens `role="option"` (um por item de `GRUPOS_MENU`), `aria-activedescendant` no campo.
  - `export const PaletaContext` e `export function usePaleta(): { abrir: () => void }` em `paleta.ts`. O `AppShell` provê o contexto, guarda o estado `aberta` e registra o atalho global.

- [ ] **Step 1: Escrever os testes que falham:**

```ts
it('Ctrl+K abre a paleta e Meta+K também', ...)
it('digitar "lanc" filtra para Lançamentos, ignorando acento e caixa', ...)
it('setas movem a opção ativa e Enter navega e fecha', ...)
it('Esc fecha e devolve o foco a quem estava focado antes', ...)
it('Tab fica preso dentro do diálogo', ...)
it('sem resultado mostra "Nenhum resultado"', ...)
it('o botão "Ir para…" da tela inicial abre a paleta', ...)
```

- [ ] **Step 2: Rodar e ver falhar:** `cd frontend && npm test -- --run src/layout/PaletaNavegacao.test.tsx`. Esperado: FAIL.

- [ ] **Step 3: Implementar** a paleta, o contexto e o atalho (`keydown` em `document`, `preventDefault` em Ctrl/Meta+K). Na `PainelPage`, o campo do mockup vira um botão com o aspecto de campo, texto "Ir para…" (rótulo honesto: só navega) e a dica "Ctrl K".

- [ ] **Step 4: Rodar tudo:** `npm test -- --run` e `npm run lint`. Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A frontend && git commit -m "feat(layout): paleta Ctrl K para navegar entre paginas"
```

---

### Task 8: Nome Aprumo, README e verificação final

**Files:**
- Modify: `frontend/index.html` (título, descrição), `frontend/public/manifest.webmanifest` (`name`, `short_name`, `description`), `frontend/src/auth/LayoutAuth.tsx`, `README.md` (título e uma seção curta sobre menu lateral e tema), `frontend/public/favicon.svg`, `frontend/public/icon-192.png`, `frontend/public/icon-512.png`; qualquer outro texto visível achado no passo 3.
- Test: `frontend/src/nome.test.ts`

**Interfaces:** nenhuma nova.

- [ ] **Step 1: Escrever o teste que falha** em `nome.test.ts`:

```ts
it('nenhum arquivo visível do frontend nem o README diz "Contas Claras"', ...)
// lê frontend/index.html, frontend/public/manifest.webmanifest, README.md e todo frontend/src/**/*.{ts,tsx} (exceto este teste) e exige zero ocorrências de 'Contas Claras'
it('o manifest se chama Aprumo', ...)
```

- [ ] **Step 2: Rodar e ver falhar:** `cd frontend && npm test -- --run src/nome.test.ts`. Esperado: FAIL listando os arquivos.

- [ ] **Step 3: Trocar o nome.** `grep -rn "Contas Claras" frontend README.md` para achar tudo; textos viram "Aprumo". Descrição nova (só promete o que existe hoje): "Aprumo: suas finanças, e em breve tarefas e agenda, no mesmo lugar."

- [ ] **Step 4: Ícones.** Se `favicon.svg` e os PNGs mostram "C", trocar por um "A" branco sobre `#27187e`. Gerar os PNGs (192 e 512) com `rsvg-convert` ou ImageMagick se existirem na máquina; se nenhum existir, trocar só o SVG e avisar no relatório (sem instalar dependência de projeto).

- [ ] **Step 5: Verificação final** (mostrar a saída real):
  - `cd frontend && npm test -- --run`: todos passam.
  - `npm run lint`: sem erros.
  - `npm run build`: conclui.
  - Subir `npm run dev` e olhar, em 390 px e 1440 px e nos dois temas, as telas `/`, `/financeiro`, `/lancamentos`, `/cartoes`, `/categorias`, `/relatorios` e `/login`: sem texto ilegível no escuro, sem cor clara fixa sobrando, sem piscada ao recarregar com tema escuro salvo. Relatar o que viu.

- [ ] **Step 6: Commit**

```bash
git add -A frontend README.md && git commit -m "feat: nome Aprumo na tela, icones e README"
```
