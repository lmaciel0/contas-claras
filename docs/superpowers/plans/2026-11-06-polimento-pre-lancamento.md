# Plano: polimento antes do lançamento na Play Store

Aprovado pelo Lucas em 2026-11-06. Branch `fix/polimento-pre-lancamento` (a partir da `main`). Só front-end (`frontend/`), sem mudança de regra de negócio nem de backend. Executor: agent `frontend-developer`, TDD (teste falhando primeiro), um commit por item, em português (`fix(...)`, `refactor(...)`).

Fora de escopo: o card "Próximas contas" (o Lucas verificou e ele já funciona: só lista lançamentos `PREVISTO`).

## 1. Botão Google com fundo branco quadrado no tema escuro

- Causa: o app usa `color-scheme: dark` e o iframe do Google (Google Identity Services) usa `light`. Com os dois divergindo, o navegador pinta o iframe com fundo opaco.
- Arquivo: `frontend/src/auth/BotaoGoogle.tsx`, o `div` com `data-testid="botao-google"`.
- Correção: `color-scheme: light` no container (deixa o iframe transparente) e `overflow-hidden rounded-full` como reforço contra cantos quadrados.
- Teste (`BotaoGoogle.test.tsx` ou o teste existente da tela de login): o container tem `style.colorScheme === 'light'`. Escrever antes.

## 2. Avatar do topo muda o tema no 1º clique

- Arquivo: `frontend/src/layout/HeaderPrincipal.tsx` (menu do perfil) e `frontend/src/tema/BotaoTema.tsx`.
- A causa não foi achada só lendo: o avatar só faz `setMenuAberto`, e o tema só muda pelo `BotaoTema` dentro do menu.
- Passo 1: `superpowers:systematic-debugging`. Reproduzir (testes + navegador, viewport desktop >= 1280 px, tema claro e escuro). Verificar: algo captura o clique do avatar e dispara o `onChange` do switch (`label.theme`, `.theme__toggle` com `position: relative; z-index: 1`), o menu abrindo sob o ponteiro, `mousedown` fora fechando e reabrindo o menu.
- Passo 2: teste de regressão que falha: um clique no botão "Perfil do usuário" abre o menu (`aria-expanded=true`) e não muda `localStorage['aprumo-tema']` nem `document.documentElement` (atributo de tema).
- Passo 3: corrigir a causa. Se não reproduzir, parar e voltar ao Lucas com o que foi visto.

## 3. Espaçamento da dock lateral

- Arquivo: `frontend/src/layout/DockLateral.tsx`, rodapé na versão expandida.
- Hoje o rodapé mistura linhas com ícone (Preferências, Sair) e linhas só com texto (Alterar senha, Excluir conta, Política de Privacidade): desalinhadas e com alturas diferentes.
- Mudança: ícones em Alterar senha, Excluir conta e Política de Privacidade, na mesma coluna e com a mesma altura de linha das demais. Excluir conta e Política seguem com texto menor e cor mutada, alinhados. Espaço entre o menu e o rodapé uniforme. Só tokens `--cor-*`, `min-h-11`, foco visível.
- A versão recolhida (só ícones) não muda.
- Testes existentes (`DockLateral.test.tsx`, `Sidebar.test.tsx`, `AppShell.test.tsx`) continuam verdes. Conferir no navegador (expandida, recolhida, gaveta do celular).

## 4. Remover os subtítulos das páginas

- `frontend/src/paginas/inicio/InicioPage.tsx` (linha ~37): tirar `subtitulo`.
- `frontend/src/paginas/lancamentos/LancamentosPage.tsx` (linha ~53): tirar `subtitulo`.
- `frontend/src/paginas/cartoes/CartoesPage.tsx` (linha ~219): tirar `subtitulo`.
- `frontend/src/paginas/projetos/ProjetosPage.tsx` (linhas ~114 a 116): remover o `<p>` "Acompanhe o andamento...".
- `frontend/src/layout/CabecalhoPagina.tsx`: remover a prop `subtitulo` e o `<p>` (fica sem uso). Ajustar `CabecalhoPagina.test.tsx` (o teste que checa o subtítulo vira um que garante que só o título aparece).
- Teste primeiro: nas páginas, não existe mais o texto de subtítulo.

## Verificação e fechamento

- `cd frontend && npx vitest run --reporter=dot`, `npm run build`, `npm run lint`: mostrar a saída real (resumo e falhas).
- Agent `code-reviewer` uma vez no diff final da branch.
- Depois `superpowers:finishing-a-development-branch`: push e PR para o Lucas mergear (squash). Sem deploy sem pedido.
