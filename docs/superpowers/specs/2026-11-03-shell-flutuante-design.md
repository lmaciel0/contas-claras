# Shell flutuante: redesenho do topo e da moldura do Aprumo

Data: 2026-11-03. Projeto: `contas-claras/frontend`. Tamanho: projeto com design escrito, depois plano (`superpowers:writing-plans`).

## Intenção e motivo

O topo do sistema incomoda o usuário. Hoje a moldura das telas logadas mistura três linguagens visuais:

- A dock da esquerda é um card flutuante (`rounded-3xl`, margem, sombra).
- O header (`HeaderPrincipal.tsx`) é uma faixa branca reta (`bg-[var(--cor-card)]`), colada nas bordas, com `border-b` e `shadow-xs`.
- O painel direito (`PainelLateralDireito.tsx`) é uma coluna chapada com `border-l` e fundo `--cor-fundo`, sem cantos arredondados.

Efeitos que o usuário vê: uma tarja branca dura no topo; um vão sem linha entre a dock e o header, enquanto o lado direito tem linha (a leitura da frase do usuário como "falta linha à esquerda" é interpretação nossa); header e painel direito desalinhados; título da página solto sobre o fundo; seletor de mês e "+ Lançar" com sombras próprias.

O que o usuário quer: mais fluidez e uma moldura coerente. A referência que ele escolheu foi um painel de vidro azul claro (busca larga flutuando, sino e avatar em pílula, dock à esquerda, painel de calendário à direita, todos como cards flutuantes sobre um fundo tingido).

O usuário aprovou a direção mostrada no mockup `.superpowers/brainstorm/921184-1793728194/content/topo-antes-depois.html`.

## Direção aprovada

1. **Sem barra no topo.** A faixa branca some. A busca vira uma pílula larga que flutua sobre o fundo. Sino e avatar ficam numa pílula irmã, à direita.
2. **Tudo flutua igual.** Dock, pílulas do topo, cards de conteúdo e painel direito usam o mesmo raio, a mesma sombra suave e o mesmo vão. `border-b` do header e `border-l` do painel direito saem.
3. **Título e ações juntos.** Título da página, seletor de mês e "+ Lançar" ficam na mesma linha, sobre o fundo, com o mesmo tratamento de superfície.
4. **Cores.** Mantém o roxo do Aprumo e os presets existentes (lima, esmeralda, índigo). O branco chapado vira branco translúcido sobre um degradê lavanda sutil.

Os itens 3 e 4 foram palpite nosso validado pelo usuário no mockup; os detalhes numéricos abaixo (opacidades, raios, vãos) são chute inicial a ajustar vendo a tela.

## Metas

- Uma só linguagem visual na moldura: superfícies flutuantes com raio, sombra e vão iguais.
- Topo sem faixa branca e sem linhas de emenda.
- Funcionar no tema claro e no escuro e com os 3 presets de cor.
- Manter acessibilidade: contraste de texto 4,5:1, foco visível, alvos de toque de 44 px no celular, `prefers-reduced-motion` respeitado.
- Manter o comportamento atual: `Ctrl K` abre a paleta, menu do avatar (tema, preferências, senha, sair), dock recolhível, painel de produtividade, preferências `barraFixa` e `layoutLargura`.

## Não metas

- Não mexer em regras de negócio, backend, rotas ou dados.
- Não redesenhar o conteúdo interno das páginas (tabelas, gráficos, formulários). Só a moldura e o cabeçalho de página.
- Não trocar a biblioteca de UI nem adotar shadcn/21st. O projeto usa Tailwind 4 com variáveis CSS próprias (`--cor-*`). Consultei o catálogo do 21st e os resultados são shells genéricos com código pago; servem só de referência visual.
- Não ajustar o visual de celular além de manter o que existe funcionando (ver Restrições).

## Anti-metas (seria fracasso mesmo funcionando)

- Texto ilegível sobre fundo translúcido.
- Desempenho pior por excesso de `backdrop-filter` (a skill de UX aponta glassmorphism como "bom", com cuidado de contraste).
- Quebrar o tema escuro ou os presets.
- Voltar a ter elementos do topo com raios, sombras ou alturas diferentes entre si.

## Restrições

- Stack: React 19, Tailwind 4, `react-router` 8, Vitest e Testing Library. Estilo por variáveis CSS em `src/index.css`.
- Testes existentes cobrem o layout (`AppShell.test.tsx`, `HeaderPrincipal.test.tsx`, `DockLateral.test.tsx`, `PainelLateralDireito.test.tsx`, `FaixaFinanceira.test.tsx`, `estilos.test.ts` com checagem de contraste). Devem continuar passando ou ser atualizados junto, sem enfraquecer as checagens.
- Abaixo de 1280 px o `AppShell` mostra uma barra fina com o botão "Abrir menu" e o menu em gaveta; o painel direito só aparece em ≥ 1536 px (`2xl`) ou por botão. Esse comportamento fica; só ganha o mesmo visual flutuante, sem prioridade de refinamento.
- `main` e `<Outlet />` ficam sempre na mesma posição da árvore, para cruzar 1280 px não remontar a rota (comentário existente no `AppShell`).
- Frontend é escrito pelo agent `frontend-developer`, com TDD, revisão `code-reviewer` uma vez no diff final.

## Decisões de design

- **Superfície flutuante padrão.** Criar tokens em `index.css` (por exemplo `--superficie`, `--superficie-borda`, `--sombra-flutuante`, `--raio-flutuante`), com valores para claro e escuro, e usá-los em dock, pílulas do topo, cards da moldura e painel direito. Chute inicial no claro: fundo `rgba(255,255,255,.75)`, borda `rgba(255,255,255,.9)`, sombra `0 2px 8px rgba(39,24,126,.08)`; vão de 8 a 12 px. O escuro precisa de valores próprios (não basta inverter).
- **Fundo.** Degradê lavanda sutil no container raiz do `AppShell` (chute inicial: `#ebe9fb`, `#f3f2ff`, `#e4e1fa`), para o translúcido ter o que mostrar. Fica atrás de tudo; o `backdrop-filter` só entra se o contraste e o desempenho permitirem.
- **Topo.** `HeaderPrincipal` deixa de ser uma `<header>` com fundo e borda. Vira uma linha de duas pílulas: busca (flex-1, `Ctrl K` à direita, mesma altura da pílula do grupo) e grupo com sino e avatar. Altura única para as duas pílulas (chute: 40 a 44 px). A preferência `barraFixa` continua: com ela ligada o topo fica fixo; como não há mais fundo próprio, ele precisa de um fundo ou desfoque mínimo para o conteúdo não passar legível por baixo ao rolar.
- **Logo.** Fica no alto da dock, alinhada à primeira linha do topo (como na referência).
- **Painel direito.** Perde `border-l` e fundo próprio; os blocos viram cards flutuantes com a superfície padrão, alinhados ao topo da linha das pílulas.
- **Cabeçalho de página.** Título + subtítulo à esquerda; seletor de mês e "+ Lançar" à direita, na mesma linha. `SeletorMes` e `FaixaFinanceira` passam a usar a superfície padrão e a mesma altura do botão. Hoje cada página escreve o próprio `<h1>` (28 px, `font-bold`); o ideal é um componente compartilhado de cabeçalho, para a mudança valer em todas as telas do mês.
- **Cards de conteúdo (decisão do usuário).** A classe global `.card` de `index.css` passa a usar a superfície flutuante padrão, então os cards das páginas acompanham a moldura. Só muda o visual do contêiner (fundo, borda, raio, sombra); o interior de tabelas, gráficos e formulários não é redesenhado. Componentes com estilo próprio de card (por exemplo os cartões de crédito premium) ficam como estão, salvo se destoarem claramente; o construtor lista os casos no plano.
- **Rótulos de seção.** Pequenos, em caixa alta, cor `--cor-mutado` (padrão já usado na dock e visto na referência) nos cards do painel direito.
- **Ícones.** Seguem SVG inline/`lucide-react`; sem emoji (os emojis do mockup são só desenho).

## Chamadas nossas após a revisão do documento (marcadas como decisão do redator, não do usuário)

- **Estrutura do grid (≥ 1536 px, ou painel aberto).** Segue o mockup aprovado: o topo (busca + grupo sino/avatar) atravessa toda a largura à direita da dock; o painel direito começa logo abaixo dele. Assim os cards do painel alinham com os cards de conteúdo e o dropdown do avatar continua `absolute top-full right-0` do grupo.
- **Botão "Alternar painel de produtividade".** Vai para a pílula do grupo, à esquerda do sino, visível só abaixo de `2xl` como hoje. Não some.
- **Dock.** Mantém altura total (`h-dvh`, sticky), logo e botão de recolher dentro dela e o estado recolhido atual. O topo das pílulas alinha com o topo da dock. Só mudam superfície, raio e sombra. Isso difere do mockup, onde o logo aparece fora da dock; o mockup era só wireframe e esta é a escolha mais segura para os testes e para o estado recolhido.
- **Degradê de fundo.** Deriva da cor de destaque (`color-mix` com `--cor-principal` sobre `--cor-fundo`), para os presets lima, esmeralda e índigo e o tema escuro funcionarem sem tokens extras por combinação. O lavanda do mockup é o resultado no preset padrão.
- **`barraFixa` ligada.** O topo fica fixo sem fundo sólido: as pílulas têm `backdrop-blur` leve e uma máscara em degradê (sem borda) some o conteúdo que passa por trás. Se isso não bastar para a leitura, o construtor sobe a opacidade das pílulas antes de criar qualquer faixa.
- **Teste de contraste.** `estilos.test.ts` considera o pior ponto do degradê sob a superfície translúcida. Isso fixa uma opacidade mínima.
- **Cabeçalho de página.** Novo componente compartilhado (título, subtítulo, ações opcionais). Mantém `sr-only` do título abaixo de `md` como hoje e o `aoLancar` de Cartões. A primeira entrega migra Início, Orçamento e Cartões (as telas com seletor de mês e "+ Lançar"); as demais telas entram em etapa posterior.

## O que fica para o construtor

- Valores finais de opacidade, raio, sombra, vão e altura, ajustados vendo a tela.
- Decidir se o `backdrop-filter` entra ou se basta translúcido sobre o degradê.
- Escolher o nome e o formato do componente de cabeçalho de página e quais telas migram nesta entrega.
- Ajustar os testes de layout e de contraste ao novo markup.
- Valores do tema escuro e dos presets para os novos tokens, verificando o contraste de 4,5:1.
- Divisão em etapas e ordem de entrega no plano (cada etapa uma branch pequena com PR, como o usuário prefere).

## Como saber que deu certo

- Na tela de Orçamento em 1920 px, tema claro: nenhuma faixa branca chapada no topo; busca e grupo do avatar flutuam; dock, topo, conteúdo e painel direito compartilham raio, sombra e vão; nenhum vão ou borda "solta" entre dock e topo nem entre topo e painel direito.
- Mesma checagem no tema escuro e nos 3 presets.
- `Ctrl K`, menu do avatar, dock recolhida e painel de produtividade funcionam como antes.
- Teclado: foco visível em busca, sino, avatar, dock e botões.
- Em 1024 px e 375 px nada quebra e não há rolagem horizontal.
- `npm test`, `npm run build` e `npm run lint` passam.
