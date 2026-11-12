# Design system do Aprumo

Fonte da verdade: `frontend/src/index.css` (tokens) e os componentes de `frontend/src`. Este documento descreve o que existe; quando os dois divergirem, o código vence e o documento é corrigido. O teste `frontend/src/designSystemDoc.test.ts` confere que todo token `--cor-*` de `:root` tem exatamente uma linha na tabela de Cores, com o valor de `:root` na coluna Claro e o de `:root[data-tema='escuro']` na coluna Escuro (o do claro quando o escuro não redefine), e que a tabela de Presets bate com os blocos de preset do `index.css`. Texto fora dessas tabelas, como a coluna Uso e a prosa, não é conferido.

## Identidade

- Produto: Aprumo, finanças pessoais e notas. Tom calmo e direto, textos curtos em português do Brasil.
- Dois temas: claro (padrão, fundo lavanda `#f7f7ff` e destaque índigo escuro) e escuro (fundo neutro obsidian e destaque azul). O tema escuro liga com `data-tema='escuro'` no `<html>`.
- Três presets de cor de destaque (ver Presets). O destaque muda, o resto da paleta não.
- Superfícies translúcidas com leve desfoque (`backdrop-filter: blur(8px)`) sobre um fundo em degradê. O desfoque dos cards é decisão do dono e não se remove.
- Só tokens `--cor-*`. Cor nunca é o único sinal: estado ativo, erro e pago também têm texto ou forma.

## Cores

Todos os tokens `--cor-*` de `:root`. A coluna "Claro" é o valor de `:root`; "Escuro" é o de `:root[data-tema='escuro']`. Em um preset, `--cor-principal`, `--cor-principal-clara` e `--cor-principal-fim` mudam (ver Presets).

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--cor-fundo` | `#f7f7ff` | `#0b0d13` | Fundo da página e base do degradê. |
| `--cor-principal` | `#27187e` | `#60a5fa` | Destaque: botões primários, links, item ativo, card da sobra. |
| `--cor-principal-clara` | `#a49ddb` | `#3b82f6` | Variação suave do destaque. |
| `--cor-positivo` | `#2e9e5b` | `#34d399` | Verde de receitas em barras e fundos (não em texto pequeno). |
| `--cor-negativo` | `#d64545` | `#ef6b6b` | Vermelho de despesas, bordas de erro e ações destrutivas em barras e fundos. |
| `--cor-positivo-texto` | `#1f7a45` | `#5fd68f` | Verde para texto pequeno (4,5:1 sobre card e fundo). |
| `--cor-negativo-texto` | `#b73333` | `#ff8a8a` | Vermelho para texto pequeno (4,5:1 sobre card e fundo). |
| `--cor-texto` | `#16123a` | `#f1f3f9` | Texto principal. |
| `--cor-mutado` | `#706e8a` | `#8e95b0` | Texto secundário, rótulos, legendas. |
| `--cor-linha` | `#e9e8f5` | `#202538` | Bordas, divisores e fundo dos esqueletos. |
| `--cor-card` | `#fff` | `#131622` | Fundo de cards, campos e modais; base da superfície translúcida. |
| `--cor-erro-fundo` | `#fdecec` | `#2a151b` | Fundo de mensagem de erro. |
| `--cor-ok-fundo` | `#e9f6ee` | `#0f291e` | Fundo de chip e aviso de sucesso. |
| `--cor-aviso-fundo` | `#fff2cb` | `#2b230d` | Fundo de aviso. |
| `--cor-aviso-texto` | `#7a5f00` | `#fde047` | Texto de aviso sobre `--cor-aviso-fundo`. |
| `--cor-sobre-principal` | `#fff` | `#0b0d13` | Texto e ícone sobre `--cor-principal`. |
| `--cor-sobre-negativo` | `#fff` | `#0b0d13` | Texto sobre `--cor-negativo` (ações destrutivas). |
| `--cor-sobre-principal-suave` | `#cfcbf2` | `#1e293b` | Texto secundário sobre `--cor-principal` (card da sobra). |
| `--cor-principal-fim` | `#4a36c4` | `#3b82f6` | Fim do degradê do botão das telas de auth (o início é `--cor-principal`). |
| `--cor-auth-borda` | `#fff` | `#202538` | Borda do card das telas de auth. |
| `--cor-auth-fundo-fim` | `#f4f7fb` | `#0f121a` | Fim do degradê do card de auth (o início é `--cor-card`). |
| `--cor-auth-campo-borda` | `transparent` | `#3b82f6` | Contorno dos campos de auth: transparente no claro, 3:1 no escuro (WCAG 1.4.11). |
| `--cor-grafico-receitas` | `#27187e` | `#60a5fa` | Barras de receitas realizadas no gráfico do ano. |
| `--cor-grafico-despesas` | `#a49ddb` | `#3b82f6` | Barras de despesas realizadas no gráfico do ano. |
| `--cor-grafico-receitas-previstas` | `#7d73c4` | `#2563eb` | Fundo das receitas previstas no gráfico do ano. |
| `--cor-grafico-despesas-previstas` | `#e6e4f7` | `#1e3a8a` | Fundo das despesas previstas no gráfico do ano. |
| `--cor-nota-vermelho` | `#c0392b` | `#ff8a8a` | Categoria de nota vermelha (4,5:1 sobre `--cor-card`). |
| `--cor-nota-laranja` | `#b45309` | `#fb9a4b` | Categoria de nota laranja. |
| `--cor-nota-amarelo` | `#8a6500` | `#f2c94c` | Categoria de nota amarela. |
| `--cor-nota-verde` | `#1f7a45` | `#5fd68f` | Categoria de nota verde. |
| `--cor-nota-azul` | `#1d5fbf` | `#60a5fa` | Categoria de nota azul. |
| `--cor-nota-roxo` | `#7c3aed` | `#a78bfa` | Categoria de nota roxa. |
| `--cor-nota-rosa` | `#be185d` | `#f472b6` | Categoria de nota rosa. |
| `--cor-nota-cinza` | `#5b5876` | `#9ca3af` | Categoria de nota cinza. |

Regras de uso:

- Texto pequeno de valor positivo ou negativo usa `--cor-positivo-texto` e `--cor-negativo-texto`; `--cor-positivo` e `--cor-negativo` ficam para barras e fundos.
- O par de contraste mínimo é 4,5:1 para texto e 3:1 para contornos de campo e componentes. `frontend/src/estilos.test.ts` confere contraste AA do texto nos temas claro e escuro, 3:1 em bordas de campo e no botão de tema, proíbe cor fixa em TSX e exige `prefers-reduced-motion`.
- Fundos de chip e aviso usam os tokens `*-fundo`, nunca cor fixa.

## Presets

Três presets de cor de destaque, escolhidos pelo usuário e aplicados com `data-preset` no `<html>`: `lima`, `esmeralda` e `indigo`. Cada um troca só `--cor-principal`, `--cor-principal-clara` e `--cor-principal-fim`; no tema escuro também fixa `--cor-sobre-principal` em `#0b0d13`. Sem preset, valem os tokens da tabela de Cores.

| Preset | Principal (claro) | Clara (claro) | Fim (claro) | Principal (escuro) | Clara (escuro) | Fim (escuro) |
|---|---|---|---|---|---|---|
| `lima` | `#84cc16` | `#4d7c0f` | `#65a30d` | `#a3e635` | `#4d7c0f` | `#84cc16` |
| `esmeralda` | `#059669` | `#047857` | `#10b981` | `#10b981` | `#047857` | `#34d399` |
| `indigo` | `#4f46e5` | `#3730a3` | `#6366f1` | `#6366f1` | `#3730a3` | `#818cf8` |

Todo componente novo precisa ficar legível nos três presets nos dois temas, o que só vale se ele usar tokens.

## Tipografia

- Fonte única: Inter Variable (`@fontsource-variable/inter`), declarada em `--font-sans` e no `html`, com `ui-sans-serif, system-ui, sans-serif` de reserva.
- Valores de dinheiro usam a classe `.valor` (`font-variant-numeric: tabular-nums`) para alinhar em coluna.
- Corpo no celular: campos de formulário com 16 px (menos que isso o iOS dá zoom ao focar); nenhum texto abaixo de 12 px em tela de auth. Rótulos e legendas pequenas usam 11 a 12 px com `--cor-mutado`.
- Título de página: `text-[28px] font-bold tracking-tight`. Número de destaque: 26 a 30 px em negrito (`CardSobra`, `FaixaSaldo`). Título do card de auth: 30 px, peso 900.

## Raio, superfícies e sombras

| Token | Valor | Uso |
|---|---|---|
| `--raio-card` | `22px` | Raio de `.card`, cards de nota e card da sobra. |
| `--superficie` | `color-mix(in srgb, var(--cor-card) 75%, transparent)` | Fundo translúcido de `.superficie` e `.card`. |
| `--superficie-borda` | `color-mix(in srgb, var(--cor-card) 90%, transparent)` no claro; `var(--cor-linha)` no escuro | Borda de `.superficie` e `.card`. |
| `--sombra-flutuante` | `0 2px 8px` do principal a 10% no claro; `0 2px 8px rgb(0 0 0 / 35%)` no escuro | Sombra de `.superficie` e `.card`. |
| `--fundo-degrade` | degradê de 160 graus entre o principal a 10%, o fundo e o principal a 12% | Fundo do shell. |

- `.card`: superfície com `--raio-card`, `padding: 1rem` e `backdrop-filter: blur(8px)`. Cards compactos dentro de grades sobrescrevem o padding (`!p-3.5`).
- Outros raios em uso: `rounded-2xl` (cards de meta, atalhos), `rounded-xl` (campos, botões de modal, mensagens de erro), `rounded-full` (chips, botões de ação, dock). O card de auth usa 40 px e seus campos 20 px.

## Espaçamento e primeira dobra no celular

Resumo de `docs/superpowers/plans/2026-11-12-painel-espacamento-primeira-dobra.md` (medido em 360x640, tela inicial `/`):

- Entre blocos da tela, o espaço é um só (`gap-5`, 20 px). Um wrapper que pode renderizar vazio conta o `gap` duas vezes: o widget de meta devolve `null` sem metas, então ele recebe `className` e `style` e anima a própria `<section>`, sem `div` embrulhador.
- Não aninhar card dentro de card. O bloco "Finanças do mês" é uma `<section>` sem `.card`; os quatro cards de dentro são os cards. Isso devolve largura útil (296 px em vez de 262 px de 360). A mensagem de erro do bloco é a exceção: leva `.card` para não ficar solta sobre o fundo.
- A "Sobra do mês" deve caber inteira acima da dock inferior (que começa perto de y = 555 em 640 de altura). Resultado medido em produção: espaço de 20 px entre os blocos e sobra de y 383 a 530.
- O cabeçalho da frase do dia cabe em uma linha em 360 px: o subtítulo "Sabedoria diária" some abaixo de `sm` (`hidden sm:inline`). O `flex-wrap` do cabeçalho permanece, porque em 320 px o selo e os três botões somam mais que a área útil.
- A ordem dos blocos da tela inicial não muda sem pedido do dono.
- A dock flutuante cobre o fundo da tela: o conteúdo principal precisa ficar acima dela. Elementos fixos embaixo (como o aviso de saída em `frontend/src/App.tsx`) sobem `6.5rem + env(safe-area-inset-bottom)` no celular.

## Componentes existentes

Só o que existe hoje. Ícones: SVGs de `frontend/src/layout/icones.tsx` e componentes de `lucide-react` (Metas, Painel, Notas). Foco por teclado: `foco` de `frontend/src/layout/classesFoco.ts` (contorno de 2 px, deslocado 2 px, em `--cor-principal`).

### Genéricos (`frontend/src/componentes`)

- `Carregando`: dot-spinner de 8 pontos com `role="status"` e texto opcional; usa `--cor-principal`.
- `Esqueleto`: variantes `texto` (com `linhas`), `circulo` e `card`; classe `.esqueleto-shimmer`, `role="status"`, `aria-busy` e `rotuloAcessivel`.
- `ErroDeCarregamento`: fronteira de erro das páginas lazy; aviso com `role="alert"` e botão "Recarregar" dentro da moldura.
- `LimiteDeErro`: última barreira da aplicação; tela inteira com "Algo deu errado" e "Recarregar".

### Layout e navegação (`frontend/src/layout`)

- `AppShell`, `HeaderPrincipal`, `Sidebar` e `DockLateral` (desktop), `DockInferior` (celular, menos de 768 px).
- `DockInferior`: pílula flutuante com Início, Notas, Orçamento e Mais; o botão "Criar" fica elevado no centro e abre `FolhaAcaoRapida` (`AcaoRapida.tsx`). Só o item ativo mostra o rótulo (`.dock-rotulo`).
- `CabecalhoPagina`: título (só para leitor de tela no celular), `SeletorMes` e atalho "+ Lançar" nas telas do mês.
- `PaletaNavegacao` ("Ir para...", Ctrl K), `AvisoServidor`, `Logo`, `useDialogoModal` (foco preso, Esc e rolagem travada).
- `BotaoTema` (`frontend/src/tema`): interruptor de tema com contraste não textual de 3:1.

### Formulários e autenticação (`frontend/src/auth`)

- `CampoTexto`: rótulo visível ligado ao `input`, `min-h-11`, `text-base`, borda `--cor-linha`.
- `MensagemDeErro`: `role="alert"`, borda `--cor-negativo`, fundo `--cor-erro-fundo`.
- `LayoutAuth`, `TelaAuth`, `BotaoGoogle`, `BotaoReenviar`; o visual das telas de auth vive em `.auth-card` no `index.css`.

### Padrões recorrentes por módulo (`frontend/src/paginas`)

- Painel (`painel`): `CardReflexao` (frase do dia), `AtalhosRapidosMobile` (grade de 4 atalhos configuráveis, `ModalPersonalizarAtalhos`), `FinancasDoMes`, `NotaFixada` (conteúdo somente leitura, caixinhas marcáveis).
- Visão geral (`inicio`): `CardSobra` (fundo `--cor-principal`), `CardsTotais` (cards compactos com chip de variação), `GraficoResultado` (cores `--cor-grafico-*` e tabela equivalente para leitor de tela), `OndeMaisGastou` (barras por categoria), `ProximasContas`, `ResumoCartoes`.
- Orçamento (`lancamentos`): `FaixaSaldo` (saldo grande no destaque), `ReceitasCard`, `GrupoCategoria` (linhas tocáveis, chip que alterna o status), `LancamentoForm` dentro de `Moldura` (tela cheia no celular, janela modal a partir de 768 px).
- Cartões (`cartoes`): `CardCartao` (visual `cartao-premium` em `CardCartao.css`), `EditorCartao`.
- Categorias (`categorias`): `LinhaCategoria`, `LinhaSubcategoria`, `SeletorCor` e `SeletorIcone` (paleta fixa em `paletaCores.ts`), `PaginacaoTabela`.
- Metas (`metas`): `CardMeta`, `WidgetMetaInicio`, `CardConselheiroMetas`, `ModalMetaForm` e `ModalAporteMeta` (folha que sobe de baixo no celular, centralizada a partir de `sm`).
- Notas (`notas`): `CartaoNota` (entrada escalonada `.nota-entra`), `FaixaCategorias` (chips de filtro), `NotaEditor` com `BarraFormatacao` (Tiptap), `nota-editor.css` e `nota-leitura.css`.
- Relatórios (`relatorios`): `TabelaAnual` (só o contêiner rola de lado, coluna Item fixa).
- Mais (`mais`): `MaisPage` (lista em cartão com divisores e seta à direita, `max-w-md`).
- Movimento: `.item-entra` e `.nota-entra` (fade com subida de 6 a 8 px, escalonados por `--i`), `.folha-painel`, `.dock-rotulo`, `.menu-painel`, `.paleta-entra`. Só cor, opacidade e transform animam, de 150 a 250 ms; tudo desliga em `prefers-reduced-motion`.

## Regras de 360 px

360 px é a largura de referência do celular; 320 px é o mínimo (`body { min-width: 320px }`). Confira toda tela nova em 360, 768 e 1280 px, nos dois temas.

- Nada de rolagem horizontal da página. Só um contêiner próprio pode rolar de lado (como em `TabelaAnual`). Texto longo usa `min-w-0` com `break-words`, `truncate` ou `line-clamp`.
- Alvo de toque de 44 px (`min-h-11`, `min-w-11` ou `size-11`) em todo botão, link e linha tocável.
- Barras de ação e cabeçalhos usam `flex-wrap` para quebrar em vez de cortar em 320 px.
- Largura útil conta: sem card dentro de card, sem padding duplicado, sem wrapper vazio com `gap`.
- O conteúdo principal precisa ficar acima da dock flutuante; elemento fixo embaixo sobe `6.5rem + env(safe-area-inset-bottom)` (o botão "Criar" elevado chega a 5 rem do fundo).
- Modal no celular é folha que sobe de baixo (`rounded-t-3xl`, `max-h-[92vh]`) ou tela cheia (`Moldura`); a partir de `sm` ou `md` vira janela centralizada.
- Texto de campo em 16 px, para não dar zoom no iOS.

## Acessibilidade

- Contraste: 4,5:1 para texto e 3:1 para contornos de campo e de componentes, nos dois temas e nos três presets. Texto pequeno em verde ou vermelho usa os tons `*-texto`.
- Foco visível em todo controle (`foco` de `classesFoco.ts` ou o equivalente com contorno de 2 px em `--cor-principal`); alvos de 44 px.
- Rótulo visível em campo (`CampoTexto`), `aria-label` em botão só de ícone, `role="alert"` em erro, `role="status"` em carregamento.
- Cor nunca é o único sinal: o item ativo da dock é um bloco preenchido com texto, o status pago tem chip com texto.
- Movimento: toda animação e transição respeita `prefers-reduced-motion`.
- Gráfico com tabela equivalente para leitor de tela (`GraficoResultado`); título de página único (`<h1>`), mesmo quando só leitor de tela o vê no celular.
- Modais prendem o foco, fecham com Esc e devolvem o foco ao elemento de origem (`useDialogoModal`, `Moldura`).

## Referências visuais

Interpretação a validar pelo Lucas. Ele citou cinco apps, sem prints e sem dizer o que gosta em cada um. As leituras abaixo são gerais e prováveis, não decisões.

- Netflix: conteúdo em destaque e poucas cores.
- Spotify: tema escuro e listas densas.
- Uber: preto e branco, ação primária única e rótulos curtos.
- Headspace: formas arredondadas, calma e ilustração.
- Cash App: números grandes e ação principal clara.

Estas referências não substituem os tokens existentes. Em conflito, o design system atual vence.

Perguntar ao Lucas o que ele gosta em cada app antes de redesenhar uma tela.

## O que NÃO fazer

Nasce das armadilhas registradas no projeto e das regras de 360 px.

- Não usar cor fixa (`bg-white`, `text-white`, `bg-[#...]`, `text-[#...]`): `estilos.test.ts` reprova. Use `--cor-*`.
- Não usar a paleta do Tailwind (`red-600`, `emerald-500`, `amber-*`, `from-black/80`) em tela nova. Hoje há desvios em `metas` (`CardMeta`, `MetasPage`, `ModalMetaForm`, `ModalAporteMeta`, `CardConselheiroMetas`, `WidgetMetaInicio`), em `CardCartao` e em um ponto de `CardReflexao`. São dívida a corrigir com os tokens `--cor-negativo`, `--cor-positivo` e `--cor-sobre-*`, não padrão a copiar.
- Não usar `--cor-positivo` e `--cor-negativo` em texto pequeno: use `--cor-positivo-texto` e `--cor-negativo-texto` (4,5:1).
- Não remover o `backdrop-filter: blur` de `.card` nem de `.superficie` (pedido explícito do dono).
- Não trocar paleta, fonte ou presets por sugestão de ferramenta (`ui-ux-pro-max`, 21st) sem o Lucas pedir. O resultado delas é referência; este documento vence.
- Não instalar HeroUI, shadcn, framer-motion nem 21st como dependência. Código de referência do 21st é só inspiração de estrutura, reescrito com os tokens.
- Não animar `width`, `height` nem `top`. Só cor, opacidade e transform, de 150 a 250 ms, e sempre com `prefers-reduced-motion`.
- Não usar `dangerouslySetInnerHTML`. O conteúdo de nota é JSON do Tiptap e se alinha com a lista permitida do backend (`ConteudoNota`).
- Não deixar botão, link ou linha tocável com menos de 44 px (`min-h-11`) nem sem foco visível.
- Não pôr card dentro de card nem wrapper vazio com `gap`: em 360 px isso custa largura útil e dobra o espaço entre blocos.
- Não deixar a tela inicial com a "Sobra do mês" parcialmente atrás da dock inferior em 360x640.
- Não deixar a página rolar de lado em 320 px. Pendência conhecida: a tela inicial e `/financeiro` rolam na horizontal por causa de `<table className="sr-only">` em `frontend/src/paginas/inicio/GraficoResultado.tsx` (a tabela ignora `width: 1px`). A correção sugerida é embrulhar a tabela em `<div className="sr-only">`; precisa de "ok" do dono e PR próprio. Não replicar esse padrão.
- Não usar `sr-only` solto sem um ancestral posicionado (`relative`): o texto é absoluto e alarga a página, como `TabelaAnual` já previne.
- Não usar emoji como ícone: use os SVGs de `layout/icones.tsx` ou `lucide-react`.
- Não dar a campo de formulário menos de 16 px de texto (zoom no iOS) nem tirar o rótulo visível.
- Não confiar só em cor para indicar estado (ativo, pago, erro): inclua texto ou forma.
- Não redesenhar tela com base nas referências visuais antes de perguntar ao Lucas o que ele gosta em cada app.
