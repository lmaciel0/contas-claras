# Aprumo: Módulo de Projetos e Quadro Kanban Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o Módulo de Projetos e Quadro Kanban no Aprumo, composto por banco de dados Flyway, backend Spring Boot com isolamento estrito de usuário e APIs REST, e frontend React 19 com Quadro Kanban arrastável, subtarefas e mutações otimistas.

**Architecture:** O backend adota o padrão de arquitetura em camadas do Aprumo com PostgreSQL e Flyway (migration `V7`), entidades JPA isoladas por usuário (`usuario_id`), records como DTOs validados e reordenação transacional de estágios. O frontend utiliza React 19 com TanStack Query 5 para mutações otimistas, drag-and-drop nativo HTML5/Pointer acessível por teclado, barra de progresso calculada em tempo real por subtarefas e tokens de design compatíveis com tema Claro e Escuro Obsidian.

**Tech Stack:** Java 21, Spring Boot 4, PostgreSQL, Flyway, Hibernate/JPA, Testcontainers, React 19, TypeScript, TanStack Query 5, Tailwind CSS, Vitest, MSW, Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-02-aprumo-kanban-projetos-design.md`

## Global Constraints
- Todo acesso a dados no backend deve filtrar pelo `usuarioLogado.getId()`; recursos inexistentes ou de outro usuário respondem com status `404 Not Found`.
- Todas as operações em mutations de projetos e subtarefas devem ser transacionais (`@Transactional`).
- O frontend deve usar exclusivamente tokens semânticos `--cor-*` para garantir suporte impecável a tema Claro e Escuro Obsidian.
- Acessibilidade obrigatória (WAI-ARIA, suporte completo a teclado via menus nos cards, alvos de toque mínimos `min-h-11`, respeito a `prefers-reduced-motion`).
- Todo comando frontend com Node deve usar o path do Node 22 (`export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH"`).

## Review Focus
1. **Tentativa de manipular projeto ou subtarefa de outro usuário**: Deve retornar estritamente `404 Not Found` (nunca 403, 500 ou vazar existência).
2. **Reordenação com índices repetidos ou saltados**: O serviço de movimentação de estágio deve normalizar ordens sequenciais `0..N-1` de forma transacional.
3. **Cálculo de progresso com 0 subtarefas**: Deve retornar `100%` quando o estágio for `CONCLUIDO` e `0%` para os demais estágios.
4. **Submissão com caracteres invisíveis ou título em branco**: Bean validation deve rejeitar com `400 Bad Request`.
5. **Falha de rede durante drag & drop no frontend**: A mutação otimista do TanStack Query deve restaurar o card na coluna original com notificação amigável.

---

### Task 1: Migration Flyway V7 e Entidades de Domínio com Testes Unitários

**Files:**
- Create: `backend/src/main/resources/db/migration/V7__projeto_kanban.sql`
- Create: `backend/src/main/java/dev/lmaciel/contasclaras/projeto/EstagioProjeto.java`
- Create: `backend/src/main/java/dev/lmaciel/contasclaras/projeto/PrioridadeProjeto.java`
- Create: `backend/src/main/java/dev/lmaciel/contasclaras/projeto/CorProjeto.java`
- Create: `backend/src/main/java/dev/lmaciel/contasclaras/projeto/Projeto.java`
- Create: `backend/src/main/java/dev/lmaciel/contasclaras/projeto/ProjetoSubtarefa.java`
- Test: `backend/src/test/java/dev/lmaciel/contasclaras/projeto/ProjetoTest.java`

**Interfaces:**
- Consumes: Entidade `Usuario` existente em `dev.lmaciel.contasclaras.usuario.Usuario`
- Produces: `Projeto`, `ProjetoSubtarefa`, enums `EstagioProjeto`, `PrioridadeProjeto`, `CorProjeto` e método de domínio `calcularProgresso()`

- [ ] **Step 1: Escrever teste de unidade para regras de domínio do Projeto**

Criar `backend/src/test/java/dev/lmaciel/contasclaras/projeto/ProjetoTest.java` testando:
1. Cálculo de progresso com 0 subtarefas em estágio `A_FAZER` (esperado: 0%).
2. Cálculo de progresso com 0 subtarefas em estágio `CONCLUIDO` (esperado: 100%).
3. Cálculo de progresso com 2 subtarefas concluídas de 4 totais (esperado: 50%).
4. Validação de atualização de estágio e ordem.

- [ ] **Step 2: Executar teste para verificar falha (RED)**

Run: `cd backend && ./mvnw test -Dtest=ProjetoTest`
Expected: FAIL (classes ainda não criadas)

- [ ] **Step 3: Implementar Migration V7, Enums e Entidades JPA (GREEN)**

1. Escrever `V7__projeto_kanban.sql` com tabelas `projeto` e `projeto_subtarefa` conforme o spec.
2. Criar `EstagioProjeto` (`A_FAZER`, `EM_ANDAMENTO`, `EM_REVISAO`, `CONCLUIDO`).
3. Criar `PrioridadeProjeto` (`BAIXA`, `MEDIA`, `ALTA`, `URGENTE`).
4. Criar `CorProjeto` (`azul`, `esmeralda`, `indigo`, `ambar`, `rosa`, `roxo`).
5. Criar `Projeto` com campos mapeados, relacionamento `@OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)` com `ProjetoSubtarefa` e método `calcularPorcentagemProgresso()`.
6. Criar `ProjetoSubtarefa` com campos `titulo`, `concluida`, `ordem`.

- [ ] **Step 4: Executar testes de unidade e validação**

Run: `cd backend && ./mvnw test -Dtest=ProjetoTest`
Expected: PASS (4/4 testes aprovados)

- [ ] **Step 5: Commit**

Run:
```bash
git add backend/src/main/resources/db/migration/V7__projeto_kanban.sql backend/src/main/java/dev/lmaciel/contasclaras/projeto/ backend/src/test/java/dev/lmaciel/contasclaras/projeto/ProjetoTest.java
git commit -m "feat(projeto): criar migration V7, enums e entidades de dominio do projeto"
```

---

### Task 2: DTOs e Repositórios Spring Data com Isolamento por Usuário

**Files:**
- Create: `backend/src/main/java/dev/lmaciel/contasclaras/projeto/dto/ProjetoResposta.java`
- Create: `backend/src/main/java/dev/lmaciel/contasclaras/projeto/dto/ProjetoCriacaoRequisicao.java`
- Create: `backend/src/main/java/dev/lmaciel/contasclaras/projeto/dto/ProjetoEdicaoRequisicao.java`
- Create: `backend/src/main/java/dev/lmaciel/contasclaras/projeto/dto/ProjetoMoverEstagioRequisicao.java`
- Create: `backend/src/main/java/dev/lmaciel/contasclaras/projeto/dto/SubtarefaResposta.java`
- Create: `backend/src/main/java/dev/lmaciel/contasclaras/projeto/dto/SubtarefaCriacaoRequisicao.java`
- Create: `backend/src/main/java/dev/lmaciel/contasclaras/projeto/ProjetoRepository.java`
- Create: `backend/src/main/java/dev/lmaciel/contasclaras/projeto/ProjetoSubtarefaRepository.java`
- Test: `backend/src/test/java/dev/lmaciel/contasclaras/projeto/ProjetoRepositoryTest.java`

**Interfaces:**
- Consumes: Entidades de Task 1
- Produces: Contratos DTO imutáveis (Records) com Bean Validation e Repositories com queries filtradas por `usuario_id`

- [ ] **Step 1: Escrever teste de unidade/integração para os Repositórios**

Criar `backend/src/test/java/dev/lmaciel/contasclaras/projeto/ProjetoRepositoryTest.java` validando:
1. `findByUsuarioIdOrderByEstagioAscOrdemAscCriadoEmDesc` traz apenas projetos daquele usuário.
2. Contagem por estágio para reordenação.
3. Busca por subtarefas filtrada pelo projeto.

- [ ] **Step 2: Executar teste para verificar falha (RED)**

Run: `cd backend && ./mvnw test -Dtest=ProjetoRepositoryTest`
Expected: FAIL (DTOs e interfaces de repositório inexistentes)

- [ ] **Step 3: Implementar Records DTOs e Repositories (GREEN)**

1. Implementar DTOs com `@NotBlank`, `@Size`, enums e construtores de fábrica a partir da entidade `Projeto`.
2. Implementar `ProjetoRepository` estendendo `JpaRepository<Projeto, Long>` com métodos filtrados por `usuario.id`.
3. Implementar `ProjetoSubtarefaRepository` estendendo `JpaRepository<ProjetoSubtarefa, Long>`.

- [ ] **Step 4: Executar testes para verificar sucesso**

Run: `cd backend && ./mvnw test -Dtest=ProjetoRepositoryTest`
Expected: PASS

- [ ] **Step 5: Commit**

Run:
```bash
git add backend/src/main/java/dev/lmaciel/contasclaras/projeto/dto/ backend/src/main/java/dev/lmaciel/contasclaras/projeto/*Repository.java backend/src/test/java/dev/lmaciel/contasclaras/projeto/ProjetoRepositoryTest.java
git commit -m "feat(projeto): adicionar DTOs imutaveis e repositorios Spring Data"
```

---

### Task 3: Service e Controller REST com Testes de Integração Completos

**Files:**
- Create: `backend/src/main/java/dev/lmaciel/contasclaras/projeto/ProjetoService.java`
- Create: `backend/src/main/java/dev/lmaciel/contasclaras/projeto/ProjetoController.java`
- Test: `backend/src/test/java/dev/lmaciel/contasclaras/projeto/ProjetoControllerTest.java`

**Interfaces:**
- Consumes: Repositories e DTOs de Task 2
- Produces: APIs REST em `/api/projetos` completas com isolamento seguro

- [ ] **Step 1: Escrever testes de integração em `ProjetoControllerTest`**

Criar `backend/src/test/java/dev/lmaciel/contasclaras/projeto/ProjetoControllerTest.java` estendendo `IntegracaoTest` cobrindo:
1. `GET /api/projetos` lista projetos do usuário logado e não expõe projetos de outros usuários.
2. `POST /api/projetos` cria com subtarefas em lote e retorna `201 Created`.
3. `PUT /api/projetos/{id}` atualiza campos e responde `200 OK`.
4. `PATCH /api/projetos/{id}/estagio` altera estágio e reordena transacionalmente.
5. `POST /api/projetos/{id}/subtarefas` adiciona subtarefa e recalcula progresso.
6. `PATCH /api/projetos/{id}/subtarefas/{subId}/alternar` inverte status da subtarefa e recalcula percentual.
7. `DELETE /api/projetos/{id}` exclui em cascata.
8. Tentativa de acessar ou alterar projeto alheio responde `404 Not Found`.

- [ ] **Step 2: Executar testes de integração para verificar falha (RED)**

Run: `cd backend && ./mvnw test -Dtest=ProjetoControllerTest`
Expected: FAIL (Controller e Service ainda não implementados)

- [ ] **Step 3: Implementar `ProjetoService` e `ProjetoController` (GREEN)**

1. Implementar `ProjetoService` com `@Transactional(readOnly = true)` e `@Transactional` em métodos de escrita. Implementar reordenação segura ao mover cards.
2. Implementar `ProjetoController` com `@RestController`, `@RequestMapping("/api/projetos")`, `@AuthenticationPrincipal Usuario usuarioLogado`.

- [ ] **Step 4: Executar testes de integração para verificar aprovação**

Run: `cd backend && ./mvnw test -Dtest=ProjetoControllerTest`
Expected: PASS (todos os 8 cenários aprovados)

- [ ] **Step 5: Commit**

Run:
```bash
git add backend/src/main/java/dev/lmaciel/contasclaras/projeto/ProjetoService.java backend/src/main/java/dev/lmaciel/contasclaras/projeto/ProjetoController.java backend/src/test/java/dev/lmaciel/contasclaras/projeto/ProjetoControllerTest.java
git commit -m "feat(projeto): implementar service e controller REST com testes de integracao"
```

---

### Task 4: Tipos TypeScript e Cliente de API com Handlers MSW

**Files:**
- Create: `frontend/src/paginas/projetos/tipos.ts`
- Create: `frontend/src/paginas/projetos/projetosApi.ts`
- Create: `frontend/src/mocks/handlers/projetosHandlers.ts`
- Modify: `frontend/src/mocks/handlers.ts`
- Test: `frontend/src/paginas/projetos/projetosApi.test.ts`

**Interfaces:**
- Consumes: Contratos JSON do backend da Task 3
- Produces: Tipos TypeScript e funções de requisição tipadas (`listarProjetos`, `criarProjeto`, `moverEstagioProjeto`, etc.)

- [ ] **Step 1: Escrever teste de unidade para o cliente de API**

Criar `frontend/src/paginas/projetos/projetosApi.test.ts` testando chamadas HTTP tipadas.

- [ ] **Step 2: Executar teste para verificar falha (RED)**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH" && npm --prefix frontend test -- src/paginas/projetos/projetosApi.test.ts --run`
Expected: FAIL (módulos inexistentes)

- [ ] **Step 3: Implementar Tipos, Cliente de API e Handlers MSW (GREEN)**

1. Criar `tipos.ts` com interfaces `Projeto`, `Subtarefa`, `EstagioProjeto`, `PrioridadeProjeto`, `CorProjeto`.
2. Criar `projetosApi.ts` com funções `fetch` tipadas e tratamento de erros.
3. Criar `projetosHandlers.ts` no MSW simulando o backend e registrar em `handlers.ts`.

- [ ] **Step 4: Executar testes de unidade**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH" && npm --prefix frontend test -- src/paginas/projetos/projetosApi.test.ts --run`
Expected: PASS

- [ ] **Step 5: Commit**

Run:
```bash
git add frontend/src/paginas/projetos/tipos.ts frontend/src/paginas/projetos/projetosApi.ts frontend/src/mocks/handlers/projetosHandlers.ts frontend/src/mocks/handlers.ts frontend/src/paginas/projetos/projetosApi.test.ts
git commit -m "feat(projetos): adicionar tipos, api client e handlers MSW"
```

---

### Task 5: Hooks Reativos e Mutações Otimistas (`useProjetos`)

**Files:**
- Create: `frontend/src/paginas/projetos/useProjetos.ts`
- Test: `frontend/src/paginas/projetos/useProjetos.test.tsx`

**Interfaces:**
- Consumes: `projetosApi.ts` de Task 4
- Produces: Hook `useProjetos` com query e mutations (`moverEstagio`, `criarProjeto`, `atualizarProjeto`, `alternarSubtarefa`, `excluirProjeto`) com atualização otimista da UI

- [ ] **Step 1: Escrever teste de hook para mutação otimista**

Criar `frontend/src/paginas/projetos/useProjetos.test.tsx` testando:
1. Listagem de projetos através do TanStack Query.
2. Mutação de mover estágio atualiza o cache otimisticamente antes da resposta do servidor.
3. Rollback automático em caso de erro na requisição.

- [ ] **Step 2: Executar teste para verificar falha (RED)**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH" && npm --prefix frontend test -- src/paginas/projetos/useProjetos.test.tsx --run`
Expected: FAIL

- [ ] **Step 3: Implementar `useProjetos.ts` com TanStack Query (GREEN)**

Implementar hook com `useQuery` e `useMutation` com `onMutate`, `onError` e `onSettled` para sincronização em tempo real.

- [ ] **Step 4: Executar testes de hook**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH" && npm --prefix frontend test -- src/paginas/projetos/useProjetos.test.tsx --run`
Expected: PASS

- [ ] **Step 5: Commit**

Run:
```bash
git add frontend/src/paginas/projetos/useProjetos.ts frontend/src/paginas/projetos/useProjetos.test.tsx
git commit -m "feat(projetos): implementar hook reativo useProjetos com mutacoes otimistas"
```

---

### Task 6: Componentes de Card e Coluna Kanban (`CardProjeto` e `ColunaKanban`)

**Files:**
- Create: `frontend/src/paginas/projetos/CardProjeto.tsx`
- Create: `frontend/src/paginas/projetos/ColunaKanban.tsx`
- Test: `frontend/src/paginas/projetos/CardProjeto.test.tsx`
- Test: `frontend/src/paginas/projetos/ColunaKanban.test.tsx`

**Interfaces:**
- Consumes: Tipos de Task 4 e hook de Task 5
- Produces: Componente de card arrastável com barra de progresso, prioridade semântica, cor e dropzone de coluna

- [ ] **Step 1: Escrever testes para CardProjeto e ColunaKanban**

1. `CardProjeto.test.tsx`: renderiza título, barra com porcentagem e contagem `X/Y`, badge de prioridade, prazo e menu acessível para mover via teclado.
2. `ColunaKanban.test.tsx`: exibe título da coluna, contador de itens, botão `+` rápido e reage a eventos dragover/drop.

- [ ] **Step 2: Executar testes para verificar falha (RED)**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH" && npm --prefix frontend test -- src/paginas/projetos/CardProjeto.test.tsx src/paginas/projetos/ColunaKanban.test.tsx --run`
Expected: FAIL

- [ ] **Step 3: Implementar `CardProjeto.tsx` e `ColunaKanban.tsx` (GREEN)**

1. `CardProjeto.tsx`: implementar card com `draggable="true"`, cores de destaque (`azul`, `esmeralda`, `indigo`, etc.), barra animada, badges de prioridade e menu de ações.
2. `ColunaKanban.tsx`: implementar coluna com cabeçalho, badge de contagem, dropzone visual e lista de cards.

- [ ] **Step 4: Executar testes**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH" && npm --prefix frontend test -- src/paginas/projetos/CardProjeto.test.tsx src/paginas/projetos/ColunaKanban.test.tsx --run`
Expected: PASS

- [ ] **Step 5: Commit**

Run:
```bash
git add frontend/src/paginas/projetos/CardProjeto.tsx frontend/src/paginas/projetos/ColunaKanban.tsx frontend/src/paginas/projetos/*.test.tsx
git commit -m "feat(projetos): criar componentes CardProjeto e ColunaKanban com drag and drop nativo"
```

---

### Task 7: Modal de Criação e Edição de Projeto com Gerenciador de Subtarefas (`ProjetoModal`)

**Files:**
- Create: `frontend/src/paginas/projetos/ProjetoModal.tsx`
- Test: `frontend/src/paginas/projetos/ProjetoModal.test.tsx`

**Interfaces:**
- Consumes: Tipos e useProjetos
- Produces: Modal acessível com foco preso, campos completos do projeto e lista dinâmica de subtarefas

- [ ] **Step 1: Escrever testes em `ProjetoModal.test.tsx`**

Testar:
1. Renderização de campos (Título, Descrição, Categoria, Prioridade, Cor, Prazo).
2. Adição de subtarefa via input com tecla `Enter`.
3. Checkbox de alternância de subtarefa recalculando a barra de progresso em tempo real.
4. Remoção de subtarefa da lista.
5. Fechamento acessível com tecla `Escape` e botão Fechar.

- [ ] **Step 2: Executar teste para verificar falha (RED)**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH" && npm --prefix frontend test -- src/paginas/projetos/ProjetoModal.test.tsx --run`
Expected: FAIL

- [ ] **Step 3: Implementar `ProjetoModal.tsx` (GREEN)**

Implementar modal acessível (`role="dialog"`, `aria-modal="true"`), com focus trap, seletores táteis de prioridade e cor, e gerenciador de subtarefas interativo.

- [ ] **Step 4: Executar testes**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH" && npm --prefix frontend test -- src/paginas/projetos/ProjetoModal.test.tsx --run`
Expected: PASS

- [ ] **Step 5: Commit**

Run:
```bash
git add frontend/src/paginas/projetos/ProjetoModal.tsx frontend/src/paginas/projetos/ProjetoModal.test.tsx
git commit -m "feat(projetos): criar modal acessivel de projeto com gerenciador de subtarefas"
```

---

### Task 8: Quadro Kanban Completo, Rota `/projetos` e Integração na Navegação

**Files:**
- Create: `frontend/src/paginas/projetos/QuadroKanban.tsx`
- Create: `frontend/src/paginas/projetos/ProjetosPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/layout/itensMenu.ts`
- Test: `frontend/src/paginas/projetos/ProjetosPage.test.tsx`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: Todos os componentes criados nas tasks 4 a 7
- Produces: Rota `/projetos` ativa no Aprumo com alternador de visões, busca em tempo real e filtros

- [ ] **Step 1: Escrever testes para ProjetosPage e integração de rota**

1. `ProjetosPage.test.tsx`: testa renderização das 4 colunas, busca por texto, filtro de prioridade e abertura do modal.
2. `App.test.tsx`: valida que a rota `/projetos` está registrada e navegável.

- [ ] **Step 2: Executar testes para verificar falha (RED)**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH" && npm --prefix frontend test -- src/paginas/projetos/ProjetosPage.test.tsx --run`
Expected: FAIL

- [ ] **Step 3: Implementar `QuadroKanban.tsx`, `ProjetosPage.tsx` e registrar no `App.tsx` (GREEN)**

1. `QuadroKanban.tsx`: grid horizontal das 4 colunas com rolagem lateral fluida.
2. `ProjetosPage.tsx`: cabeçalho com estatísticas, abas (Quadro ativa, Lista e Timeline com badge "Em breve"), busca, filtro e botão "+ Novo projeto".
3. Registrar rota `/projetos` no `App.tsx` e garantir item correspondente na `DockLateral`.

- [ ] **Step 4: Executar testes**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH" && npm --prefix frontend test -- src/paginas/projetos/ProjetosPage.test.tsx src/App.test.tsx --run`
Expected: PASS

- [ ] **Step 5: Commit**

Run:
```bash
git add frontend/src/paginas/projetos/QuadroKanban.tsx frontend/src/paginas/projetos/ProjetosPage.tsx frontend/src/App.tsx frontend/src/layout/itensMenu.ts frontend/src/paginas/projetos/ProjetosPage.test.tsx frontend/src/App.test.tsx
git commit -m "feat(projetos): integrar ProjetosPage com quadro kanban completo e rota de navegacao"
```

---

### Task 9: Verificação Completa de Regressão, Build e Homologação Final

**Files:**
- N/A (Execução de validações em todo o repositório)

**Interfaces:**
- Consumes: Todo o código frontend e backend desenvolvido nas Tasks 1 a 8
- Produces: Garantia de zero regressão, 100% de testes verdes e build de produção sem erros

- [ ] **Step 1: Executar suíte completa de testes do frontend**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH" && npm --prefix frontend test -- --run`
Expected: PASS (todos os arquivos de teste do frontend aprovados)

- [ ] **Step 2: Executar build e validação de tipos do frontend**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH" && npm --prefix frontend run build`
Expected: PASS (zero erros TypeScript, bundle gerado com sucesso)

- [ ] **Step 3: Executar suíte completa de testes do backend**

Run: `cd backend && ./mvnw test`
Expected: PASS (BUILD SUCCESS com 0 failures e 0 errors)

- [ ] **Step 4: Commit e sincronização final**

Run:
```bash
git status
```
Confirmar que a árvore de trabalho está limpa e registrar no ledger SDD.
