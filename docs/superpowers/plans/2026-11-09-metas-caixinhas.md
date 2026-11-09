# Metas com Propósito ("Caixinhas do Futuro") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o módulo de Metas com Propósito ("Caixinhas do Futuro"), permitindo criar caixinhas com fotos/presets visuais estilo cartão, atualizar saldos de forma rápida (+ Guardar / - Resgatar), visualizar projeção e conectar com a sobra prevista na Visão Geral e tela inicial.

**Architecture:**
- Backend (Java 21, Spring Boot 4): Migração Flyway `V14__metas.sql`, entidade JPA `Meta`, `MetaRepository`, `MetaService` com isolamento estrito por usuário e regras de projeção de ritmo mensal, e `MetaController` REST (`/api/metas`).
- Frontend (React 19, TypeScript, Tailwind CSS): Módulo `src/paginas/metas/` com `MetasPage`, `CardMeta` (estilo cartão de crédito com presets visuais temáticos e foto customizada), modais de criação/edição e de aporte rápido (`+ Guardar` / `- Resgatar`), `CardConselheiroMetas` na Visão Geral (`/financeiro`) e `WidgetMetaInicio` compacto no Painel (`/`).

**Tech Stack:** Java 21, Spring Boot 4, Flyway, PostgreSQL / Testcontainers, React 19, TanStack Query 5, Tailwind CSS, Lucide React, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-09-metas-caixinhas.md`

## Global Constraints
- Backend em Java 21 e Spring Boot 4; endpoints com isolamento estrito por `usuario_id` (404 em meta de outro usuário).
- Valores monetários trafegam como string decimal com duas casas no JSON (`"1500.00"`).
- Testes TDD em cada tarefa (teste que falha primeiro, implementação mínima, teste passando).
- Conventional Commits em português do Brasil com acentos (`feat(...)`, `test(...)`, `fix(...)`).
- Sem adição de dependências pesadas externas desnecessárias (usar Tailwind e Lucide).

## Review Focus
1. Isolamento multi-tenant: garantir que usuário A receba 404 ao tentar ler, atualizar, aportar ou deletar meta de usuário B.
2. Integridade de saldo: operação de resgate não pode permitir valor maior que o montante guardado (`valor_guardado >= 0`).
3. Ritmo mensal e metas contínuas: caixinhas sem prazo (ex: Reserva de Emergência) não devem quebrar cálculos com divisão por zero.
4. Conexão do conselheiro da sobra: lidar com sobra zero ou negativa graciosamente sem quebrar a tela de Visão Geral.
5. Responsividade: cards e modais devem funcionar fluidamente tanto em telas pequenas (360px mobile) quanto em telas desktop.

---

### Tarefa 1: Migração Flyway e Entidade JPA `Meta`

**Arquivos:**
- Criar: `backend/src/main/resources/db/migration/V14__metas.sql`
- Criar: `backend/src/main/java/dev/lmaciel/aprumo/metas/Meta.java`
- Criar: `backend/src/main/java/dev/lmaciel/aprumo/metas/MetaRepository.java`
- Criar: `backend/src/test/java/dev/lmaciel/aprumo/metas/MetaRepositoryTest.java`

- [ ] **Passo 1: Escrever teste de repositório que falha**
  - Em `MetaRepositoryTest.java`, testar salvar e buscar metas por `usuarioId` ordenando por prazo e ordem.
- [ ] **Passo 2: Rodar teste e ver falhar**
  - `./mvnw -q test -Dtest=MetaRepositoryTest`
- [ ] **Passo 3: Criar migração SQL e Entidade JPA**
  - Em `V14__metas.sql`, criar tabela `metas` com colunas: `id`, `usuario_id`, `nome`, `valor_alvo`, `valor_guardado`, `mes_alvo`, `ano_alvo`, `preset_visual`, `imagem_url`, `cor_gradiente`, `ordem`, `criado_em`, `atualizado_em`.
  - Em `Meta.java`, mapear a entidade com validações de campos e métodos auxiliares (`guardar(valor)`, `resgatar(valor)`).
  - Em `MetaRepository.java`, declarar `findByUsuarioIdOrderByAnoAlvoAscMesAlvoAscOrdemAsc(...)`.
- [ ] **Passo 4: Rodar teste e ver passar**
  - `./mvnw -q test -Dtest=MetaRepositoryTest`
- [ ] **Passo 5: Commit**
  - `feat(metas): criar tabela metas e repositório jpa com isolamento por usuário`

---

### Tarefa 2: DTOs, Regras de Negócio e Service no Backend

**Arquivos:**
- Criar: `backend/src/main/java/dev/lmaciel/aprumo/metas/dto/MetaRequest.java`
- Criar: `backend/src/main/java/dev/lmaciel/aprumo/metas/dto/MetaResponse.java`
- Criar: `backend/src/main/java/dev/lmaciel/aprumo/metas/dto/AporteMetaRequest.java`
- Criar: `backend/src/main/java/dev/lmaciel/aprumo/metas/dto/ResumoConselheiroResponse.java`
- Criar: `backend/src/main/java/dev/lmaciel/aprumo/metas/MetaService.java`
- Criar: `backend/src/test/java/dev/lmaciel/aprumo/metas/MetaServiceTest.java`

- [ ] **Passo 1: Escrever testes unitários do Service que falham**
  - Em `MetaServiceTest.java`, testar:
    - Listagem de metas calculando `percentualConcluido`, `valorRestante` e `valorMensalSugerido`.
    - Criação e atualização de meta validando limites.
    - Operação de aporte somando ao saldo.
    - Operação de resgate subtraindo e rejeitando resgate maior que o saldo.
    - Bloqueio / exceção de recurso não encontrado ao acessar meta de outro usuário.
- [ ] **Passo 2: Rodar testes e ver falhar**
  - `./mvnw -q test -Dtest=MetaServiceTest`
- [ ] **Passo 3: Implementar DTOs e Service**
  - Criar records/classes de DTO com validações `@NotNull`, `@NotBlank`, `@Positive`.
  - Em `MetaService.java`, implementar regras de negócio com transações `@Transactional`.
- [ ] **Passo 4: Rodar testes e ver passar**
  - `./mvnw -q test -Dtest=MetaServiceTest`
- [ ] **Passo 5: Commit**
  - `feat(metas): implementar regras de negócio e cálculo de ritmo no metaservice`

---

### Tarefa 3: Controller REST e Testes de Integração

**Arquivos:**
- Criar: `backend/src/main/java/dev/lmaciel/aprumo/metas/MetaController.java`
- Criar: `backend/src/test/java/dev/lmaciel/aprumo/metas/MetaControllerTest.java`

- [ ] **Passo 1: Escrever testes de integração do Controller que falham**
  - Em `MetaControllerTest.java`, testar endpoints com MockMvc e autenticação:
    - `GET /api/metas` -> 200 com lista.
    - `POST /api/metas` -> 201 com meta criada.
    - `PUT /api/metas/{id}` -> 200 com meta atualizada.
    - `PATCH /api/metas/{id}/guardar` -> 200 com saldo incrementado.
    - `PATCH /api/metas/{id}/resgatar` -> 200 com saldo decrementado e 400 se saldo insuficiente.
    - `DELETE /api/metas/{id}` -> 204.
    - Testar acesso a ID de outro usuário devolvendo 404.
- [ ] **Passo 2: Rodar testes e ver falhar**
  - `./mvnw -q test -Dtest=MetaControllerTest`
- [ ] **Passo 3: Implementar MetaController**
  - Mapear endpoints REST usando o usuário autenticado da sessão.
- [ ] **Passo 4: Rodar testes e ver passar**
  - `./mvnw -q test -Dtest=MetaControllerTest`
- [ ] **Passo 5: Commit**
  - `feat(metas): disponibilizar endpoints rest de metas com isolamento por usuário`

---

### Tarefa 4: Tipos TypeScript, Endpoints e Mock MSW no Frontend

**Arquivos:**
- Modificar: `frontend/src/api/tipos.ts`
- Modificar: `frontend/src/api/endpoints.ts`
- Criar: `frontend/src/paginas/metas/presetsVisuais.ts`
- Modificar: `frontend/src/teste/servidor.ts`
- Criar: `frontend/src/paginas/metas/presetsVisuais.test.ts`

- [ ] **Passo 1: Definir tipos e presets**
  - Adicionar interfaces `MetaResponse`, `MetaRequest`, `AporteMetaRequest` em `tipos.ts`.
  - Adicionar chamadas `endpoints.metas` em `endpoints.ts`.
  - Criar `presetsVisuais.ts` com os temas: `reserva`, `carro`, `viagem`, `casa`, `estudos` e `personalizado`, com cores, gradientes e ícones.
  - Adicionar handlers padrão de `/api/metas` em `servidor.ts`.
- [ ] **Passo 2: Escrever testes dos presets visuais**
  - Em `presetsVisuais.test.ts`, validar mapeamento e fallbacks.
- [ ] **Passo 3: Validar tipagem e testes**
  - `cd frontend && npx tsc --noEmit && npx vitest run src/paginas/metas/presetsVisuais.test.ts`
- [ ] **Passo 4: Commit**
  - `feat(metas): definir tipos, presets visuais e endpoints da api de metas no front`

---

### Tarefa 5: Componente `CardMeta` e Modais de Aporte e Edição

**Arquivos:**
- Criar: `frontend/src/paginas/metas/CardMeta.tsx`
- Criar: `frontend/src/paginas/metas/CardMeta.test.tsx`
- Criar: `frontend/src/paginas/metas/ModalAporteMeta.tsx`
- Criar: `frontend/src/paginas/metas/ModalAporteMeta.test.tsx`
- Criar: `frontend/src/paginas/metas/ModalMetaForm.tsx`
- Criar: `frontend/src/paginas/metas/ModalMetaForm.test.tsx`

- [ ] **Passo 1: Escrever testes dos componentes visuais**
  - Testar renderização do card com barra de progresso, cálculo de percentual e botões `+ Guardar` e `- Resgatar`.
  - Testar modais de aporte e de formulário da meta com validação de campos.
- [ ] **Passo 2: Rodar testes e ver falhar**
  - `cd frontend && npx vitest run src/paginas/metas/`
- [ ] **Passo 3: Implementar `CardMeta`, `ModalAporteMeta` e `ModalMetaForm`**
  - Estilização elegante inspirada em `CardCartao` (gradientes modernos, tipografia e badges).
  - Modal rápido de aporte que solicita apenas o valor a somar ou resgatar.
- [ ] **Passo 4: Rodar testes e ver passar**
  - `cd frontend && npx vitest run src/paginas/metas/`
- [ ] **Passo 5: Commit**
  - `feat(metas): criar card visual de caixinha estilo cartão e modais de aporte e criação`

---

### Tarefa 6: Página de Metas (`MetasPage`) e Integração aos Menus

**Arquivos:**
- Criar: `frontend/src/paginas/metas/MetasPage.tsx`
- Criar: `frontend/src/paginas/metas/MetasPage.test.tsx`
- Modificar: `frontend/src/App.tsx`
- Modificar: `frontend/src/layout/itensMenu.ts`
- Modificar: `frontend/src/layout/icones.tsx`
- Modificar: `frontend/src/layout/Sidebar.test.tsx`
- Modificar: `frontend/src/paginas/mais/MaisPage.test.tsx`
- Modificar: `frontend/src/layout/DockLateral.test.tsx`
- Modificar: `frontend/src/layout/PaletaNavegacao.test.tsx`

- [ ] **Passo 1: Escrever testes da página e de navegação**
  - Testar `MetasPage`: listagem de cards, estado vazio amigável quando não há metas e abertura do modal `+ Nova meta`.
  - Atualizar testes de navegação para incluir `/metas` no menu Financeiro / Mais.
- [ ] **Passo 2: Implementar `MetasPage` e registrar rotas**
  - Adicionar rota `/metas` com lazy import em `App.tsx`.
  - Incluir `/metas` com rótulo "Metas" e ícone em `itensMenu.ts`, `icones.tsx`, Sidebar e MaisPage.
- [ ] **Passo 3: Rodar testes e ver passar**
  - `cd frontend && npx vitest run src/paginas/metas/MetasPage.test.tsx src/layout/`
- [ ] **Passo 4: Commit**
  - `feat(metas): criar página de metas e integrar rota aos menus e navegação`

---

### Tarefa 7: Conselheiro Inteligente na Visão Geral (`CardConselheiroMetas`)

**Arquivos:**
- Criar: `frontend/src/paginas/metas/CardConselheiroMetas.tsx`
- Criar: `frontend/src/paginas/metas/CardConselheiroMetas.test.tsx`
- Modificar: `frontend/src/paginas/inicio/InicioPage.tsx` (Visão Geral `/financeiro`)
- Modificar: `frontend/src/paginas/inicio/InicioPage.test.tsx`

- [ ] **Passo 1: Escrever testes do Conselheiro da Sobra**
  - Testar card exibindo a sugestão calculada quando há sobra prevista no mês.
  - Testar mensagem cuidadosa quando a sobra é nula ou negativa.
  - Testar atalho para `/metas`.
- [ ] **Passo 2: Implementar `CardConselheiroMetas` e incluir em `InicioPage`**
  - Integrar o componente na página de Visão Geral (`/financeiro`) logo abaixo do resumo.
- [ ] **Passo 3: Rodar testes e ver passar**
  - `cd frontend && npx vitest run src/paginas/metas/CardConselheiroMetas.test.tsx src/paginas/inicio/InicioPage.test.tsx`
- [ ] **Passo 4: Commit**
  - `feat(metas): incluir card conselheiro de metas na visão geral com base na sobra prevista`

---

### Tarefa 8: Widget Compacto na Tela Inicial (`WidgetMetaInicio`)

**Arquivos:**
- Criar: `frontend/src/paginas/metas/WidgetMetaInicio.tsx`
- Criar: `frontend/src/paginas/metas/WidgetMetaInicio.test.tsx`
- Modificar: `frontend/src/paginas/painel/PainelPage.tsx`
- Modificar: `frontend/src/paginas/painel/PainelPage.test.tsx`

- [ ] **Passo 1: Escrever testes do widget inicial**
  - Testar exibição da meta mais próxima com barra compacta e atalho.
  - Testar comportamento quando o usuário não tem nenhuma meta (não ocupa espaço desnecessário).
- [ ] **Passo 2: Implementar `WidgetMetaInicio` e adicionar ao `PainelPage`**
  - Design leve e compacto posicionado entre a reflexão e as finanças do mês.
- [ ] **Passo 3: Rodar testes e ver passar**
  - `cd frontend && npx vitest run src/paginas/metas/WidgetMetaInicio.test.tsx src/paginas/painel/PainelPage.test.tsx`
- [ ] **Passo 4: Commit**
  - `feat(metas): adicionar widget compacto de metas na tela inicial`

---

### Tarefa 9: Verificação Geral, Testes E2E e Abertura de PR

**Arquivos:**
- Todo o diff (`git diff main...HEAD`).

- [ ] **Passo 1: Executar verificação completa do backend**
  - `cd backend && ./mvnw test`
- [ ] **Passo 2: Executar verificação completa do frontend**
  - `cd frontend && npx vitest run --reporter=dot && npx tsc --noEmit && npm run lint && npm run build`
- [ ] **Passo 3: Revisão de código completa no papel de `code-reviewer`**
  - Conferir isolamento por usuário, tipos monetários e ausência de regressões.
- [ ] **Passo 4: Push e criação do PR**
  - `git push -u origin feat/metas-caixinhas`
  - Criar PR com `gh pr create --base main` e fornecer o link e o resumo para o Lucas.

