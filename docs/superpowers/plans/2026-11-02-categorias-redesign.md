# Aprumo: Redesign do Módulo de Categorias e Subcategorias Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernizar o Módulo de Categorias do Aprumo, implementando suporte a Ícone e Cor persistidos no banco de dados, API REST atualizada com validações, e frontend React 19 baseado em Tabela Hierárquica (Tree Table), com seletor de tipo (Despesas vs Receitas), ações em linha (Relatórios, Edição, Arquivamento, Adição de Subcategoria) e modal de cadastro ágil com paleta e catálogo de ícones.

**Architecture:** O backend adota o padrão em camadas do Spring Boot 3 e PostgreSQL com Flyway (migration `V11`), adicionando colunas `icone` e `cor` na entidade `Categoria`, isoladas por usuário (`usuario_id`), com DTOs validados via Jakarta Validation. O frontend utiliza React 19 e TanStack Query 5 para gerenciamento de estado e cache, apresentando uma tabela semântica responsiva com navegação por teclado, hierarquia visual com prefixo `↳`, atalho contextual para `/relatorios`, e seletores visuais acessíveis (WCAG AA) para temas Claro e Escuro Obsidian.

**Tech Stack:** Java 21, Spring Boot 3/4, PostgreSQL, Flyway, Hibernate/JPA, Testcontainers, React 19, TypeScript, TanStack Query 5, Tailwind CSS, Lucide Icons, Vitest, MSW, Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-02-categorias-redesign.md`

## Global Constraints
- Todo acesso a dados no backend deve filtrar pelo `usuarioLogado.getId()`; recursos inexistentes ou pertencentes a outro usuário respondem estritamente com `404 Not Found`.
- Todas as operações em mutations de categorias e itens devem ser transacionais (`@Transactional`).
- O frontend deve usar exclusivamente tokens semânticos `--cor-*` para garantir suporte impecável a tema Claro e Escuro Obsidian.
- Acessibilidade obrigatória (WAI-ARIA, suporte completo a navegação por teclado, tooltips acessíveis, alvos de toque mínimos `min-h-11`).
- Todo comando frontend com Node deve usar o path do Node 22 (`export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH"`).

## Review Focus
1. **Persistência de Ícone e Cor com valores nulos ou em branco**: Se não informados ou vazios, devem assumir defaults elegantes (`icone = 'outros'`, `cor = '#7d7a99'`) sem disparar erro 500.
2. **Isolamento Multiusuário**: Usuário A não pode visualizar, editar nem renomear categorias de Usuário B.
3. **Alternância entre Despesas e Receitas**: A troca no dropdown em pílula deve filtrar instantaneamente as categorias correspondentes sem perder o foco ou o estado da tabela.
4. **Comportamento do botão "SALVAR E CRIAR NOVA"**: Deve persistir com sucesso a categoria no backend, invalidar a query do cache e redefinir os campos do formulário mantendo o modal aberto e com foco no campo `Nome`.
5. **Herança visual de cor para Subcategorias**: A linha da subcategoria (`↳`) deve exibir visualmente a mesma cor configurada na sua categoria pai.

---

### Task 1: Migration Flyway V11 e Atualização do Domínio Categoria (Backend)

**Files:**
- Create: `backend/src/main/resources/db/migration/V11__categoria_icone_cor.sql`
- Modify: `backend/src/main/java/dev/lmaciel/aprumo/categoria/Categoria.java`
- Modify: `backend/src/main/java/dev/lmaciel/aprumo/categoria/CategoriasPadrao.java`
- Create: `backend/src/test/java/dev/lmaciel/aprumo/categoria/CategoriaTest.java`

**Interfaces:**
- Consumes: Entidade `Usuario` existente em `dev.lmaciel.aprumo.usuario.Usuario`
- Produces: `Categoria` com campos `icone` e `cor`, construtor estendido e método `atualizar(nome, icone, cor)`

- [ ] **Step 1: Escrever teste de unidade para a entidade Categoria**

Criar `backend/src/test/java/dev/lmaciel/aprumo/categoria/CategoriaTest.java` validando:
1. Construtor com `icone` e `cor` define valores corretamente.
2. Construtor padrão/fallback atribui defaults quando `icone` ou `cor` são nulos/em branco.
3. Método `atualizar(nome, icone, cor)` atualiza os valores corretamente e limpa espaços vazios.

- [ ] **Step 2: Executar teste para verificar falha (RED)**

Run: `cd backend && ./mvnw test -Dtest=CategoriaTest`
Expected: FAIL (campos ou métodos ainda não existentes)

- [ ] **Step 3: Implementar Migration V11 e atualizar Categoria e CategoriasPadrao (GREEN)**

1. Criar `V11__categoria_icone_cor.sql` com `ALTER TABLE categoria ADD COLUMN icone VARCHAR(50) NOT NULL DEFAULT 'outros', ADD COLUMN cor VARCHAR(30) NOT NULL DEFAULT '#7d7a99';` e updates das categorias padrão.
2. Atualizar `Categoria.java` com `@Column(nullable = false, length = 50) private String icone;` e `@Column(nullable = false, length = 30) private String cor;`, getters e método de atualização.
3. Atualizar `CategoriasPadrao.java` para associar ícones e cores temáticas nas categorias criadas por padrão no onboarding.

- [ ] **Step 4: Executar testes de unidade e validação**

Run: `cd backend && ./mvnw test -Dtest=CategoriaTest`
Expected: PASS

- [ ] **Step 5: Commit**

Run:
```bash
git add backend/src/main/resources/db/migration/V11__categoria_icone_cor.sql backend/src/main/java/dev/lmaciel/aprumo/categoria/ backend/src/test/java/dev/lmaciel/aprumo/categoria/CategoriaTest.java
git commit -m "feat(categoria): criar migration V11 e adicionar campos icone e cor na entidade Categoria"
```

---

### Task 2: DTOs e Endpoints REST de Categoria com Ícone e Cor (Backend)

**Files:**
- Modify: `backend/src/main/java/dev/lmaciel/aprumo/categoria/dto/CategoriaRequest.java`
- Modify: `backend/src/main/java/dev/lmaciel/aprumo/categoria/dto/CategoriaResponse.java`
- Modify: `backend/src/main/java/dev/lmaciel/aprumo/categoria/CategoriaService.java`
- Modify: `backend/src/main/java/dev/lmaciel/aprumo/categoria/CategoriaController.java`
- Modify: `backend/src/test/java/dev/lmaciel/aprumo/categoria/CategoriaControllerTest.java`

**Interfaces:**
- Consumes: Entidade `Categoria` da Task 1
- Produces: Endpoints `GET /api/categorias`, `POST /api/categorias` e `PUT /api/categorias/{id}` com `icone` e `cor`

- [ ] **Step 1: Atualizar testes de integração em CategoriaControllerTest para cobrir icone e cor**

Adicionar testes em `CategoriaControllerTest`:
1. `POST /api/categorias` com `nome`, `tipo`, `icone` e `cor` retorna 201 com os novos campos presentes.
2. `PUT /api/categorias/{id}` atualizando `nome`, `icone` e `cor` retorna 200 com os novos campos.
3. `GET /api/categorias` lista categorias contendo `icone` e `cor`.

- [ ] **Step 2: Executar testes para verificar falha (RED)**

Run: `cd backend && ./mvnw test -Dtest=CategoriaControllerTest`
Expected: FAIL

- [ ] **Step 3: Implementar novos campos nos DTOs, Service e Controller (GREEN)**

1. Em `CategoriaRequest.java`: adicionar campos `String icone` e `String cor` com `@Size`.
2. Em `CategoriaResponse.java`: adicionar `String icone` e `String cor`.
3. Em `CategoriaService.java`: repassar `icone` e `cor` na criação e atualização, aplicando defaults se nulos.
4. Em `CategoriaController.java`: mapear requisição e resposta atualizadas.

- [ ] **Step 4: Executar testes para verificar sucesso**

Run: `cd backend && ./mvnw test -Dtest=CategoriaControllerTest`
Expected: PASS

- [ ] **Step 5: Commit**

Run:
```bash
git add backend/src/main/java/dev/lmaciel/aprumo/categoria/ backend/src/test/java/dev/lmaciel/aprumo/categoria/CategoriaControllerTest.java
git commit -m "feat(categoria): expor icone e cor nos DTOs e endpoints REST de categoria"
```

---

### Task 3: Tipos Frontend e Catálogos de Cores e Ícones (Frontend)

**Files:**
- Modify: `frontend/src/api/tipos.ts`
- Create: `frontend/src/paginas/categorias/paletaCores.ts`
- Create: `frontend/src/paginas/categorias/catalogoIcones.tsx`
- Create: `frontend/src/paginas/categorias/paletaCores.test.ts`
- Create: `frontend/src/paginas/categorias/catalogoIcones.test.tsx`

**Interfaces:**
- Consumes: Tipos da API REST
- Produces: `CategoriaResponse` e `CategoriaRequest` com `icone` e `cor`; mapeamentos e renderizadores de ícones Lucide e paleta de cores pré-definidas

- [ ] **Step 1: Escrever testes para os utilitários de cores e catálogo de ícones**

Criar testes:
1. `paletaCores.test.ts`: verifica que a lista de cores contém as cores dos prints (azul, ciano, verde, oliva, amarelo, laranja, vermelho, roxo, cinza) e função para validar ou retornar cor segura.
2. `catalogoIcones.test.tsx`: verifica que cada identificador (ex.: `'livro'`, `'computador'`, `'praia'`, `'restaurante'`, `'saude'`, `'servicos'`, `'supermercado'`, `'transporte'`, `'casa'`, `'salario'`, `'outros'`) renderiza um ícone SVG válido sem erro.

- [ ] **Step 2: Executar testes para verificar falha (RED)**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH" && cd frontend && npm test -- paletaCores catalogoIcones`
Expected: FAIL

- [ ] **Step 3: Implementar contratos em tipos.ts, paletaCores.ts e catalogoIcones.tsx (GREEN)**

1. Em `frontend/src/api/tipos.ts`: atualizar `CategoriaResponse` para incluir `icone: string` e `cor: string`, e `CategoriaRequest` para incluir `icone?: string` e `cor?: string`.
2. Em `paletaCores.ts`: definir array de cores rápidas (com código HEX e nome amigável) e helpers.
3. Em `catalogoIcones.tsx`: mapear identificadores semânticos para ícones Lucide (BookOpen, Monitor, Umbrella, UtensilsCrossed, BriefcaseMedical, ClipboardList, ShoppingCart, Bus, Home, Banknote, TrendingUp, Star, Gift, MoreHorizontal).

- [ ] **Step 4: Executar testes para verificar aprovação**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH" && cd frontend && npm test -- paletaCores catalogoIcones`
Expected: PASS

- [ ] **Step 5: Commit**

Run:
```bash
git add frontend/src/api/tipos.ts frontend/src/paginas/categorias/paletaCores.ts frontend/src/paginas/categorias/catalogoIcones.tsx frontend/src/paginas/categorias/paletaCores.test.ts frontend/src/paginas/categorias/catalogoIcones.test.tsx
git commit -m "feat(frontend): definir tipos de categoria com icone e cor, paleta e catalogo de icones"
```

---

### Task 4: Componentes Seletores de Cor e Ícone (Frontend)

**Files:**
- Create: `frontend/src/paginas/categorias/SeletorCor.tsx`
- Create: `frontend/src/paginas/categorias/SeletorIcone.tsx`
- Create: `frontend/src/paginas/categorias/SeletorCor.test.tsx`
- Create: `frontend/src/paginas/categorias/SeletorIcone.test.tsx`

**Interfaces:**
- Consumes: `paletaCores.ts` e `catalogoIcones.tsx`
- Produces: `<SeletorCor valor={cor} aoMudar={setCor} />` e `<SeletorIcone valor={icone} aoMudar={setIcone} />`

- [ ] **Step 1: Escrever testes para os componentes de seleção visual**

1. `SeletorCor.test.tsx`: renderiza bolinhas de cores, destaca a selecionada com anel/checkmark e dispara `aoMudar` ao clicar; abre modal/input de cor customizada no botão "OUTROS".
2. `SeletorIcone.test.tsx`: renderiza grade de ícones rápidos, destaca o selecionado e permite escolher novos ícones pelo catálogo expandido no botão "OUTROS".

- [ ] **Step 2: Executar testes para verificar falha (RED)**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH" && cd frontend && npm test -- SeletorCor SeletorIcone`
Expected: FAIL

- [ ] **Step 3: Implementar SeletorCor e SeletorIcone (GREEN)**

1. Desenvolver `SeletorCor.tsx` com estilo idêntico ao Print 3 (círculos de cor com checkmark na ativa e botão "OUTROS").
2. Desenvolver `SeletorIcone.tsx` com ícones em círculos neutros e botão "OUTROS" que abre lista com campo de busca.

- [ ] **Step 4: Executar testes para aprovação**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH" && cd frontend && npm test -- SeletorCor SeletorIcone`
Expected: PASS

- [ ] **Step 5: Commit**

Run:
```bash
git add frontend/src/paginas/categorias/SeletorCor.tsx frontend/src/paginas/categorias/SeletorIcone.tsx frontend/src/paginas/categorias/SeletorCor.test.tsx frontend/src/paginas/categorias/SeletorIcone.test.tsx
git commit -m "feat(frontend): criar componentes SeletorCor e SeletorIcone com opcao Outros"
```

---

### Task 5: Modais Renovados de Categoria e Subcategoria (Frontend)

**Files:**
- Modify: `frontend/src/paginas/categorias/EditorCategoria.tsx`
- Modify: `frontend/src/paginas/categorias/EditorItem.tsx`
- Modify: `frontend/src/paginas/categorias/EditorCategoria.test.tsx`
- Modify: `frontend/src/paginas/categorias/EditorItem.test.tsx`

**Interfaces:**
- Consumes: `SeletorCor`, `SeletorIcone` e endpoints de API
- Produces: Modal de criação/edição de categoria com suporte a "SALVAR E CRIAR NOVA" e modal de subcategoria alinhado

- [ ] **Step 1: Escrever testes para os novos fluxos em EditorCategoria.test.tsx**

1. Testar preenchimento de nome, seleção de cor e ícone.
2. Testar clique em "SALVAR E CRIAR NOVA": dispara mutation de criação, mantém modal aberto e reseta o campo nome para novo cadastro.
3. Testar clique em "SALVAR": dispara mutation e fecha o modal.

- [ ] **Step 2: Executar testes para verificar falha (RED)**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH" && cd frontend && npm test -- EditorCategoria`
Expected: FAIL

- [ ] **Step 3: Implementar novos recursos em EditorCategoria.tsx e polimento em EditorItem.tsx (GREEN)**

1. Integrar `SeletorCor` e `SeletorIcone` no formulário de `EditorCategoria.tsx`.
2. Adicionar os botões de ação do rodapé: "SALVAR E CRIAR NOVA" (secundário) e "SALVAR" (primário).
3. Atualizar `EditorItem.tsx` para apresentar visual coeso de subcategoria.

- [ ] **Step 4: Executar testes de modais**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH" && cd frontend && npm test -- EditorCategoria EditorItem`
Expected: PASS

- [ ] **Step 5: Commit**

Run:
```bash
git add frontend/src/paginas/categorias/EditorCategoria.tsx frontend/src/paginas/categorias/EditorItem.tsx frontend/src/paginas/categorias/EditorCategoria.test.tsx frontend/src/paginas/categorias/EditorItem.test.tsx
git commit -m "feat(frontend): atualizar EditorCategoria com seletores de cor, icone e acao salvar e criar nova"
```

---

### Task 6: Componentes da Tabela Hierárquica e Cabeçalho (Frontend)

**Files:**
- Create: `frontend/src/paginas/categorias/CabecalhoCategorias.tsx`
- Create: `frontend/src/paginas/categorias/LinhaCategoria.tsx`
- Create: `frontend/src/paginas/categorias/LinhaSubcategoria.tsx`
- Create: `frontend/src/paginas/categorias/PaginacaoTabela.tsx`
- Create: `frontend/src/paginas/categorias/LinhaCategoria.test.tsx`
- Create: `frontend/src/paginas/categorias/CabecalhoCategorias.test.tsx`

**Interfaces:**
- Consumes: Modelos `CategoriaResponse` e `ItemResponse`
- Produces: Componentes visuais da Tree Table: linha da categoria pai, linha filha com `↳` e cabeçalho com alternador

- [ ] **Step 1: Escrever testes para LinhaCategoria e CabecalhoCategorias**

1. `LinhaCategoria.test.tsx`: valida exibição do ícone, bolinha de cor, botões de ação (Relatório com tooltip, Editar, Arquivar, `+` Nova Subcategoria).
2. `CabecalhoCategorias.test.tsx`: valida exibição da pílula com chevron, alternância entre Despesas e Receitas e campo de pesquisa.

- [ ] **Step 2: Executar testes para verificar falha (RED)**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH" && cd frontend && npm test -- LinhaCategoria CabecalhoCategorias`
Expected: FAIL

- [ ] **Step 3: Implementar CabecalhoCategorias, LinhaCategoria, LinhaSubcategoria e PaginacaoTabela (GREEN)**

1. `CabecalhoCategorias.tsx`: Pílula dropdown estilizada (`Categoria de Despesas ▾` em vermelho, `Categorias de Receitas ▾` em verde), botão `+`, busca e menu.
2. `LinhaCategoria.tsx`: Linha pai com ícone centralizado, bolinha colorida, ações completas.
3. `LinhaSubcategoria.tsx`: Linha filha com recuo `↳`, bolinha de cor herdada da categoria pai, ações (Relatório, Editar, Arquivar).
4. `PaginacaoTabela.tsx`: Seletor de registros por página e setas de navegação.

- [ ] **Step 4: Executar testes para verificar aprovação**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH" && cd frontend && npm test -- LinhaCategoria CabecalhoCategorias`
Expected: PASS

- [ ] **Step 5: Commit**

Run:
```bash
git add frontend/src/paginas/categorias/CabecalhoCategorias.tsx frontend/src/paginas/categorias/LinhaCategoria.tsx frontend/src/paginas/categorias/LinhaSubcategoria.tsx frontend/src/paginas/categorias/PaginacaoTabela.tsx frontend/src/paginas/categorias/LinhaCategoria.test.tsx frontend/src/paginas/categorias/CabecalhoCategorias.test.tsx
git commit -m "feat(frontend): criar componentes da tabela hierarquica e cabecalho de categorias"
```

---

### Task 7: Integração Completa da Tela CategoriasPage (Frontend)

**Files:**
- Modify: `frontend/src/paginas/categorias/CategoriasPage.tsx`
- Modify: `frontend/src/paginas/categorias/CategoriasPage.test.tsx`

**Interfaces:**
- Consumes: Componentes das Tasks 3, 4, 5 e 6
- Produces: Rota `/categorias` totalmente redesenhada em formato de Tree Table fiel aos prints

- [ ] **Step 1: Escrever testes de integração completos em CategoriasPage.test.tsx**

1. Renderiza a tabela de Despesas por padrão, exibindo categorias e subcategorias aninhadas com `↳`.
2. Alterna para Receitas ao selecionar no dropdown da pílula.
3. Filtra linhas ao digitar no campo de busca.
4. Clica no botão `+` da categoria pai para abrir o modal de nova subcategoria associada.
5. Clica no botão de Relatório e verifica navegação para `/relatorios` com parâmetro de filtro.

- [ ] **Step 2: Executar testes para verificar falha (RED)**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH" && cd frontend && npm test -- CategoriasPage`
Expected: FAIL

- [ ] **Step 3: Implementar a tela CategoriasPage integrada (GREEN)**

1. Montar a tabela unificada no lugar dos antigos cards.
2. Gerenciar estado de tipo ativo (`DESPESA` ou `RECEITA`), busca textual, expansão/recolhimento e paginação.
3. Conectar atalhos de relatórios, arquivamento rápido e abertura dos modais.

- [ ] **Step 4: Executar testes para verificar aprovação**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH" && cd frontend && npm test -- CategoriasPage`
Expected: PASS

- [ ] **Step 5: Commit**

Run:
```bash
git add frontend/src/paginas/categorias/CategoriasPage.tsx frontend/src/paginas/categorias/CategoriasPage.test.tsx
git commit -m "feat(frontend): integrar tela CategoriasPage com tabela hierarquica e novo layout"
```

---

### Task 8: Validação Regressiva Completa e Build de Produção

**Files:**
- Validar todos os módulos afetados

- [ ] **Step 1: Executar suite de testes completa do Backend**

Run: `cd backend && ./mvnw test`
Expected: Todos os testes de integração e unidade do backend devem passar sem falhas.

- [ ] **Step 2: Executar suite de testes completa do Frontend**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH" && cd frontend && npm test`
Expected: Todos os testes do frontend devem passar com 100% de sucesso.

- [ ] **Step 3: Executar build de produção do Frontend**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH" && cd frontend && npm run build`
Expected: Build concluído com sucesso sem erros de tipagem TypeScript ou bundling.

- [ ] **Step 4: Commit de finalização (se necessário)**

Run:
```bash
git status
```
