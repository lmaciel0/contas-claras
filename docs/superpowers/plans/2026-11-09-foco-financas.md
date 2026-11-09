# Foco em Finanças com Notas (Fase 1: Remoção de Tarefas e Projetos da UI): Plano

> **Para o executor:** agent `frontend-developer`, TDD (teste falhando primeiro), um commit por tarefa, em português com acentos (`refactor(...)`, `fix(...)`, `docs(...)`). Aprovado pelo Lucas em 2026-11-09.

**Objetivo:** Focar o Aprumo em finanças com notas (removendo tarefas e projetos da interface, navegação, atalhos, textos e ficha da loja). O backend, banco, exportação de dados e exclusão de conta permanecem 100% intactos e reversíveis. O módulo de notas não sofre nenhuma alteração.

**Branch:** `refactor/foco-financas`, a partir da `main`. Modificações concentradas em `frontend/` e `docs/`. Sem mudanças no backend (`backend/`), sem migration.

**Stack:** React 19, TypeScript, react-router 8, Tailwind com tokens `--cor-*`, vitest + testing-library + msw. Comandos: `cd frontend && npx vitest run <caminho> --reporter=dot`, `npm run build`, `npm run lint`.

---

## Restrições Globais

- Manter tokens `--cor-*` (modo claro e escuro), sem cores fixas fora da paleta de design system.
- Alvos de toque com no mínimo `min-h-11`, foco visível (`classesFoco.ts`), `prefers-reduced-motion` respeitado.
- Ícones SVG padronizados em `layout/icones.tsx`, nunca emojis. Nunca `dangerouslySetInnerHTML`.
- **Módulo de notas intacto**: nada em `src/paginas/notas/`, nem nos seus componentes de edição Tiptap ou no backend, pode ser quebrado ou alterado.
- **Backend intacto**: nenhum arquivo em `backend/` deve ser alterado nesta Fase 1. Tabelas, entidades e endpoints de tarefas/projetos continuam existindo para garantir integridade, exportação LGPD e rollback se necessário.
- **Não alterar** listas de dados guardados em `PrivacidadePage.tsx`, `TermosPage.tsx` (seção de dados guardados), `ExclusaoDeContaPage.tsx` e `auth/ExcluirContaPage.tsx`. Esses dados ainda existem no banco nesta fase.
- Mensagens de commit com acentuação correta em português (ex.: `início`, `navegação`, `preferências`).
- Nunca commitar `HANDOFF.md`, `.mcp.json` ou arquivos em `.local/`.

---

## Foco da Revisão (Casos de Borda e Regressão)

1. **Formulário de lançamento respeitar `?tipo=RECEITA`**: na criação, se o parâmetro `tipo=RECEITA` estiver presente, abrir o formulário já no tipo Receita e com categoria inicial de receita selecionada. Na edição, respeitar o tipo do lançamento existente.
2. **Favoritos e links antigos**: URLs `/tarefas` e `/projetos` devem redirecionar suavemente para `/` (`<Navigate to="/" replace />`), sem exibir tela de 404.
3. **Migração de atalhos rápidos salvos no celular**: usuários que tinham salvo `nova-tarefa` ou `projetos` não podem perder os outros atalhos válidos; a lista deve preservar os válidos na ordem e preencher até 4 com os padrões restantes de `ATALHOS_PADRAO`.
4. **Grade responsiva do desktop (`AppShell`)**: remoção do painel lateral direito de produtividade não pode deixar uma terceira coluna vazia ou layout quebrado em 1280 px e telas amplas (`2xl` >= 1536 px).
5. **Folha de criação rápida ("+")**: "Nova despesa" e "Nova receita" devem apontar para `/lancamentos/novo` preservando o mês ativo montado de forma estruturada (como em `getDestino`).
6. **Ordem e completude da página Mais**: deve exibir Visão geral, Cartões, Categorias e Relatórios de forma limpa, sem lacunas deixadas por tarefas ou projetos.

---

### Tarefa 1: Rotas e redirecionamentos no App

**Arquivos:** `frontend/src/App.tsx`; testes `frontend/src/App.test.tsx`, `frontend/src/App.lazy.test.tsx`, `frontend/src/App.chunk.test.tsx`.

- [ ] **Passo 1: Escrever testes que falham**
  - Em `App.test.tsx`, adicionar teste garantindo que navegar para `/tarefas` e `/projetos` redireciona para `/` (renderiza o painel inicial).
  - Garantir que `/notas` continua abrindo normalmente.
  - Atualizar `App.lazy.test.tsx` e `App.chunk.test.tsx` removendo as verificações de chunks lazy de tarefas e projetos.
- [ ] **Passo 2: Rodar testes e ver falhar**
  `cd frontend && npx vitest run src/App.test.tsx src/App.lazy.test.tsx src/App.chunk.test.tsx`
- [ ] **Passo 3: Implementar alterações em `App.tsx`**
  - Remover `lazy` de `ProjetosPage` e `TarefasPage`.
  - Substituir as rotas `/projetos` e `/tarefas` por `<Route path="/projetos" element={<Navigate to="/" replace />} />` e `<Route path="/tarefas" element={<Navigate to="/" replace />} />`.
- [ ] **Passo 4: Rodar testes e ver passar**
  `cd frontend && npx vitest run src/App.test.tsx src/App.lazy.test.tsx src/App.chunk.test.tsx`
- [ ] **Passo 5: Commit**
  `refactor(front): redirecionar rotas de tarefas e projetos para o início`

---

### Tarefa 2: Menu lateral, dock e navegação

**Arquivos:** `frontend/src/layout/itensMenu.ts`, `frontend/src/layout/DockLateral.tsx`, `frontend/src/layout/Sidebar.tsx`, `frontend/src/layout/PaletaNavegacao.tsx`, `frontend/src/paginas/mais/MaisPage.tsx`; testes `DockLateral.test.tsx`, `Sidebar.test.tsx`, `PaletaNavegacao.test.tsx`, `MaisPage.test.tsx`.

- [ ] **Passo 1: Escrever testes que falham**
  - Em `Sidebar.test.tsx` e `DockLateral.test.tsx`, verificar que os links "Tarefas" e "Projetos" não aparecem, mas "Início" e "Notas" continuam presentes no primeiro grupo.
  - Em `MaisPage.test.tsx`, verificar que a lista de atalhos possui apenas Visão geral, Cartões, Categorias e Relatórios.
  - Em `PaletaNavegacao.test.tsx`, garantir que buscar por "tarefas" ou "projetos" não retorna rotas removidas.
- [ ] **Passo 2: Rodar testes e ver falhar**
  `cd frontend && npx vitest run src/layout/DockLateral.test.tsx src/layout/Sidebar.test.tsx src/layout/PaletaNavegacao.test.tsx src/paginas/mais/MaisPage.test.tsx`
- [ ] **Passo 3: Implementar em `itensMenu.ts` e páginas**
  - Ajustar `GRUPOS_MENU`: remover referências a tarefas/projetos. Primeiro grupo fica com "Início" e "Notas". Remover comentários obsoletos sobre calendário/projetos.
  - Atualizar `ORDEM_MAIS` para `['/financeiro', '/cartoes', '/categorias', '/relatorios']`.
  - Garantir que `ITENS_DOCK` (mobile) permaneça: Início, Notas, botão Criar (+), Orçamento e Mais.
- [ ] **Passo 4: Rodar testes e ver passar**
  `cd frontend && npx vitest run src/layout/ src/paginas/mais/`
- [ ] **Passo 5: Commit**
  `refactor(front): remover tarefas e projetos dos menus e da navegação`

---

### Tarefa 3a: `LancamentoForm` respeitar parâmetro `?tipo=RECEITA`

**Arquivos:** `frontend/src/paginas/lancamentos/LancamentoForm.tsx`; testes `frontend/src/paginas/lancamentos/LancamentoForm.test.tsx`.

- [ ] **Passo 1: Escrever teste que falha**
  - Em `LancamentoForm.test.tsx`, adicionar teste garantindo que abrir `/lancamentos/novo?tipo=RECEITA` define o campo tipo como Receita e seleciona por padrão uma categoria de receita.
  - Testar que na edição de um lançamento de despesa existente (`/lancamentos/123/editar?tipo=RECEITA`), o tipo do lançamento existente (Despesa) prevalece sobre a query string.
- [ ] **Passo 2: Rodar teste e ver falhar**
  `cd frontend && npx vitest run src/paginas/lancamentos/LancamentoForm.test.tsx`
- [ ] **Passo 3: Implementar em `LancamentoForm.tsx`**
  - Obter query params via `useSearchParams()`.
  - Na criação (`existente === undefined`), validar se `searchParams.get('tipo')` é `'RECEITA'` ou `'DESPESA'`.
  - Usar o tipo inicial para inicializar `tipo` e `categoriaPadrao` (selecionando a primeira categoria do tipo inicial).
- [ ] **Passo 4: Rodar testes e ver passar**
  `cd frontend && npx vitest run src/paginas/lancamentos/LancamentoForm.test.tsx`
- [ ] **Passo 5: Commit**
  `fix(lancamentos): abrir o formulário como receita quando o link pedir`

---

### Tarefa 3: Folha de Ação Rápida (botão "Criar" / "+")

**Arquivos:** `frontend/src/layout/AcaoRapida.tsx`, `frontend/src/layout/icones.tsx`; testes `frontend/src/layout/AcaoRapida.test.tsx` (ou testes da dock).

- [ ] **Passo 1: Escrever testes que falham**
  - Teste na folha de ação rápida: itens renderizados são "Nova nota", "Nova despesa" e "Nova receita".
  - "Nova tarefa" não deve mais existir.
  - "Nova despesa" aponta para `/lancamentos/novo` com os parâmetros do mês atual.
  - "Nova receita" aponta para `/lancamentos/novo` com os parâmetros estruturados (mesclando mês e `tipo=RECEITA`, no padrão do `getDestino`).
- [ ] **Passo 2: Rodar testes e ver falhar**
  `cd frontend && npx vitest run src/layout/AcaoRapida.test.tsx`
- [ ] **Passo 3: Implementar em `AcaoRapida.tsx` e `icones.tsx`**
  - Estruturar os destinos utilizando objeto `To` com `search` composto (preservando o mês e incluindo `tipo=RECEITA`).
  - Alterar lista `itens`:
    - "Nova nota": mantém `{ rotulo: 'Nova nota', icone: '/notas', para: '/notas', state: { nova: true } }`.
    - "Nova despesa": `{ rotulo: 'Nova despesa', icone: '/lancamentos', para: { pathname: '/lancamentos/novo', search: busca } }`.
    - "Nova receita": `{ rotulo: 'Nova receita', icone: '/financeiro', para: { pathname: '/lancamentos/novo', search: busca ? `${busca}&tipo=RECEITA` : '?tipo=RECEITA' } }`.
  - Atualizar comentário do componente no topo.
  - Limpar ícones não mais utilizados em `icones.tsx`.
- [ ] **Passo 4: Rodar testes e ver passar**
  `cd frontend && npx vitest run src/layout/AcaoRapida.test.tsx`
- [ ] **Passo 5: Commit**
  `refactor(front): trocar nova tarefa por nova receita e nova despesa na ação rápida`

---

### Tarefa 4: Painel inicial (remover tarefas de hoje)

**Arquivos:** `frontend/src/paginas/painel/PainelPage.tsx`, apagar `frontend/src/paginas/painel/TarefasDeHoje.tsx` e `frontend/src/paginas/painel/TarefasDeHoje.test.tsx`; testes `frontend/src/paginas/painel/PainelPage.test.tsx`.

- [ ] **Passo 1: Escrever testes que falham**
  - Em `PainelPage.test.tsx`, verificar que `<TarefasDeHoje />` não é renderizado no painel inicial.
  - Verificar que o bloco de Finanças do Mês, Atalhos Rápidos e Nota Fixada continuam funcionando perfeitamente.
- [ ] **Passo 2: Rodar testes e ver falhar**
  `cd frontend && npx vitest run src/paginas/painel/PainelPage.test.tsx`
- [ ] **Passo 3: Implementar**
  - Remover `<TarefasDeHoje />` de `PainelPage.tsx` e limpar imports e comentários.
  - Apagar os arquivos `TarefasDeHoje.tsx` e `TarefasDeHoje.test.tsx`.
  - Preservar integralmente `NotaFixada.tsx` e seus testes.
- [ ] **Passo 4: Rodar testes e ver passar**
  `cd frontend && npx vitest run src/paginas/painel/`
- [ ] **Passo 5: Commit**
  `refactor(painel): remover bloco de tarefas de hoje da página inicial`

---

### Tarefa 5: Atalhos rápidos mobile e migração resiliente de preferências

**Arquivos:** `frontend/src/preferencias/preferenciasTipos.ts`, `frontend/src/preferencias/preferenciasStorage.ts`, `frontend/src/paginas/painel/atalhosCatalogo.tsx`; testes `frontend/src/preferencias/preferenciasStorage.test.ts`, `frontend/src/paginas/painel/AtalhosRapidosMobile.test.tsx`.

- [ ] **Passo 1: Escrever teste de migração resiliente que falha**
  - Em `preferenciasStorage.test.ts`, testar: quando o usuário tem salvo `['novo-lancamento', 'nova-tarefa', 'cartoes', 'projetos']`, a leitura deve descartar `nova-tarefa` e `projetos`, manter `novo-lancamento` e `cartoes`, e completar até 4 com `nova-receita` e `nova-nota`.
  - Atualizar `ATALHOS_PADRAO` para `['novo-lancamento', 'cartoes', 'nova-receita', 'nova-nota']`.
- [ ] **Passo 2: Rodar testes e ver falhar**
  `cd frontend && npx vitest run src/preferencias/preferenciasStorage.test.ts`
- [ ] **Passo 3: Implementar tipos e migração**
  - Em `preferenciasTipos.ts`, remover `'nova-tarefa'` e `'projetos'` do tipo `IdAtalhoMobile`.
  - Em `atalhosCatalogo.tsx`, remover as definições dos atalhos `nova-tarefa` e `projetos`.
  - Em `preferenciasStorage.ts`, atualizar `ATALHOS_PADRAO` e `ATALHOS_VALIDOS`.
  - Implementar em `validarAtalhos`: filtrar itens que pertencem a `ATALHOS_VALIDOS`, remover duplicatas preservando ordem, e completar a lista até 4 elementos usando os itens de `ATALHOS_PADRAO` que ainda não foram selecionados.
- [ ] **Passo 4: Rodar testes e ver passar**
  `cd frontend && npx vitest run src/preferencias/ src/paginas/painel/AtalhosRapidosMobile.test.tsx`
- [ ] **Passo 5: Commit**
  `refactor(preferências): remover atalhos de tarefas e projetos com migração retrocompatível`

---

### Tarefa 6: Painel lateral de produtividade desktop (`PainelLateralDireito`)

**Arquivos:** `frontend/src/layout/AppShell.tsx`, `frontend/src/layout/HeaderPrincipal.tsx`, apagar `frontend/src/layout/PainelLateralDireito.tsx` e `frontend/src/layout/PainelLateralDireito.test.tsx`; testes `frontend/src/layout/AppShell.test.tsx`, `frontend/src/layout/HeaderPrincipal.test.tsx`.

- [ ] **Passo 1: Escrever testes que falham**
  - Em `AppShell.test.tsx` e `HeaderPrincipal.test.tsx`, remover testes do botão de alternar painel de produtividade e garantir que o layout desktop não renderiza mais o calendário/tarefas lateral.
- [ ] **Passo 2: Rodar testes e ver falhar**
  `cd frontend && npx vitest run src/layout/AppShell.test.tsx src/layout/HeaderPrincipal.test.tsx`
- [ ] **Passo 3: Implementar**
  - Em `AppShell.tsx`: remover estado `painelProdutividadeAberto`, prop `onAlternarPainelProdutividade`, e o componente `PainelLateralDireito`. Ajustar a grade desktop para usar colunas limpas sem a terceira coluna (`col-start-3`). Testar grid em telas amplas.
  - Em `HeaderPrincipal.tsx`: remover botão e props de alternar painel de produtividade.
  - Apagar `PainelLateralDireito.tsx` e `PainelLateralDireito.test.tsx`.
- [ ] **Passo 4: Rodar testes e ver passar**
  `cd frontend && npx vitest run src/layout/`
- [ ] **Passo 5: Commit**
  `refactor(layout): remover painel lateral de produtividade do desktop`

---

### Tarefa 7: Apagar pastas e módulos front de tarefas e projetos

**Arquivos:** Apagar `frontend/src/paginas/tarefas/`, `frontend/src/paginas/projetos/` e `frontend/src/teste/tarefas.ts`; limpar `frontend/src/teste/servidor.ts`, `frontend/src/api/endpoints.ts`, `frontend/src/api/tipos.ts`.

- [ ] **Passo 1: Apagar arquivos de páginas**
  - `rm -rf frontend/src/paginas/tarefas frontend/src/paginas/projetos frontend/src/teste/tarefas.ts`
- [ ] **Passo 2: Limpar endpoints, tipos e handlers MSW**
  - Em `src/api/endpoints.ts`, remover rotas de tarefas e projetos.
  - Em `src/api/tipos.ts`, remover tipos específicos de tarefas e projetos que não sejam mais importados por nenhum arquivo.
  - Em `src/teste/servidor.ts`, remover handlers de tarefas e projetos.
- [ ] **Passo 3: Verificar e remover dependências exclusivas (se houver)**
  - Conferir se bibliotecas como `@dnd-kit` ou similares de kanban estavam em uso exclusivo por projetos/tarefas via `grep -r`. Se sim, remover via `npm uninstall`.
- [ ] **Passo 4: Validar tipagem e testes globais**
  `cd frontend && npx tsc --noEmit && npm run lint`
- [ ] **Passo 5: Commit**
  `refactor(front): apagar módulos e endpoints de tarefas e projetos no front`

---

### Tarefa 8: Textos institucionais, manifest e PWA

**Arquivos:** `frontend/public/manifest.webmanifest`, `frontend/index.html`, `frontend/src/legal/TermosPage.tsx`; testes `frontend/src/manifest.test.ts`, `frontend/src/index-html.test.ts`.

- [ ] **Passo 1: Escrever testes que falham**
  - Em `manifest.test.ts` e `index-html.test.ts`, atualizar as asserções de descrição para finanças com notas (ex.: "Aprumo: suas finanças em ordem e suas notas à mão.").
- [ ] **Passo 2: Rodar testes e ver falhar**
  `cd frontend && npx vitest run src/manifest.test.ts src/index-html.test.ts`
- [ ] **Passo 3: Atualizar descrições**
  - Em `public/manifest.webmanifest`, atualizar a descrição. Manter atalho de "Nova nota".
  - Em `index.html`, atualizar meta description e OpenGraph.
  - Em `src/legal/TermosPage.tsx` (linha ~18), ajustar texto para: "O Aprumo é um aplicativo pessoal para organizar suas finanças e anotações."
  - **Preservar intactas** as listas de dados guardados em `PrivacidadePage.tsx`, `TermosPage.tsx` (linha ~44), `ExclusaoDeContaPage.tsx` e `auth/ExcluirContaPage.tsx`.
- [ ] **Passo 4: Rodar testes e ver passar**
  `cd frontend && npx vitest run src/manifest.test.ts src/index-html.test.ts src/legal/`
- [ ] **Passo 5: Commit**
  `refactor(front): atualizar descrições e termos para foco exclusivo em finanças e notas`

---

### Tarefa 9: Ficha da Play Store e atualização dos prints

**Arquivos:** `docs/play-store/ficha-da-loja.md`, prints `docs/play-store/prints/01..05`.

- [ ] **Passo 1: Atualizar textos em `ficha-da-loja.md`**
  - Ajustar descrição curta e completa para foco exclusivo em finanças pessoais e anotações.
  - Remover menções a tarefas, kanban de projetos e alternativa de categoria "Produtividade".
  - Manter categoria primária Finanças e seções de segurança/declarações intactas.
- [ ] **Passo 2: Capturar novos prints da loja (360x640 @3x = 1080x1920)**
  - Utilizar a receita documentada no HANDOFF:
    - Iniciar sessão via `agent-browser` (viewport 360x640, device scale factor 3).
    - Ocultar scrollbars (`::-webkit-scrollbar { display: none }`).
    - Capturar telas:
      1. `01-painel.png`: `/` (Finanças do mês, atalhos rápidos e nota fixada)
      2. `02-orcamento.png`: `/lancamentos` (planejamento mensal)
      3. `03-cartoes.png`: `/cartoes` (limite e faturas)
      4. `04-relatorios.png`: `/relatorios` (evolução anual)
      5. `05-notas.png`: `/notas` (anotações rápidas)
- [ ] **Passo 3: Commit**
  `docs(play-store): atualizar ficha da loja e prints sem tarefas e projetos`

---

### Tarefa 10: Documentação do plano, revisão de código, verificação final e abertura de PR

**Arquivos:** `docs/superpowers/plans/2026-11-09-foco-financas.md`, todo o diff (`git diff main...HEAD`).

- [ ] **Passo 1: Comitar o plano**
  - `git add docs/superpowers/plans/2026-11-09-foco-financas.md`
  - `git commit -m "docs(planos): plano de foco do Aprumo em finanças com notas"`
- [ ] **Passo 2: Revisão com checklist de `code-reviewer`**
  - Executar auto-revisão detalhada do diff completo (`git diff main...HEAD`).
  - Classificar e corrigir apontamentos CRITICAL, HIGH e MEDIUM.
- [ ] **Passo 3: Verificação completa de qualidade**
  - Rodar suíte de testes: `cd frontend && npx vitest run --reporter=dot`
  - Rodar lint: `cd frontend && npm run lint`
  - Rodar build de produção: `cd frontend && npm run build`
  - Verificar interface no celular (360 px) e desktop via `agent-browser`.
- [ ] **Passo 4: Push da branch e criação do PR no GitHub**
  - `git push -u origin refactor/foco-financas`
  - `gh pr create --base main` com descrição completa seguindo o modelo do HANDOFF.
  - Enviar link para o Lucas realizar o Squash & Merge.
