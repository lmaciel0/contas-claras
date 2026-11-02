# Especificação de Design: Visão Lista e Linha do Tempo (Módulo Projetos)

**Data**: 02 de Novembro de 2026  
**Status**: Proposto (Fase 1: Visão Lista)  
**Autor**: Equipe Antigravity IDE  

---

## 1. Visão Geral e Objetivos

O módulo de Projetos do Aprumo foi lançado com a visão em **Quadro Kanban**, permitindo organização visual em colunas com drag and drop. Para complementar a experiência de produtividade e gestão, esta especificação define a implementação das duas visões complementares:

1. **Fase 1 (Imediata)**: **Visão Lista** — Tabela moderna e densa, agrupada por estágio em acordeões expansíveis, com controles rápidos inline (troca de estágio, expansão e conclusão de subtarefas, prazos e ações).
2. **Fase 2 (Subsequente)**: **Visão Linha do Tempo** — Visualização em Roadmap / Gantt horizontal, mapeando os projetos e entregas por semana e mês baseando-se na data de criação e prazo.

---

## 2. Fase 1: Visão Lista (`ListaProjetos`)

### 2.1 Estrutura Visual e Agrupamento por Estágios
A visualização em lista organiza os projetos em 4 seções horizontais expansíveis (acordeões), correspondendo aos estágios canônicos:
- 🔵 **A Fazer** (`A_FAZER`)
- 🟡 **Em Andamento** (`EM_ANDAMENTO`)
- 🟣 **Em Revisão** (`EM_REVISAO`)
- 🟢 **Concluído** (`CONCLUIDO`)

Cada cabeçalho de estágio exibe:
- **Chevron expansível/colapsável** (com persistência em estado local).
- **Indicador visual do estágio**: Ponto colorido e rótulo do estágio.
- **Contador de projetos**: Badge informando o total de itens naquele estágio (ex: `3`).
- **Ação rápida**: Botão `+ Adicionar projeto` que abre o `ProjetoModal` já pré-selecionado para aquele estágio.

### 2.2 Colunas da Tabela
Dentro de cada acordeão aberto, os projetos são renderizados em uma tabela moderna, limpa e com espaçamento confortável:

| Coluna | Descrição e Componentes |
| :--- | :--- |
| **Projeto** | Dot com a cor do projeto (`azul`, `esmeralda`, `indigo`, `ambar`, `rosa`, `roxo`), título com botão clicável para abrir edição e descrição resumida em linha única (`line-clamp-1`). |
| **Categoria** | Badge estilizada com `--cor-fundo`, borda sutil e texto em `--cor-mutado`. Se não houver categoria, traço discreto (`—`). |
| **Prioridade** | Badge com classes semânticas por nível: Baixa (`--cor-mutado`), Média (azul), Alta (âmbar) e Urgente (vermelho/destaque). |
| **Subtarefas** | Mini barra de progresso horizontal + texto `X/Y` e botão de expansão inline. Ao expandir a linha, exibe lista compacta com checkboxes para alternar a conclusão de subtarefas diretamente na lista (`useAlternarSubtarefa`). |
| **Prazo** | Ícone de calendário (`aria-hidden="true"`) com data formatada em `DD/MM/AAAA`. Se a data for anterior ao dia de hoje e o estágio não for `CONCLUIDO`, exibe texto em tom de alerta (`text-red-500`). |
| **Estágio** | Dropdown / `select` inline acessível permitindo mudar de estágio com 1 clique, disparando a mutação otimista `useMoverEstagioProjeto`. |
| **Ações** | Menu ou botões rápidos para abrir modal de edição e excluir projeto com confirmação. |

### 2.3 Estados Vazios
- **Estágio sem projetos**: Mensagem amigável ("Nenhum projeto neste estágio") e botão discreto de criação.
- **Filtro sem resultados**: Se busca ou filtro de prioridade não encontrar nenhum projeto, exibe banner ilustrado de busca sem resultados com botão para limpar filtros.

### 2.4 Requisitos de Acessibilidade e SonarCloud
- Semântica de tabela acessível (`<table>`, `<thead>`, `<tbody>`, `<th>`, `<tr>`, `<td>`) ou lista semântica com `role="region"`.
- Todos os SVGs com `aria-hidden="true"`.
- Sem elementos não interativos com listeners de clique.
- Props marcadas como `Readonly<Props>`.
- Zero hardcoded colors: Uso estrito de tokens `--cor-*`.

---

---

## 3. Fase 2: Visão Linha do Tempo (`TimelineProjetos`)

### 3.1 Conceito & UX
A Linha do Tempo (Roadmap / Gantt) oferece visualização temporal dos projetos, permitindo identificar prazos, sobreposições, gargalos e entregas planejadas ao longo das semanas e meses.

O componente é construído nativamente (zero bibliotecas pesadas de Gantt), utilizando HTML semântico, SVG e Flexbox/CSS Grid integrados às variáveis CSS do Aprumo (`--cor-*`).

### 3.2 Estrutura da Interface

```
+-----------------------------------------------------------------------------------------------+
| [ < ]  [ Hoje ]  [ > ]   Novembro 2026                 [ Escala: Mês | Trimestre ]   [+ Projeto] |
+------------------------+----------------------------------------------------------------------+
| Projeto                | S1 (01-07)  | S2 (08-14)  | S3 (15-21)  | S4 (22-28)  | S5 (29-30)   |
+------------------------+-------------+-------------+-------------+-------------+--------------+
| 🔵 Projeto Alpha [80%] |             | [====== 80% ======]       |             |              |
| 🟡 Redesign UI   [30%] | [==== 30% ====]           |             |             |              |
| 🟣 API Kanban    [0%]  |             |             | [=== 0% ===]              |              |
+------------------------+-------------+-------------+-------------+-------------+--------------+
```

### 3.3 Componentes e Controles
1. **Barra de Ferramentas Temporal**:
   - Navegação: Botões `<` (período anterior), `Hoje` (centraliza no dia atual) e `>` (próximo período).
   - Rótulo formatado do período (Ex: "Novembro de 2026").
   - Alternância de Escala: Toggle entre visão `Mês` (visualização de semanas e dias) e `Trimestre` (visualização dos 3 meses com semanas).
   - Indicador de Hoje: Linha vertical destacada com cor de acento (`var(--cor-destaque)`).

2. **Tabela / Grid de Gantt**:
   - **Coluna Lateral Fixa** (esquerda): Lista com o nome dos projetos, indicador visual de cor, badge de estágio e percentual de conclusão. Clicar no projeto abre o modal de edição.
   - **Área da Grade de Tempo** (direita, com rolagem horizontal se necessário):
     - Cabeçalho temporal com divisões de semanas e dias.
     - Linhas correspondentes a cada projeto.
     - **Barras de Projeto**:
       - Posição horizontal calculada proporcionalmente: início em `criadoEm` e fim em `prazo`.
       - Se o projeto não possuir `prazo`, é exibida barra com duração estimada padrão (7 dias a partir da criação) e padrão visual tracejado/hachurado com badge indicativa "Sem prazo".
       - Preenchimento interno com cor temática do projeto e barra de progresso visual.
       - Tooltip com título, datas (Início -> Prazo), estágio e progresso de subtarefas.
       - Clique na barra dispara `aoClicarProjeto(projeto)`.

3. **Requisitos de Acessibilidade e SonarCloud**:
   - Estrutura semântica com `role="region"` e `aria-label="Linha do tempo de projetos"`.
   - Botões interativos com `aria-label` descritivos e `type="button"`.
   - SVGs com `aria-hidden="true"`.
   - Props tipadas com `Readonly<Props>`.
   - Uso estrito das variáveis CSS `--cor-*`.

---

## 4. Arquitetura de Componentes

```
frontend/src/paginas/projetos/
├── QuadroKanban.tsx          # Visão Kanban
├── ListaProjetos.tsx         # Visão Lista
├── LinhaProjetoLista.tsx     # Linha da Visão Lista
├── TimelineProjetos.tsx      # Visão Linha do Tempo (Roadmap / Gantt)
├── TimelineProjetos.test.tsx # Testes da Visão Linha do Tempo
├── ProjetosPage.tsx          # Página orquestradora com alternador de visões (Kanban | Lista | Linha do Tempo)
```

---

## 5. Plano de Implementação (Fase 2: Linha do Tempo)

1. **Task 5: Testes Unitários de `TimelineProjetos` (TDD - RED)**
   - Testar renderização do cabeçalho temporal com controles de navegação (anterior, hoje, próximo).
   - Testar renderização dos projetos na barra lateral e suas respectivas barras temporais.
   - Testar cálculo e posicionamento da barra com prazo e sem prazo.
   - Testar clique no projeto para edição.
   - Testar alternância de escala (Mês / Trimestre).
   - Testar estado vazio quando não há projetos.
2. **Task 6: Implementação do Componente `TimelineProjetos` (GREEN)**
   - Criar `frontend/src/paginas/projetos/TimelineProjetos.tsx`.
   - Implementar cálculo matemático de porcentagens/posicionamento no grid de tempo relativo ao período ativo.
   - Implementar barras com cores temáticas do Aprumo e progresso.
   - Testar e confirmar aprovação dos testes unitários.
3. **Task 7: Integração na `ProjetosPage.tsx`**
   - Habilitar aba "Linha do Tempo" no alternador de abas da `ProjetosPage`.
   - Renderizar `TimelineProjetos` quando `visao === 'timeline'`.
   - Atualizar testes de `ProjetosPage.test.tsx` cobrindo a alternância para a visão Linha do Tempo.
4. **Task 8: Validação Completa, Regressão e Pull Request da Fase 2**
   - Executar suíte completa do frontend (`npm test -- --run`).
   - Executar build de produção (`npm run build`).
   - Abrir Pull Request e validar checks de CI e SonarCloud.
