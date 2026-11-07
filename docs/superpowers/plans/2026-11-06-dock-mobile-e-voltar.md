# Dock mobile com "+" central, página /mais e voltar após inatividade: plano

> **Para o executor:** agent `frontend-developer`, TDD (teste falhando primeiro), um commit por tarefa, em português (`feat(...)`, `fix(...)`). Aprovado pelo Lucas em 2026-11-06 (design discutido no chat; memória `dock-mobile-e-voltar-2026-11-06`).

**Objetivo:** no celular (< 768 px) toda a navegação fica na dock inferior; relogar leva de volta à tela de antes, inclusive após queda por inatividade.

**Branch:** `feat/dock-mobile-mais`, a partir da `main`. Só `frontend/`. Sem backend, sem migration.

**Stack:** React 19, TS, react-router 8, Tailwind com tokens `--cor-*`, vitest + testing-library + msw. Comandos: `cd frontend && npx vitest run <caminho> --reporter=dot`, `npm run build`, `npm run lint`.

## Restrições globais

- Só tokens `--cor-*` (claro e escuro), sem cor fixa. Alvo de toque `min-h-11`, foco visível (`classesFoco.ts`), `prefers-reduced-motion` respeitado, transições 150 a 250 ms, só cor/opacidade/transform animam.
- Ícones SVG (`layout/icones.tsx`), nunca emoji. Nunca `dangerouslySetInnerHTML`.
- Tablet (768 a 1279 px) e desktop (>= 1280 px) não mudam, exceto o logo duplicado (Tarefa 2).
- Não mudar rotas existentes nem o backend. Texto em português do Brasil.
- Não instalar HeroUI nem 21st como dependência. O `.mcp.json` da raiz não entra em commit.

## Foco da revisão (entradas que o design não cita)

1. Queda por inatividade estando em `/conta/excluir`: não pode guardar `voltar` (Tarefa 1 testa).
2. Tela estreita de 360 px: dock com 5 posições e rótulo do item ativo ("Orçamento") não pode estourar nem rolar na horizontal (Tarefa 5 verifica no navegador).
3. Gesto de voltar do Android com a folha "Criar" aberta: ela fecha ao trocar de rota (comportamento atual, preservar na Tarefa 5).
4. Preferências aberta a partir de `/mais` precisa devolver o foco ao botão que a abriu (Tarefa 4).
5. Aviso "Saindo…" (`App.tsx`) não pode ficar atrás da nova dock (Tarefa 5).

---

### Tarefa 1: voltar à tela de antes após inatividade

**Arquivos:** `frontend/src/auth/destino.ts`, `auth/RotaProtegida.tsx`, `auth/AuthProvider.tsx`; testes `auth/destino.test.ts`, `auth/AuthProvider.test.tsx`, `auth/RotaProtegida.test.tsx`.

**Interfaces:**
- Produz: `export function urlDeLogin(pathname: string, search: string, motivo?: 'inatividade'): string` em `auth/destino.ts`.

Causa: `AuthProvider` expira a sessão com `navegar('/login?motivo=inatividade', { replace: true })`, sem `voltar`. Sair pelo botão e 401 já funcionam (`RotaProtegida`).

- [ ] **Passo 1: testes que falham** em `destino.test.ts`:
  - `urlDeLogin('/lancamentos', '?ano=2026&mes=11')` é `/login?voltar=%2Flancamentos%3Fano%3D2026%26mes%3D11`.
  - com `'inatividade'` é `/login?motivo=inatividade&voltar=%2Flancamentos%3Fano%3D2026%26mes%3D11`.
  - `urlDeLogin('/conta/excluir', '')` é `/login`; `urlDeLogin('/Conta/Excluir/', '', 'inatividade')` é `/login?motivo=inatividade` (sem `voltar`, ignorando caixa e barra final).
- [ ] **Passo 2:** teste em `AuthProvider.test.tsx`: com sessão ativa em `/notas`, ao expirar a inatividade (use o padrão de timers do `useTimeoutInatividade.test.ts`) a URL vira `/login?motivo=inatividade&voltar=%2Fnotas`.
- [ ] **Passo 3: rodar** `npx vitest run src/auth/destino.test.ts src/auth/AuthProvider.test.tsx` e ver falhar.
- [ ] **Passo 4: implementar** `urlDeLogin` movendo para ela a regra `SEM_VOLTAR` e `normalizar` que hoje vivem em `RotaProtegida.tsx` (uma só lista, sem duplicar `ROTAS_RECUSADAS`). `RotaProtegida` passa a chamar `urlDeLogin(pathname, search)`. `AuthProvider` lê `useLocation()` e `aoExpirar` chama `navegar(urlDeLogin(pathname, search, 'inatividade'), { replace: true })`.
- [ ] **Passo 5: rodar** `npx vitest run src/auth` e ver passar (inclui `RotaProtegida.test.tsx` e `LoginPage.test.tsx` sem regressão).
- [ ] **Passo 6: commit** `fix(auth): voltar à tela de antes ao relogar após inatividade`.

---

### Tarefa 2: logo duplicado no menu deslizante do tablet

**Arquivos:** `frontend/src/layout/DockLateral.tsx` (bloco "Topo"), teste `layout/DockLateral.test.tsx` e `layout/AppShell.test.tsx`.

Causa: o cabeçalho do menu em `AppShell.tsx` mostra `<Logo />` e o `DockLateral` com `forcarExpandida` mostra outro `<Logo />` logo abaixo.

- [ ] **Passo 1: testes que falham:** (a) `DockLateral` com `forcarExpandida` não renderiza link "Aprumo" nem o botão de recolher; sem a prop continua renderizando o logo (ou o "A" quando recolhida). (b) `AppShell` a 800 px com o menu aberto: `within(dialog Menu).getAllByRole('link', { name: 'Aprumo' })` tem tamanho 1.
- [ ] **Passo 2: rodar** e ver falhar.
- [ ] **Passo 3: implementar:** com `forcarExpandida` o `DockLateral` não renderiza o bloco "Topo" (nem a borda inferior dele).
- [ ] **Passo 4: rodar** `npx vitest run src/layout/DockLateral.test.tsx src/layout/AppShell.test.tsx` e ver passar.
- [ ] **Passo 5: commit** `fix(layout): logo aparecia duas vezes no menu deslizante`.

---

### Tarefa 3: destinos da nova dock e grupo "Mais" em `itensMenu.ts`

**Arquivos:** `frontend/src/layout/itensMenu.ts`, teste `layout/DockInferior.test.tsx` (bloco `ITENS_DOCK`).

**Interfaces:**
- Produz: `ITENS_DOCK: ItemMenu[]` com, nesta ordem, `Início` (`/`, exata), `Notas` (`/notas`), `Orçamento` (`/lancamentos`, `comMes`), `Mais` (`/mais`, `tambemAtivoEm: CAMINHOS_MAIS`). O "+" central não é item: a dock o insere entre `Notas` e `Orçamento`.
- Produz: `export const ITENS_MAIS: ItemMenu[]` = itens de `GRUPOS_MENU` com caminho em `['/tarefas','/projetos','/financeiro','/cartoes','/categorias','/relatorios']`, nessa ordem (Tarefas, Projetos, Visão geral, Cartões, Categorias, Relatórios; sem duplicar rótulos à mão).
- Produz: `export const CAMINHOS_MAIS: string[]` = caminhos de `ITENS_MAIS` mais `'/mais'`, `'/conta/senha'`, `'/conta/excluir'`.
- Ícone de `/mais`: engrenagem (SVG de Preferências em `DockLateral.tsx`, extrair para `ICONE_ENGRENAGEM` em `icones.tsx` e `ICONES['/mais']`, reutilizado pelo `DockLateral`).

- [ ] **Passo 1: testes que falham:** `ITENS_DOCK` rótulos `['Início','Notas','Orçamento','Mais']`; `ITENS_MAIS` rótulos na ordem acima e `CAMINHOS_MAIS` contém `/mais`, `/conta/senha`, `/conta/excluir`.
- [ ] **Passo 2:** rodar e ver falhar. **Passo 3:** implementar. **Passo 4:** rodar `npx vitest run src/layout/DockInferior.test.tsx src/layout/DockLateral.test.tsx` (os testes da dock inferior que dependem do layout antigo serão ajustados na Tarefa 5; aqui só o bloco `ITENS_DOCK`/`ITENS_MAIS`).
- [ ] **Passo 5: commit** `refactor(layout): itens da dock mobile e grupo Mais`.

---

### Tarefa 4: página `/mais`

**Arquivos:** criar `frontend/src/paginas/mais/MaisPage.tsx` e `MaisPage.test.tsx`; criar `frontend/src/layout/contextoShell.ts`; modificar `layout/AppShell.tsx` (passar o contexto ao `<Outlet>`) e `frontend/src/App.tsx` (rota `/mais` dentro de `MolduraDoUsuario`, lazy como as demais).

**Interfaces:**
- Produz: `export interface ContextoShell { nomeUsuario?: string; aoSair: () => void; aoAbrirPreferencias: () => void }` e `export function useContextoShell(): ContextoShell` (wrapper tipado de `useOutletContext`) em `layout/contextoShell.ts`.
- `AppShell`: `<Outlet context={{ nomeUsuario, aoSair, aoAbrirPreferencias: () => setModalPreferenciasAberta(true) } satisfies ContextoShell} />`.

Conteúdo (estilo de cartões agrupados do print de Configurações do Lucas, tokens do app): `<h1>Mais</h1>`; cartão do usuário (avatar com inicial + nome); grupo "Atalhos" com um link por `ITENS_MAIS` (ícone de `ICONES[caminho]`, `to` com `busca` do `useMesSelecionado` quando `comMes`); grupo "Conta" com Preferências (botão que chama `aoAbrirPreferencias`), Alterar senha (`/conta/senha`), Excluir conta (`/conta/excluir`), Política de Privacidade (`/privacidade`); botão "Sair" (`aoSair`), cor `--cor-negativo`. Cada linha `min-h-11`.

- [ ] **Passo 1: testes que falham** (`MaisPage.test.tsx`, renderizando dentro de uma rota-layout com `context`): heading "Mais"; links Tarefas, Projetos, Visão geral, Cartões, Categorias, Relatórios com `href` certo (Visão geral com `?ano=&mes=` quando o mês está na URL); links Alterar senha, Excluir conta e Política de Privacidade; "Preferências" chama `aoAbrirPreferencias`; "Sair" chama `aoSair`; mostra o nome do usuário.
- [ ] **Passo 2:** em `AppShell.test.tsx`, teste: rota `/mais` a 600 px, clicar "Preferências" abre o modal de preferências e fechá-lo devolve o foco ao botão "Preferências".
- [ ] **Passo 3: rodar** e ver falhar. **Passo 4: implementar.** **Passo 5: rodar** `npx vitest run src/paginas/mais src/layout/AppShell.test.tsx src/App.test.tsx`. Se o foco não voltar, o `PreferenciasModal` (`aoFechar`) deve restaurar o foco no elemento que estava ativo ao abrir.
- [ ] **Passo 6: commit** `feat(mais): página Mais com atalhos, conta e sair`.

---

### Tarefa 5: dock com "+" central, sem barra de topo no celular

**Arquivos:** `layout/DockInferior.tsx`, `layout/AcaoRapida.tsx`, `layout/AppShell.tsx`, `App.tsx` (posição do aviso "Saindo…"); testes `DockInferior.test.tsx`, `AcaoRapida.test.tsx`, `AppShell.test.tsx`, `App.test.tsx`.

**Interfaces:**
- `AcaoRapida.tsx` passa a exportar `FolhaAcaoRapida({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void })`: só a folha (itens Nova nota / Nova conta / Nova tarefa, `useDialogoModal`, mesmos destinos e `state` de hoje). O botão "+" flutuante e o componente `AcaoRapida` somem.
- `DockInferior` guarda o estado `aberta`, renderiza o botão "Criar" no centro da pílula (entre Notas e Orçamento) e a `FolhaAcaoRapida` **como irmã** do `<nav>` (Fragment), nunca dentro dele: o `backdrop-blur` do nav cria um bloco de contenção que quebraria o `fixed inset-0` da folha. `aoFechar` fecha e devolve o foco ao botão "Criar". Trocar de rota com a folha aberta fecha (padrão `pathnameAnterior` atual).
- Botão "Criar": `aria-label="Criar"`, `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls` quando aberto; círculo >= 56 px (`size-14`), fundo `--cor-principal`, sombra e anel de `--cor-card`, elevado acima da linha da pílula (destaque); `motion-safe:active:scale-95`.
- `AppShell`: no celular não renderiza `barraSuperior`, não renderiza `AcaoRapida` e o painel deslizante não abre (`painelAberto = aberto && !ehDesktop && !ehCelular`). Tablet mantém barra e painel. Reserva do `main` (`FOLGA_DOCK`) ajustada à nova altura da dock.
- `App.tsx`: o aviso "Saindo…" no celular sobe para ficar acima da nova dock.

- [ ] **Passo 1: testes que falham:**
  - `DockInferior`: nav "Navegação principal" com links `Início, Notas, Orçamento, Mais` e o botão "Criar" entre Notas e Orçamento (ordem do DOM); só o ativo mostra rótulo e `aria-current="page"`; `Mais` ativo em `/tarefas`, `/cartoes`, `/mais`, `/conta/senha`; `Orçamento` ativo em `/lancamentos/novo`; `Orçamento` com `?ano=2026&mes=10` mantém a busca.
  - "Criar" abre o diálogo "Criar" com Nova nota, Nova conta e Nova tarefa; Esc fecha e devolve o foco ao botão; clicar num item navega e fecha; o diálogo não é descendente do `nav`.
  - `AppShell` a 600 px: sem botão "Abrir menu", sem `header`, com a dock; a 800 px: barra e "Abrir menu" continuam e a dock some; sem botão "Criar" fora da dock.
  - Atualizar/remover os testes antigos que esperam "Abrir menu" ou o "+" flutuante a 600 px (`AppShell.test.tsx` blocos "dock inferior no celular" e "ação rápida"; `App.test.tsx:181`, que abre o menu no celular, passa a usar 800 px ou a nova dock).
- [ ] **Passo 2: rodar** `npx vitest run src/layout src/App.test.tsx --reporter=dot` e ver falhar.
- [ ] **Passo 3: implementar** conforme as interfaces. Consultar `ui-ux-pro-max` para o visual do botão central e da indicação do item ativo (HeroUI só como referência de padrão, sem instalar).
- [ ] **Passo 4: rodar** `npx vitest run --reporter=dot`, `npm run build` e `npm run lint`: tudo verde.
- [ ] **Passo 5: verificação no navegador** (`agent-browser` ou Chrome, viewport 360 e 412 px, tema claro e escuro): a dock cabe em 360 px sem rolar na horizontal com o rótulo "Orçamento" ativo; o "+" fica visível, centralizado e destacado; `/mais` não é encoberta pela dock; o aviso "Saindo…" fica acima da dock. Reportar o que viu.
- [ ] **Passo 6: commit** `feat(layout): dock inferior com ação central e navegação toda na dock no celular`.

---

## Fechamento

Depois da Tarefa 5: `code-reviewer` uma vez no diff final da branch; `security-auditor` também, porque a Tarefa 1 mexe no redirecionamento pós-login (`destino.ts`). Depois `superpowers:verification-before-completion` e `superpowers:finishing-a-development-branch`. PR para o Lucas mergear; deploy só com pedido dele.

## Decisões minhas (o Lucas pode trocar)

- Rota e rótulo da página: `/mais` e "Mais" (o print de referência chama "Configurações"; trocar é só texto).
- Tarefas e Projetos ficam em `/mais`, não na dock.
- A página `/mais` abre também em tablet e desktop se digitarem a URL, mas só a dock do celular leva a ela.
