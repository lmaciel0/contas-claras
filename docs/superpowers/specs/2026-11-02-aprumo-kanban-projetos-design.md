# Aprumo: Módulo de Projetos e Quadro Kanban

- **Data**: 2026-11-02
- **Status**: Em revisão
- **Autor**: Antigravity + Usuário
- **Objetivo**: Implementar o Módulo de Projetos do Aprumo com visualização em Quadro Kanban inspirada no design da referência (`WhatsApp Video 2026-10-31 at 15.58.37 (1).mp4`), permitindo gerenciar projetos com 4 estágios padrão, progresso calculado por subtarefas internas, prioridades visuais, prazos e cores de destaque personalizadas com fluidez e drag-and-drop nativo acessível.

---

## 1. Contexto e Motivação

O Aprumo consolidou módulos essenciais para tarefas diárias, notas ricas e gestão financeira. Contudo, iniciativas e objetivos maiores de médio e longo prazo (ex: *"Redesign da Aplicação"*, *"Planejamento de Viagem"*, *"Certificação Java"*) exigem uma visão estruturada em pipeline.

A referência fornecida pelo usuário demonstra uma interface contemporânea inspirada em ferramentas de alto nível (Maydin, Linear, Notion), com:
1. Barra superior com seletor de visualizações (**Quadro / Board**, **Lista / List**, **Linha do Tempo / Timeline**) e métricas do pipeline (*X projetos em 4 estágios*).
2. Quadro Kanban limpo e tátil com 4 estágios essenciais: **A Fazer**, **Em Andamento**, **Em Revisão** e **Concluído**.
3. Cards com categoria/tag, título, descrição resumida, barra de progresso visual (`%` e contagem `X/Y subtarefas`), badge de prioridade colorida, prazos e cor de destaque personalizada.
4. Transições instantâneas entre estágios com excelente resposta tátil.

Nesta primeira entrega, o foco está na visualização principal em **Quadro Kanban (Board)** completa e funcional, preparando o alicerce para as visões complementares (Lista e Linha do Tempo) nas fases seguintes.

---

## 2. Metas e Não-Metas

### Metas (In-Scope)
- **Persistência Segura e Isolamento Multiusuário**:
  - Nova migration Flyway `V7__projeto_kanban.sql` com tabelas `projeto` e `projeto_subtarefa`.
  - Isolamento estrito por usuário (`usuario_id`) em todas as operações; tentativas de acesso a dados de outros usuários respondem `404 Not Found`.
- **Backend Spring Boot**:
  - Pacote `dev.lmaciel.aprumo.projeto` com Controller, Service, Repository, Entidades JPA e Records DTOs validados.
  - Endpoints REST completos para CRUD de projetos, movimentação transacional entre estágios (`PATCH /api/projetos/{id}/estagio`) e controle de subtarefas.
  - Cálculo dinâmico de progresso no backend (`porcentagemProgresso`, `totalSubtarefas`, `subtarefasConcluidas`).
- **Frontend React 19 + TypeScript**:
  - Rota `/projetos` integrada ao `AppShell` e acessível pelo botão correspondente na `DockLateral`.
  - Página `ProjetosPage` com cabeçalho de status, busca por texto em tempo real, filtro por prioridade e seletor de visualizações (Quadro ativo, Lista e Timeline com badges "Em breve").
  - `QuadroKanban` com 4 colunas horizontais (`A Fazer`, `Em Andamento`, `Em Revisão`, `Concluído`).
  - `CardProjeto` com barra de progresso fluida, contagem de subtarefas, tag de prioridade semântica (`Urgente`, `Alta`, `Média`, `Baixa`), prazo formatado e cor de destaque personalizada.
  - `ProjetoModal` para criação e edição com gerenciador de subtarefas interativo (adicionar com `Enter`, alternar checkbox com atualização de progresso em tempo real, remover item).
- **Interação, Drag & Drop e Acessibilidade**:
  - Drag and drop nativo HTML5/Pointer com área dropzone destacada e mutações otimistas via TanStack Query (movimento instantâneo sem atraso de rede).
  - Acessibilidade WAI-ARIA: suporte total a navegação por teclado (menu do card para "Mover para...", `role="dialog"`, foco preso no modal).
  - Compatibilidade com temas Claro e Escuro (Obsidian `#0b0d13`).

### Não-Metas (Out-of-Scope)
- Visão de Linha do Tempo (Gantt) e Visão em Tabela Agrupada (Lista) nesta primeira entrega (permanecem visíveis como abas no cabeçalho com badge "Em breve").
- Integração bidirecional automática de subtarefas com o módulo global `/tarefas` (subtarefas são mantidas internamente no projeto).
- Upload ou anexação de arquivos e imagens aos projetos.

---

## 3. Modelo de Dados e Banco de Dados (PostgreSQL)

Arquivo de migração: `backend/src/main/resources/db/migration/V7__projeto_kanban.sql`

```sql
-- Tabela principal de projetos
CREATE TABLE projeto (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    titulo VARCHAR(150) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(50),
    estagio VARCHAR(20) NOT NULL DEFAULT 'A_FAZER',
    prioridade VARCHAR(20) NOT NULL DEFAULT 'MEDIA',
    cor VARCHAR(20) NOT NULL DEFAULT 'azul',
    ordem INTEGER NOT NULL DEFAULT 0,
    prazo DATE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_projeto_estagio CHECK (estagio IN ('A_FAZER', 'EM_ANDAMENTO', 'EM_REVISAO', 'CONCLUIDO')),
    CONSTRAINT ck_projeto_prioridade CHECK (prioridade IN ('BAIXA', 'MEDIA', 'ALTA', 'URGENTE')),
    CONSTRAINT ck_projeto_cor CHECK (cor IN ('azul', 'esmeralda', 'indigo', 'ambar', 'rosa', 'roxo'))
);

CREATE INDEX idx_projeto_usuario_estagio ON projeto(usuario_id, estagio, ordem);

-- Tabela de subtarefas internas do projeto
CREATE TABLE projeto_subtarefa (
    id BIGSERIAL PRIMARY KEY,
    projeto_id BIGINT NOT NULL REFERENCES projeto(id) ON DELETE CASCADE,
    titulo VARCHAR(200) NOT NULL,
    concluida BOOLEAN NOT NULL DEFAULT FALSE,
    ordem INTEGER NOT NULL DEFAULT 0,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subtarefa_projeto ON projeto_subtarefa(projeto_id, ordem);
```

### Regras de Domínio e Cálculo de Progresso
- **Estágios**:
  - `A_FAZER`: Não iniciado.
  - `EM_ANDAMENTO`: Em execução ativa.
  - `EM_REVISAO`: Aguardando validação ou revisão.
  - `CONCLUIDO`: Finalizado.
- **Progresso**:
  - `totalSubtarefas`: quantidade total de subtarefas vinculadas.
  - `subtarefasConcluidas`: quantidade com `concluida = true`.
  - `porcentagemProgresso`:
    - Se `totalSubtarefas > 0`: `Math.round((subtarefasConcluidas / totalSubtarefas) * 100)`.
    - Se `totalSubtarefas == 0` e `estagio == CONCLUIDO`: `100`.
    - Se `totalSubtarefas == 0` e `estagio != CONCLUIDO`: `0`.

---

## 4. Contratos de API REST (Backend)

Todos os endpoints residem sob o prefixo `/api/projetos` e requerem autenticação (`@AuthenticationPrincipal Usuario usuarioLogado`).

### 4.1 `GET /api/projetos`
Retorna todos os projetos do usuário logado ordenados por estágio e ordem. Suporta parâmetros opcionais de consulta:
- `busca`: filtra por título, descrição ou categoria (case-insensitive).
- `prioridade`: filtra por prioridade específica (`BAIXA`, `MEDIA`, etc.).

**Resposta (`200 OK`)**:
```json
[
  {
    "id": 1,
    "titulo": "Redesign da Interface",
    "descricao": "Adicionar dock flutuante e tema obsidian",
    "categoria": "Frontend",
    "estagio": "EM_ANDAMENTO",
    "prioridade": "ALTA",
    "cor": "azul",
    "ordem": 0,
    "prazo": "2026-11-20",
    "porcentagemProgresso": 45,
    "totalSubtarefas": 20,
    "subtarefasConcluidas": 9,
    "subtarefas": [
      { "id": 101, "titulo": "Mapear tokens", "concluida": true, "ordem": 0 },
      { "id": 102, "titulo": "Construir dock", "concluida": false, "ordem": 1 }
    ],
    "criadoEm": "2026-11-02T10:00:00Z"
  }
]
```

### 4.2 `POST /api/projetos`
Cria um novo projeto. Se `ordem` não for enviada, posiciona no fim da coluna especificada.

**Corpo da Requisição**:
```json
{
  "titulo": "Implementar Quadro Kanban",
  "descricao": "Visão com colunas arrastáveis",
  "categoria": "Produto",
  "estagio": "A_FAZER",
  "prioridade": "URGENTE",
  "cor": "esmeralda",
  "prazo": "2026-11-15",
  "subtarefas": ["Criar migration", "Implementar APIs", "Montar UI"]
}
```

### 4.3 `PUT /api/projetos/{id}`
Atualiza metadados do projeto (título, descrição, categoria, prioridade, cor, prazo).

### 4.4 `PATCH /api/projetos/{id}/estagio`
Move o projeto entre colunas ou altera sua posição na mesma coluna.

**Corpo da Requisição**:
```json
{
  "estagio": "EM_ANDAMENTO",
  "novaOrdem": 1
}
```
*Operação Transacional*: Ajusta sequencialmente as ordens dos demais projetos afetados na coluna de origem e na coluna de destino para manter integridade contínua.

### 4.5 `DELETE /api/projetos/{id}`
Exclui o projeto e todas as subtarefas associadas (`204 No Content`).

### 4.6 Subtarefas
- `POST /api/projetos/{id}/subtarefas`: `{"titulo": "Nova subtarefa"}` (`201 Created`).
- `PATCH /api/projetos/{id}/subtarefas/{subtarefaId}/alternar`: Inverte o estado de `concluida` e recalcula progresso (`200 OK`).
- `DELETE /api/projetos/{id}/subtarefas/{subtarefaId}`: Remove a subtarefa (`204 No Content`).

---

## 5. Arquitetura de Frontend e Componentes React

Os componentes serão implementados em `frontend/src/paginas/projetos/`:

```
frontend/src/paginas/projetos/
├── ProjetosPage.tsx                # Rota /projetos, barra de ferramentas e controle de abas
├── QuadroKanban.tsx                # Grid horizontal com as 4 colunas Kanban
├── ColunaKanban.tsx                # Cabeçalho da coluna, badge de contagem e dropzone
├── CardProjeto.tsx                 # Card tátil com progresso, prioridade, cor e menu acessível
├── ProjetoModal.tsx                # Modal para criação e edição completa com subtarefas
├── tipos.ts                        # Interfaces TypeScript (Projeto, Subtarefa, Estagio, etc.)
├── useProjetos.ts                  # Hook de consulta com TanStack Query
└── mutacoesProjeto.ts              # Mutações otimistas (troca de estágio, criação, edição)
```

### 5.1 Design Visual e Paleta de Cores do Card
Cores de destaque pré-configuradas para os cards:
- `azul`: `--cor-principal` / `bg-blue-500/10 text-blue-500 border-blue-500/20`
- `esmeralda`: `bg-emerald-500/10 text-emerald-500 border-emerald-500/20`
- `indigo`: `bg-indigo-500/10 text-indigo-500 border-indigo-500/20`
- `ambar`: `bg-amber-500/10 text-amber-500 border-amber-500/20`
- `rosa`: `bg-rose-500/10 text-rose-500 border-rose-500/20`
- `roxo`: `bg-purple-500/10 text-purple-500 border-purple-500/20`

Badges de Prioridade:
- `URGENTE`: Fundo avermelhado sutil com texto vermelho (`Urgente`).
- `ALTA`: Fundo alaranjado com texto laranja (`Alta`).
- `MEDIA`: Fundo amarelado/âmbar com texto neutro (`Média`).
- `BAIXA`: Fundo neutro/azul suave com texto mutado (`Baixa`).

Barra de Progresso:
- Trilho de fundo sutil (`bg-zinc-200 dark:bg-zinc-800`), preenchimento animado com transição de 300ms, exibindo texto resumido ao lado (ex: `45% · 9/20`).

---

## 6. Acessibilidade e Fluidez (WCAG AA)

1. **Drag & Drop Nativo com Fallback por Teclado**:
   - Cada card possui atributo `draggable="true"`. Ao arrastar, classes visuais (`opacity-50`, escala suave) indicam o estado ativo.
   - Colunas escutam `onDragOver`, `onDragEnter`, `onDragLeave` e `onDrop`, desenhando um indicador visual (*drop placeholder*) translúcido.
   - Para usuários que utilizam apenas o teclado ou leitores de tela: cada card possui um menu de opções (`aria-haspopup="menu"`) com ações diretas: *"Mover para A Fazer"*, *"Mover para Em Andamento"*, *"Mover para Em Revisão"*, *"Mover para Concluído"*.
2. **Modal Acessível**:
   - `role="dialog"`, `aria-modal="true"`, `aria-labelledby="titulo-modal-projeto"`.
   - Foco preso (*focus trap*), tecla `Escape` fecha e clique no backdrop fecha.
3. **Respeito ao Sistema**:
   - Todas as transições respeitam `prefers-reduced-motion`.
   - Contrastes em modo claro e modo escuro obsidian rigorosamente superiores a 4,5:1.

---

## 7. Estratégia de Testes e Homologação (TDD)

### 7.1 Backend (Java / Spring Boot)
- Testes unitários para regras de domínio em `ProjetoTest` (reordenação, cálculo de progresso).
- Testes de integração em `ProjetoControllerTest` estendendo `IntegracaoTest` (Testcontainers PostgreSQL):
  - Listagem com isolamento: usuário A não enxerga projetos de usuário B.
  - Criação de projeto com subtarefas em lote.
  - Movimentação entre estágios com reordenação correta de índices.
  - Alternância de conclusão de subtarefas e validação do recálculo de progresso.
  - Exclusão com limpeza em cascata de subtarefas.

### 7.2 Frontend (React / Vitest)
- Testes em `ProjetosPage.test.tsx`:
  - Renderização das 4 colunas com os respectivos cards retornados pelo mock MSW.
  - Filtro em tempo real por campo de busca e por prioridade.
  - Abertura do modal de criação e submissão bem-sucedida com mutação otimista.
- Testes em `CardProjeto.test.tsx`:
  - Renderização correta de percentual, barra de progresso, badge de prioridade e prazo.
  - Movimentação de coluna via menu acessível de teclado.
- Testes em `ProjetoModal.test.tsx`:
  - Inclusão interativa de subtarefas, clique nos checkboxes e fechamento com `Escape`.

---

## 8. Critérios de Conclusão e Próximos Passos
- Todas as migrations executadas com sucesso.
- 100% dos testes do frontend e backend aprovados.
- Build do frontend (`tsc -b && vite build`) concluído com zero erros.
- Documento aprovado pelo usuário para posterior geração do plano executável de tarefas (`docs/superpowers/plans/2026-11-02-aprumo-kanban-projetos.md`).
