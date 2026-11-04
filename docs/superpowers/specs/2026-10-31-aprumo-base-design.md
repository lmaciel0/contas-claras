# Aprumo, módulo 1: base (menu lateral, tema claro/escuro e tela inicial)

Data: 2026-10-31. Status: aguardando aprovação do dono.

## Por quê

O dono quer transformar o app financeiro Contas Claras em um assistente pessoal chamado **Aprumo**. O assistente reúne tarefas, notas rápidas, projetos (kanban) e um calendário ligado ao Google, e esse calendário também mostra as contas a pagar do dia vindas das finanças. As finanças atuais continuam, como um módulo entre os outros.

Hoje o app só tem o lado financeiro, sem tema escuro, e o menu é uma barra de abas no topo (desktop) e uma barra inferior (celular). Para receber os outros módulos, o app precisa de uma moldura que sirva a todos: menu lateral, tema claro/escuro e uma tela inicial que reúna o dia. Este documento cobre só essa moldura.

## Roadmap (ordem decidida pelo dono)

1. **Base** (este documento): menu lateral, tema claro/escuro, tela inicial, nome Aprumo na tela.
2. Minhas tarefas.
3. Notas rápidas.
4. Projetos, em kanban.
5. Calendário com Google e contas a pagar.

Cada módulo tem design, plano e implementação próprios. A tela inicial ganha um bloco por módulo conforme ele chega.

## Referências do dono

Ficam em `docs/superpowers/specs/2026-10-31-aprumo-base-referencias/`:

- `menu-e-inicio.html`: o mockup aprovado do menu lateral e da tela inicial. Abre direto no navegador. Textos e números são exemplo; o layout (largura da sidebar, ordem dos blocos, estrutura da tela inicial) é a referência.
- `botao-tema-referencia.md`: o código do botão de tema que o dono colou (styled-components). É referência de desenho e animação.

O dono liberou o implementador para ajustar espaçamentos e ícones onde o mockup não dá a resposta, dentro da identidade visual do Aprumo.

## Objetivos

1. Menu lateral fixo no desktop, no lugar das abas do topo, com o layout do mockup aprovado (marca no alto, itens, grupo Financeiro, usuário no pé).
2. Tema claro e escuro, com o botão de sol e lua fornecido pelo dono, lembrando a escolha.
3. Tela inicial nova em `/`: saudação, data e os dados financeiros que o app já tem.
4. O nome Aprumo substitui "Contas Claras" em tudo que o usuário vê no frontend.
5. Todas as telas financeiras de hoje continuam funcionando, nos dois temas.

## Não objetivos

- Qualquer módulo novo (tarefas, notas, projetos, calendário) e qualquer endpoint ou migration nova. Este módulo é só frontend.
- "Contas a pagar" e "contas vencendo hoje": entram no módulo 5.
- Renomear o repositório, a URL do Vercel, o pacote Java `dev.lmaciel.contasclaras` e os textos de e-mail do backend. Ficam para uma etapa própria.
- Busca de conteúdo (lançamentos, tarefas, notas). Ver decisão sobre o Ctrl K abaixo.
- Página de Configurações. Só o que já existe (trocar senha, sair).
- Copiar as cores da foto de referência. A identidade visual é a do Aprumo.

## Anti-objetivos

- Botão ou item de menu que não leva a lugar nenhum.
- Piscar no tema errado ao carregar a página.
- Quebrar qualquer tela financeira existente ou o fluxo de login.
- Texto que perde contraste (WCAG AA) no tema escuro.

## Decisões do dono

- Menu lateral e tela inicial como no mockup (`menu-e-inicio`), sem copiar as cores da foto.
- Botão de tema: o componente de sol e lua que o dono colou na conversa (ver "Botão de tema"). O dono pediu o tema claro/escuro como opção do sistema.
- Ordem dos módulos: base, tarefas, notas, projetos, calendário.
- Itens e contadores do mockup eram exemplos. Textos e números não são requisito.

## Decisões minhas (o dono confirma ao ler)

- **Sidebar a partir de 1280 px** (o ponto de corte que `useEhDesktop` já usa). Abaixo disso a sidebar vira um painel que abre por um botão de menu numa barra fina no topo, e a `NavbarInferior` sai.
- **Menu**: Início, grupo Financeiro (Visão geral, Lançamentos, Cartões, Categorias, Relatórios) e, no pé, o bloco do usuário (inicial, nome, botão de tema, Sair). Tarefas, Notas, Projetos e Calendário só aparecem no menu quando o módulo existir.
- **Rotas**: `/` vira a tela inicial nova. O painel financeiro de hoje (`InicioPage`) passa para `/financeiro` ("Visão geral"). As demais rotas financeiras não mudam.
- **Seletor de mês e "+ Lançar"** continuam, mas só nas telas financeiras, numa faixa de cabeçalho compartilhada (um componente só, usado por `/financeiro`, `/lancamentos` e `/cartoes`; `/relatorios` e `/categorias` seguem sem mês, como hoje em `ROTAS_SEM_MES`). O mês continua na query string via `useMesSelecionado`, então vale ao trocar de página. A tela inicial `/` usa sempre o mês atual, sem seletor.
- **Toasts de `App.tsx`** (saindo, erro): sem a navbar inferior, a posição fica `bottom-6` em qualquer largura, e as cores fixas (`bg-white`, `bg-[#fdecec]`) viram tokens.
- **Ctrl K**: abre um seletor modal (foco preso, filtro, setas, atalho global) que navega entre as páginas do menu. Não busca conteúdo. É a última tarefa do plano e pode ser cortada se apertar; nesse caso o campo de busca sai da tela inicial desta etapa.
- **Tela inicial, nesta etapa**: saudação por horário (Bom dia, Boa tarde, Boa noite) com o primeiro nome, data por extenso em português e um bloco "Finanças do mês" que reaproveita os dados e componentes do painel atual. Sem os blocos de tarefas, agenda, projetos e notas, que chegam com seus módulos.
- **Tema**: atributo `data-tema` em `<html>` com `claro` ou `escuro`. Escolha salva em `localStorage` (chave `aprumo-tema`), gravada na primeira vez que o dono usa o botão. Sem escolha salva, o padrão é o claro (o sistema operacional não conta); a escolha salva sempre vence. Um script curto no `index.html` aplica o tema antes de o React montar, para não piscar.
- **Cores do escuro**: derivadas do roxo `#27187e` atual, mantendo AA. Valores exatos ficam com o implementador.
- **Botão de tema em CSS puro**, sem adicionar styled-components (o projeto usa Tailwind 4 e variáveis CSS). Mantém o desenho do dono: trilho com sol, que vira lua ao marcar, raios que se recolhem, `role="switch"`. Fica de fora o `.theme__fill`, o overlay de tela cheia com `mix-blend-mode: difference`, que inverteria as cores da página em vez de usar a paleta do Aprumo. Respeita `prefers-reduced-motion`. Marcado = escuro.
- **Nome Aprumo**: logo com "A", título e descrição em `frontend/index.html`, `LayoutAuth.tsx`, README, `manifest.webmanifest` e `AppShell.test.tsx`. O implementador acha os demais textos visíveis com grep no `frontend/`. Ícones (`favicon.svg`, `icon-192.png`, `icon-512.png`): não existe arte do Aprumo, então, se mostrarem o "C", troca-se por um "A" simples no roxo `#27187e`, até o dono mandar arte própria.

## Estado atual (do código)

- React 19, Vite 8, TypeScript, react-router 8, Tailwind 4 (`@tailwindcss/vite`), TanStack Query, Recharts, Vitest + Testing Library + msw, oxlint.
- Tokens em `frontend/src/index.css` (`--cor-*`, `--raio-card`), só no `:root`. A classe `.card` usa `#fff` fixo e há `bg-white` espalhado nos TSX: precisam virar token para o escuro funcionar. Cores de gráfico em `frontend/src/paginas/inicio/cores.ts`.
- Shell em `frontend/src/layout/` (`AppShell`, `AbasTopo`, `NavbarInferior`, `MenuUsuario`, `SeletorMes`, `AvisoServidor`, `useEhDesktop`). Rotas em `frontend/src/App.tsx`; o nome do usuário chega por `useAuth().usuario.nome`.

## Restrições

- Acessibilidade: `nav` com rótulo, `aria-current="page"` no item ativo, foco visível, painel do celular fecha com Esc e devolve o foco, alvo de toque de pelo menos 44 px.
- Sem dependência nova, salvo decisão explícita no plano.
- TDD. Testes cobrem: itens do menu e item ativo, saudação por horário, tema salvo e tema inicial padrão claro, botão de tema (estado e teclado), painel do celular, rota `/financeiro` e `/` nova.
- Deploy e git seguem o fluxo já autorizado no repositório.

## Fica para o implementador

- Paleta escura exata, desde que cumpra AA e derive do roxo atual.
- Estrutura interna dos componentes e nomes de arquivos.
- Como migrar `bg-white` e cores de gráfico para tokens.
- Detalhes visuais da tela inicial além do mockup, e o que mostrar no bloco "Finanças do mês".
