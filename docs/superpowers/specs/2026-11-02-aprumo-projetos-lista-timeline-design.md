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

## 3. Arquitetura de Componentes

```
frontend/src/paginas/projetos/
├── ListaProjetos.tsx         # Componente principal da Visão Lista (acordeões por estágio)
├── LinhaProjetoLista.tsx     # Linha da tabela com ações, subtarefas expansíveis e dropdown
├── ListaProjetos.test.tsx    # Testes unitários de renderização, expansão, troca de estágio e subtarefas
├── ProjetosPage.tsx          # Integração da aba 'lista' no alternador de abas
```

---

## 4. Plano de Implementação (Fase 1: Lista)

1. **Task 1: Testes Unitários de `ListaProjetos` e `LinhaProjetoLista` (TDD - RED)**
   - Criar `ListaProjetos.test.tsx` cobrindo agrupamento por estágio, colapso de acordeão, clique no título para editar, alteração de estágio pelo select inline e expansão/conclusão de subtarefas.
2. **Task 2: Implementação dos Componentes da Visão Lista (GREEN)**
   - Desenvolver `LinhaProjetoLista.tsx` e `ListaProjetos.tsx` seguindo fielmente os tokens do Aprumo.
3. **Task 3: Integração na `ProjetosPage.tsx`**
   - Habilitar aba "Lista" no seletor de abas, renderizando `ListaProjetos` quando `visao === 'lista'`.
4. **Task 4: Validação de Qualidade e Conformidade**
   - Rodar suíte completa de testes do frontend (`vitest run`).
   - Validar build de produção (`tsc -b && vite build`).
   - Verificar ausência de code smells ou violações de Sonar.
