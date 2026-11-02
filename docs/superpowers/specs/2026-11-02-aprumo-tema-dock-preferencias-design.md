# Aprumo: Modo Escuro Obsidian, Dock Flutuante e Central de Preferências

- **Data**: 2026-11-02
- **Status**: Em revisão
- **Autor**: Antigravity + Usuário
- **Objetivo**: Modernizar o shell visual do Aprumo, substituindo o modo escuro roxo atual por uma paleta escura neutra e refinada com acentos azuis, criando uma Central de Preferências interativa e transformando o menu lateral em uma Dock flutuante e retrátil.

---

## 1. Contexto e Motivação

O Aprumo passou por avanços estruturais recentes (timeout de inatividade, testes rigorosos e layout desktop moderno). Contudo, três pontos visuais críticos foram levantados:
1. **Modo Escuro Excessivamente Roxo**: O tema escuro atual usa `--cor-fundo: #0f0b2b` e `--cor-card: #1a1442`, gerando uma saturação arroxeada/pesada (semelhante ao exemplo da Imagem 1 fornecida pelo usuário). A referência esperada (Imagem 2) adota um tom escuro neutro/grafite profundo (*obsidian/slate*) com acentos azuis refinados e contraste cristalino.
2. **Ausência de Configurações de Interface pelo Usuário**: O usuário precisa customizar o modo do tema (Claro/Escuro/Sistema), cores de destaque (presets como Azul clássico, Lima, etc.), largura do conteúdo (centralizado com limite ou tela cheia) e comportamento da barra superior (fixa ou com rolagem). A Imagem 3 serve de referência direta para um modal de Preferências limpo e intuitivo.
3. **Menu Lateral Rígido e Colado à Borda**: A barra lateral atual é uma coluna vertical colada à borda esquerda. A referência da Imagem 4 propõe uma **Dock flutuante** com cantos arredondados, margem externa, transição suave entre estado expandido (ícones + rótulos de navegação) e estado compacto/recolhido (apenas ícones em pílula com tooltips acessíveis).

---

## 2. Metas e Não-Metas

### Metas (In-Scope)
- **Tema Escuro Neutro e Elegante**:
  - Fundo em carvão/obsidiana profundo (`#0b0d13`), cards em grafite acetinado (`#131622`), divisórias/linhas sutis (`#202538`) e textos nítidos (`#f1f3f9`).
  - Preservar detalhes e destaques azuis vibrantes (`#3b82f6`) característicos da marca Aprumo.
  - Conformidade estrita WCAG AA (>= 4,5:1 para texto normal e >= 3:1 para controles/ícones ativos).
- **Central de Preferências (`PreferenciasModal`)**:
  - Modal acessível inspirado na Imagem 3, com:
    - Modo do tema: botões segmentados `[ Claro ] [ Escuro ] [ Sistema ]` (com sincronização de `prefers-color-scheme`).
    - Presets de cor de destaque: `Azul Aprumo` (padrão), `Lima`, `Esmeralda`, `Índigo`.
    - Largura da página: `[ Centralizado ] [ Largura total ]`.
    - Barra de navegação: `[ Fixa (Sticky) ] [ Rolar ]`.
    - Ação "Restaurar padrões".
  - Persistência das preferências em `localStorage` com chave `aprumo-preferencias` e fallback resiliente.
  - Acessibilidade total: WAI-ARIA `dialog`, `aria-modal="true"`, foco preso (*focus trap*), fechamento por `Escape` e clique no backdrop.
- **Menu Lateral em Dock Flutuante & Retrátil (`DockLateral`)**:
  - Descolada da borda esquerda (`m-3` ou `p-3`), cantos arredondados (`rounded-2xl`), elevação sutil e borda contrastante.
  - Alternância entre **Expandida (`w-60`)** e **Recolhida / Dock Compacta (`w-18`)**.
  - No modo recolhido, cada item de menu exibe apenas o ícone centralizado com tooltip acessível via hover ou foco do teclado.
  - Botão de toggle colapsar/expandir no topo da dock.
  - No mobile, mantém o comportamento de drawer gaveta responsivo.

### Não-Metas (Out-of-Scope)
- Download ou injeção dinâmica de fontes externas do Google Fonts em tempo de execução (manter fonte do sistema / Inter Variable para estabilidade e zero lag de rede).
- Seletores de cor hexadecimal arbitrária (usar paletas de presets testadas e aprovadas para evitar quebra de contraste).
- Suporte a múltiplos idiomas além do Português nesta fase.

---

## 3. Especificação Visual e Tokens de Design

### 3.1 Tokens do Modo Escuro (`:root[data-tema='escuro']`)
Arquivo: `frontend/src/index.css`
```css
:root[data-tema='escuro'] {
  --cor-fundo: #0b0d13;
  --cor-card: #131622;
  --cor-linha: #202538;
  --cor-texto: #f1f3f9;
  --cor-mutado: #8e95b0;
  --cor-principal: #3b82f6;
  --cor-principal-clara: #1d4ed8;
  --cor-principal-fim: #2563eb;
  --cor-positivo: #34d399;
  --cor-positivo-texto: #6ee7b7;
  --cor-negativo: #f87171;
  --cor-negativo-texto: #fca5a5;
  --cor-erro-fundo: #2a151b;
  --cor-ok-fundo: #0f291e;
  --cor-aviso-fundo: #2b230d;
  --cor-aviso-texto: #fde047;
  --cor-sobre-principal: #ffffff;
  --cor-sobre-principal-suave: #bfdbfe;
  --cor-sobre-negativo: #ffffff;
  --cor-auth-borda: #202538;
  --cor-auth-fundo-fim: #0f121a;
  --cor-auth-campo-borda: #3b82f6;
  --cor-grafico-receitas: #3b82f6;
  --cor-grafico-despesas: #60a5fa;
  --cor-grafico-receitas-previstas: #2563eb;
  --cor-grafico-despesas-previstas: #1e3a8a;
  --raio-card: 20px;
}
```

### 3.2 Presets de Cor de Destaque (`html[data-preset='...']`)
Permite aplicar a cor de destaque favorita do usuário sobre o tema claro ou escuro:
- **`azul` (padrão)**: `--cor-principal: #3b82f6; --cor-principal-clara: #1d4ed8;`
- **`lima` (referência Imagem 3)**: `--cor-principal: #84cc16; --cor-principal-clara: #4d7c0f;` (escuro: `--cor-principal: #a3e635;`)
- **`esmeralda`**: `--cor-principal: #059669; --cor-principal-clara: #047857;` (escuro: `--cor-principal: #10b981;`)
- **`indigo`**: `--cor-principal: #4f46e5; --cor-principal-clara: #4338ca;` (escuro: `--cor-principal: #6366f1;`)

---

## 4. Arquitetura e Estrutura de Componentes

### 4.1 Módulo de Preferências (`frontend/src/preferencias/`)
- **`preferenciasTipos.ts`**:
  ```ts
  export type ModoTema = 'claro' | 'escuro' | 'sistema'
  export type PresetCor = 'azul' | 'lima' | 'esmeralda' | 'indigo'
  export type LayoutLargura = 'centralizado' | 'largura-total'

  export interface PreferenciasUsuario {
    modoTema: ModoTema
    presetCor: PresetCor
    layoutLargura: LayoutLargura
    barraFixa: boolean
    dockRecolhida: boolean
  }
  ```
- **`preferenciasStorage.ts`**:
  - `lerPreferenciasSalvas(): PreferenciasUsuario`
  - `gravarPreferencias(prefs: PreferenciasUsuario): void`
  - `PREFERENCIAS_PADRAO: PreferenciasUsuario` (modo: `'sistema'`, preset: `'azul'`, largura: `'centralizado'`, barra: `true`, dock: `false`).
- **`usePreferencias.ts` & `PreferenciasContext.tsx`**:
  - Provê estado e setters reativos para a aplicação.
  - Sincroniza atributos no elemento raiz `document.documentElement`:
    - `data-tema="claro" | "escuro"`
    - `data-preset="azul" | "lima" | "esmeralda" | "indigo"`
  - Mantém listener em `window.matchMedia('(prefers-color-scheme: dark)')` quando `modoTema === 'sistema'`.
- **`PreferenciasModal.tsx`**:
  - Renderiza o modal elegante com seletor de preset (chips com indicador visual de cor), botões segmentados com estilo tátil, switches e botão de restauração.

### 4.2 Dock Flutuante (`frontend/src/layout/DockLateral.tsx`)
Substitui a `Sidebar.tsx` tradicional pelo conceito de Dock:
- **Container flutuante**:
  - `sticky top-3 h-[calc(100dvh-1.5rem)] my-3 ml-3`
  - Bordas arredondadas `rounded-2xl` com fundo `--cor-card` e borda `--cor-linha`.
- **Toggle Colapsar / Expandir**:
  - Botão com ícone e `aria-label="Recolher menu"` / `aria-label="Expandir menu"`.
  - Animação CSS suave de largura: `w-60` (expandida) para `w-18` (recolhida).
- **Itens de Navegação**:
  - No modo recolhido: exibe ícone em botão quadrado com cantos arredondados. O item ativo ganha destaque de fundo (`bg-[var(--cor-principal)]` ou card contrastante com borda/acento). Ao passar o mouse ou focar via teclado, exibe tooltip flutuante posicionado à direita.
- **Rodapé da Dock**:
  - Botão de abrir modal de Preferências (ícone de engrenagem).
  - Avatar do usuário e botão Sair.

### 4.3 Ajustes no Layout Shell (`frontend/src/layout/AppShell.tsx`)
- Suporte dinâmico à largura da Dock:
  - `grid-cols-[auto_1fr]` ajustado automaticamente conforme a dock estiver expandida (`240px`) ou recolhida (`72px`).
- Suporte ao layout de conteúdo:
  - `layoutLargura === 'centralizado'`: `<main className="mx-auto w-full max-w-6xl ...">`
  - `layoutLargura === 'largura-total'`: `<main className="w-full px-4 md:px-8 ...">`
- Suporte à barra superior fixa ou rolante:
  - `barraFixa`: `<header className="sticky top-0 ...">`
  - `!barraFixa`: `<header className="relative ...">`

---

## 5. Estratégia de Testes

1. **Testes Unitários de Armazenamento e Estado**:
   - `preferenciasStorage.test.ts`: testar leitura, gravação, fallback de JSON inválido e reset para padrões.
   - `usePreferencias.test.tsx`: testar reatividade, troca de modo tema, detecção de tema do sistema e aplicação no `documentElement`.
2. **Testes de Componentes**:
   - `PreferenciasModal.test.tsx`: testar renderização, interação com botões segmentados, atalho `Escape`, clique externo e restauração.
   - `DockLateral.test.tsx`: testar alternância expandido/recolhido, links de rota, tooltips acessíveis e abertura do modal de preferências.
   - `AppShell.test.tsx`: atualizar para testar os novos modos de layout (`largura-total`, barra fixa/rolante).
3. **Testes de Contraste e Tokens**:
   - `estilos.test.ts`: atualizar e validar que todas as combinações de cores do novo tema escuro cumprem a métrica WCAG AA (>= 4,5:1).
4. **Verificação de Regressão Global**:
   - Rodar a suíte completa de 561 testes de frontend garantindo 100% de sucesso.

---

## 6. Critérios de Aceite

- [ ] Modo escuro com visual neutro e profissional (*obsidian/slate*), sem o tom roxo pesado anterior, mantendo detalhes azuis vibrantes.
- [ ] Modal de Preferências totalmente funcional e acessível, permitindo alterar modo de tema, preset de cores, layout e barra superior.
- [ ] Dock lateral flutuante com suporte a colapsar/expandir, exibição de tooltips no modo compacto e persistência de estado.
- [ ] Design responsivo em resoluções desktop e mobile.
- [ ] 100% dos testes do frontend passando com sucesso sem quebra de acessibilidade.
