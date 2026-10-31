# Aprumo módulo 2: Tarefas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tarefas simples por usuário, com card "Hoje" na tela inicial e página `/tarefas`.

**Architecture:** Backend novo pacote `tarefa/` seguindo o padrão de `categoria/`, com migration V5. Um único `GET /api/tarefas` devolve a lista já agrupada pelo backend (fuso de São Paulo via `Clock`); card e página compartilham essa consulta (`queryKey: ['tarefas']`).

**Tech Stack:** Java 21 + Spring Boot + JPA + Flyway + Testcontainers; React + TS + TanStack Query 5 + react-router + Tailwind + vitest + msw.

**Spec:** `docs/superpowers/specs/2026-10-31-aprumo-tarefas-design.md`

**Execução:** branch `feat/aprumo-tarefas` a partir de `docs/aprumo-tarefas-design`. Tasks 1 e 2 (Java) pelo agent `java-spring`; tasks 3 a 5 (front) pelo agent `frontend-developer`.

## Global Constraints

- Título: 1 a 200 caracteres, sem espaços nas pontas (trim no construtor do request). Data: opcional, só dia (`LocalDate` / `yyyy-MM-dd`).
- "Hoje" é sempre o dia em `America/Sao_Paulo`, calculado no backend com o `Clock` injetado. Nada de `LocalDate.now()` sem clock, nada de `Date` do navegador para agrupar.
- Id alheio ou inexistente: 404 (`NaoEncontradoException`), igual aos outros módulos. Mensagens de erro em português como constantes `static final` no service.
- Migration `V5__tarefa.sql`, sem prefixo de schema; `usuario_id bigint not null references usuario (id) on delete cascade`; índice `idx_tarefa_usuario`; `check` no tamanho do título; `ddl-auto: validate`.
- Frontend: endpoints em `api/endpoints.ts`, tipos em `api/tipos.ts`, `invalidar.ts` do módulo, cores só por tokens `--cor-*`, componente do card com `useQuery` próprio (saudação e finanças não esperam as tarefas).
- Limites da UI: card mostra até 5 itens e "+N"; Concluídas na página mostra as 50 mais recentes, recolhida, com contagem total.
- Commits em português, convencionais, terminando com `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- Título só com espaços ou com 201 caracteres: 400 com mensagem, nunca 500 (Task 1).
- Data inválida no JSON (`"2026-13-40"`): 400, nunca 500 (Task 1).
- Conclusão às 23:30 de São Paulo (02:30 UTC do dia seguinte) conta como "concluída hoje"; às 23:59 do dia anterior não conta (Task 1).
- Concluir uma tarefa já concluída não muda o momento original de conclusão (Task 2).
- Tirar a data de uma tarefa na edição (`data: null`) move ela de Hoje/Atrasadas para Próximas, sem data (Task 2).
- Usuário B tentando editar, concluir ou apagar tarefa do usuário A: 404 e a tarefa de A fica intacta (Task 2).
- Resposta da API com erro 500/rede no card: mensagem dentro do card, tela inicial segue funcionando (Task 4).

---

### Task 1: Backend, migration, criar e listar agrupado

**Files:**
- Create: `backend/src/main/resources/db/migration/V5__tarefa.sql`
- Create: `backend/src/main/java/dev/lmaciel/contasclaras/tarefa/{Tarefa,TarefaRepository,TarefaService,TarefaController}.java`
- Create: `backend/src/main/java/dev/lmaciel/contasclaras/tarefa/dto/{TarefaRequest,TarefaResponse,TarefasResponse}.java`
- Test: `backend/src/test/java/dev/lmaciel/contasclaras/tarefa/TarefaControllerTest.java` (estende `IntegracaoTest`, mesmo padrão de `CategoriaControllerTest`)

**Interfaces:**
- Produces (JSON, consumido pelas tasks 3 a 5):
  - `POST /api/tarefas` corpo `{ "titulo": string, "data": "yyyy-MM-dd" | null }` responde 201 `TarefaResponse`.
  - `GET /api/tarefas` responde `TarefasResponse`.
  - `TarefaResponse = { id: long, titulo: string, data: "yyyy-MM-dd" | null, concluida: boolean, concluidaEm: ISO-8601 instant | null }`.
  - `TarefasResponse = { hoje: "yyyy-MM-dd", atrasadas: TarefaResponse[], deHoje: TarefaResponse[], proximas: TarefaResponse[], concluidasHoje: TarefaResponse[], concluidas: TarefaResponse[], totalConcluidas: long }`.
- Produces (Java): `TarefaService.criar(TarefaRequest, UsuarioLogado): TarefaResponse`, `TarefaService.listar(UsuarioLogado): TarefasResponse`, `TarefaService.buscarDoUsuario(long, UsuarioLogado): Tarefa` (404 se alheia). Entidade `Tarefa` com `getId()`, `getTitulo()`, `getData()`, `getConcluidaEm()` e métodos de domínio (sem setters).

Regras de agrupamento de `listar`, com `hoje = LocalDate.now(clock)`:
- `atrasadas`: abertas com data < hoje, ordem data asc, depois criação asc.
- `deHoje`: abertas com data = hoje, ordem criação asc.
- `proximas`: abertas com data > hoje por data asc, seguidas das abertas sem data por criação asc.
- `concluidas`: as 50 concluídas mais recentes por `concluida_em` desc; `totalConcluidas` é a contagem total.
- `concluidasHoje`: concluídas cujo `concluida_em`, convertido para o fuso do `Clock`, cai em `hoje`, ordem `concluida_em` desc (sem limite de 50).

- [ ] **Step 1: Escrever os testes que falham** em `TarefaControllerTest` (relógio fixo do projeto: 2026-10-29 12:00 -03:00, então `hoje = 2026-10-29`; `@BeforeEach` limpa `usuario` via `jdbc`). Nomes e asserções:
  - `criaTarefaSoComTitulo`: POST `{"titulo":"  Pagar fatura  "}` responde 201, `titulo == "Pagar fatura"`, `data == null`, `concluida == false`.
  - `rejeitaTituloVazioOuSoEspacos`: `{"titulo":"   "}` responde 400 com `erro` preenchido.
  - `rejeitaTitulo201Caracteres`: 201 letras responde 400; 200 letras responde 201.
  - `rejeitaDataInvalida`: corpo bruto `{"titulo":"x","data":"2026-13-40"}` responde 400.
  - `agrupaPorDataComRelogioFixo`: cria tarefas com datas 2026-10-28, 2026-10-29, 2026-10-30 e sem data; `GET` devolve `hoje == "2026-10-29"`, uma em `atrasadas`, uma em `deHoje`, e `proximas` com a de 10-30 primeiro e a sem data depois.
  - `concluidasHojeRespeitaFusoDeSaoPaulo`: insere por `jdbc` duas tarefas concluídas, uma com `concluida_em = '2026-10-29T02:59:00Z'` (23:59 de 28 em SP) e outra com `'2026-10-29T03:00:00Z'` (00:00 de 29 em SP); `concluidasHoje` contém só a segunda; `concluidas` contém as duas, a mais recente primeiro; `totalConcluidas == 2`.
  - `listaSoTarefasDoUsuarioLogado`: usuário DONO cria uma, OUTRA lista e recebe tudo vazio.
  - `exigeAutenticacao`: `GET /api/tarefas` sem cookie responde 401.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && mvn -q test -Dtest=TarefaControllerTest`
Expected: FAIL (classes e tabela inexistentes).

- [ ] **Step 3: Implementar** migration `V5__tarefa.sql` (tabela `tarefa`: `id bigserial`, `usuario_id`, `titulo varchar(200) not null check (char_length(titulo) between 1 and 200)`, `data date`, `concluida_em timestamptz`, `criado_em timestamptz not null default now()`, índice `idx_tarefa_usuario (usuario_id)`); entidade `Tarefa` (construtor protected + público `Tarefa(Usuario usuario, String titulo, LocalDate data)`); `TarefaRequest(@NotBlank @Size(max = 200) String titulo, LocalDate data)` com trim no construtor compacto; `TarefaResponse.de(Tarefa)`; `TarefaService` e `TarefaController` (`@RequestMapping("/api/tarefas")`, `@GetMapping`, `@PostMapping` 201) no estilo de `CategoriaService`/`CategoriaController`. Data inválida precisa virar 400 pelo handler existente; se o `ApiExceptionHandler` não cobrir `HttpMessageNotReadableException`, adicionar o caso com mensagem "Corpo da requisição inválido.".

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && mvn -q test -Dtest=TarefaControllerTest`
Expected: PASS, 0 falhas.

- [ ] **Step 5: Suíte completa do backend**

Run: `cd backend && mvn -q test`
Expected: PASS (nada existente quebrou, inclusive `SchemaTest`).

- [ ] **Step 6: Commit**

```bash
git add backend
git commit -m "feat(tarefas): migration, criar e listar tarefas agrupadas"
```

---

### Task 2: Backend, editar, concluir/reabrir e excluir

**Files:**
- Modify: `backend/src/main/java/dev/lmaciel/contasclaras/tarefa/{Tarefa,TarefaService,TarefaController}.java`
- Create: `backend/src/main/java/dev/lmaciel/contasclaras/tarefa/dto/ConcluirRequest.java`
- Test: `backend/src/test/java/dev/lmaciel/contasclaras/tarefa/TarefaControllerTest.java`

**Interfaces:**
- Consumes: `TarefaService.buscarDoUsuario`, `TarefaResponse`, `TarefaRequest` da Task 1.
- Produces (JSON, consumido pelas tasks 3 a 5):
  - `PUT /api/tarefas/{id}` corpo `TarefaRequest` responde 200 `TarefaResponse` (troca título e data; `data: null` remove a data).
  - `PATCH /api/tarefas/{id}/concluida` corpo `{ "concluida": boolean }` responde 200 `TarefaResponse`.
  - `DELETE /api/tarefas/{id}` responde 204.
- Produces (Java): `ConcluirRequest(@NotNull Boolean concluida)`; `TarefaService.editar(long, TarefaRequest, UsuarioLogado)`, `.concluir(long, boolean, UsuarioLogado)`, `.excluir(long, UsuarioLogado)`; métodos de domínio `Tarefa.editar(String, LocalDate)`, `Tarefa.concluir(Instant)` (não altera se já concluída), `Tarefa.reabrir()`.

- [ ] **Step 1: Escrever os testes que falham** (mesma classe, relógio fixo):
  - `editaTituloEData`: PUT muda título e data; `GET` reflete.
  - `editarComDataNulaVaiParaProximasSemData`: tarefa de hoje, PUT com `data: null`; `deHoje` vazio e a tarefa aparece em `proximas` com `data == null`.
  - `concluiEReabre`: PATCH `{"concluida":true}` responde `concluida == true` e `concluidaEm` preenchido (2026-10-29T15:00:00Z, hora do relógio fixo); PATCH `false` volta `concluida == false`, `concluidaEm == null`.
  - `concluirDeNovoMantemMomentoOriginal`: insere por `jdbc` tarefa com `concluida_em = '2026-10-20T10:00:00Z'`; PATCH `true` devolve `concluidaEm == "2026-10-20T10:00:00Z"`.
  - `excluiTarefa`: DELETE responde 204 e `GET` não a lista mais.
  - `outroUsuarioNaoMexeNaTarefaAlheia`: OUTRA faz PUT, PATCH e DELETE no id de DONO; os três respondem 404 e a tarefa de DONO continua intacta (título e data iguais, não excluída).
  - `idInexistenteDa404`: PUT, PATCH e DELETE em id `999999` respondem 404.
  - `patchSemCampoDa400`: corpo `{}` responde 400.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && mvn -q test -Dtest=TarefaControllerTest`
Expected: FAIL nos testes novos (405/404 nas rotas inexistentes).

- [ ] **Step 3: Implementar** os três endpoints e métodos de service/domínio acima, todos `@Transactional`, passando por `buscarDoUsuario`. `concluir` usa `Instant.now(clock)`.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && mvn -q test`
Expected: PASS (suíte completa).

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat(tarefas): editar, concluir, reabrir e excluir"
```

### Task 3: Frontend, camada de dados e linha de tarefa

**Files:**
- Modify: `frontend/src/api/tipos.ts`, `frontend/src/api/endpoints.ts`
- Create: `frontend/src/paginas/tarefas/{invalidar.ts,useTarefas.ts,TarefaLinha.tsx}`
- Test: `frontend/src/paginas/tarefas/useTarefas.test.tsx`, `frontend/src/paginas/tarefas/TarefaLinha.test.tsx`

**Interfaces:**
- Consumes: JSON das tasks 1 e 2.
- Produces:
  - Tipos em `api/tipos.ts`: `TarefaResponse`, `TarefasResponse`, `TarefaRequest { titulo: string; data: string | null }`, espelhando o JSON acima (`concluidaEm: string | null`).
  - `endpoints.tarefas = { listar(): Promise<TarefasResponse>, criar(req: TarefaRequest): Promise<TarefaResponse>, editar(id: number, req: TarefaRequest): Promise<TarefaResponse>, concluir(id: number, concluida: boolean): Promise<TarefaResponse>, excluir(id: number): Promise<void> }`.
  - `invalidarTarefas(queryClient: QueryClient): Promise<unknown>`.
  - `useTarefas()` devolve o resultado de `useQuery` com `queryKey: ['tarefas']`; `useCriarTarefa()`, `useEditarTarefa()`, `useConcluirTarefa()`, `useExcluirTarefa()` devolvem `useMutation` cujo `onSuccess` chama `invalidarTarefas`. Entradas: `{ titulo, data }`, `{ id, titulo, data }`, `{ id, concluida }`, `id: number`.
  - `TarefaLinha({ tarefa, hoje, aoAlternar, desabilitada? })`: círculo (botão com `aria-label` "Marcar como feita" ou "Reabrir tarefa"), título (riscado e esmaecido se concluída), data em `dd/mm` ou `dd/mm/aaaa` via `isoParaBr` quando houver, destaque de atraso quando `tarefa.data < hoje` e aberta. `aoAlternar(tarefa)` dispara ao clicar no círculo.

- [ ] **Step 1: Escrever os testes que falham.** Em `useTarefas.test.tsx` (msw via `servidor.use`): `listarChamaGetApiTarefas`; `criarEnviaPostComTituloEData`; `concluirEnviaPatchComConcluida`; `editarEnviaPutComDataNula`; `excluirEnviaDelete`; `mutacaoInvalidaAConsultaTarefas` (depois de `criar`, o handler de `GET` é chamado de novo). Em `TarefaLinha.test.tsx`: `mostraBotaoMarcarComoFeita`; `cliqueNoCirculoChamaAoAlternar`; `concluidaMostraReabrirETituloRiscado`; `tarefaAbertaComDataAnteriorAHojeFicaMarcadaComoAtrasada`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && npx vitest run src/paginas/tarefas`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Implementar** tipos, endpoints (mesmo estilo de `categorias`, usando o helper `json`), `invalidar.ts`, hooks e `TarefaLinha` (Tailwind com tokens `--cor-*`, alvo de toque mínimo `min-h-11`, foco visível como no botão "Ir para…" do `PainelPage`).

- [ ] **Step 4: Rodar e ver passar**

Run: `cd frontend && npx vitest run src/paginas/tarefas`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat(tarefas): tipos, endpoints, hooks e linha de tarefa"
```

---

### Task 4: Frontend, card "Hoje" na tela inicial

**Files:**
- Create: `frontend/src/paginas/painel/TarefasDeHoje.tsx`
- Modify: `frontend/src/paginas/painel/PainelPage.tsx` (renderizar `<TarefasDeHoje />` logo acima de `<FinancasDoMes />`)
- Test: `frontend/src/paginas/painel/TarefasDeHoje.test.tsx`

**Interfaces:**
- Consumes: `useTarefas`, `useCriarTarefa`, `useConcluirTarefa`, `TarefaLinha` da Task 3; `TarefasResponse` (campos `hoje`, `atrasadas`, `deHoje`, `concluidasHoje`).
- Produces: `TarefasDeHoje(): JSX.Element`, no formato das seções de `FinancasDoMes` (`<section aria-labelledby className="card">`, título "Hoje", link "Ver todas" para `/tarefas`).

Regras: itens = abertas (`atrasadas` e depois `deHoje`) seguidas de `concluidasHoje`; mostra os 5 primeiros e, se houver mais, o texto "+N" (N = restantes) como link para `/tarefas`. Contador "X de Y feitas": X = `concluidasHoje.length`, Y = `atrasadas.length + deHoje.length + concluidasHoje.length`. Campo "Nova tarefa" no rodapé: Enter ou botão cria com `data = TarefasResponse.hoje` e limpa o campo; título vazio não envia. Estados: carregando (esqueleto), vazio (mensagem curta convidando a adicionar, campo continua visível), erro (mensagem dentro do card; o resto da tela inicial não é afetado).

- [ ] **Step 1: Escrever os testes que falham** (msw): `mostraAtrasadasEDeHojeSeguidasDasConcluidasHoje`; `contadorMostraXDeYFeitas` (ex.: 1 atrasada, 1 de hoje, 2 concluídas hoje mostra "2 de 4 feitas"); `limitaACincoItensEMostraMaisN` (8 itens mostra 5 e "+3"); `clicarNoCirculoEnviaPatchConcluida`; `adicionarComEnterCriaComDataDeHoje` (corpo do POST tem `data` igual ao `hoje` da resposta e o campo é limpo); `tituloVazioNaoEnvia`; `estadoVazioMostraConvite`; `erroNaApiMostraMensagemNoCardENaoQuebraOPainel` (GET responde 500; a saudação do `PainelPage` continua visível); `linkVerTodasApontaParaTarefas`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && npx vitest run src/paginas/painel`
Expected: FAIL (componente inexistente).

- [ ] **Step 3: Implementar** `TarefasDeHoje` e incluí-lo em `PainelPage`. Os testes existentes do `PainelPage` precisam de um handler msw para `GET /api/tarefas` (ajustar o setup deles, sem mudar asserções).

- [ ] **Step 4: Rodar e ver passar**

Run: `cd frontend && npx vitest run src/paginas/painel`
Expected: PASS, inclusive os testes antigos do painel.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat(painel): card Hoje com tarefas na tela inicial"
```

---

### Task 5: Frontend, página Tarefas, rota e menu

**Files:**
- Create: `frontend/src/paginas/tarefas/TarefasPage.tsx`
- Modify: `frontend/src/App.tsx` (rota `/tarefas` dentro de `RotaProtegida` > `MolduraDoUsuario`), `frontend/src/layout/itensMenu.ts`
- Test: `frontend/src/paginas/tarefas/TarefasPage.test.tsx`; ajustar o teste existente do menu/paleta, se houver, para incluir "Tarefas"

**Interfaces:**
- Consumes: hooks e `TarefaLinha` da Task 3; JSON de `TarefasResponse`.
- Produces: `TarefasPage(): JSX.Element` e item `{ rotulo: 'Tarefas', caminho: '/tarefas' }` no grupo sem título de `GRUPOS_MENU`, logo depois de "Início" (atualizar o comentário do arquivo, que cita tarefas como futuras). O item aparece no menu lateral e na paleta Ctrl K sem outra mudança.

Regras da página: campo "Adicionar uma tarefa" no topo cria com `data: null`. Seções na ordem Atrasadas, Hoje, Próximas (seção vazia não aparece); "Concluídas (N)" sempre presente, recolhida por padrão, N = `totalConcluidas`, lista as `concluidas` (até 50). Cada linha usa `TarefaLinha` mais ações Editar (título e data na própria linha, salva com Enter/botão, cancela com Esc) e Excluir (mesmo padrão de confirmação da exclusão de categorias em `paginas/categorias`). Em Próximas, tarefa sem data mostra "sem data". Estados de carregando, vazio e erro como no card.

- [ ] **Step 1: Escrever os testes que falham** (msw): `agrupaEmAtrasadasHojeEProximasNaOrdem`; `secaoVaziaNaoAparece`; `concluidasComecaRecolhidaComContagemTotal` (expande ao clicar e lista os itens); `adicionarCriaSemData` (POST com `data: null`); `editarTituloEDataEnviaPut`; `removerDataNaEdicaoEnviaDataNula`; `escCancelaEdicaoSemEnviar`; `excluirPedeConfirmacaoEEnviaDelete`; `concluirEReabrirEnviamPatch`; `tarefaSemDataMostraSemData`; `estadoVazioEErro`. Em um teste de layout: `menuLateralTemTarefasEPaletaEncontraTarefas` (digitar "taref" na paleta lista o item e Enter navega para `/tarefas`).

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && npx vitest run src/paginas/tarefas src/layout`
Expected: FAIL.

- [ ] **Step 3: Implementar** a página, a rota e o item de menu.

- [ ] **Step 4: Verificação completa do frontend**

Run: `cd frontend && npx vitest run && npm run build && npm run lint` (confirmar os nomes dos scripts em `package.json`).
Expected: todos os testes PASS, build e lint sem erro.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat(tarefas): pagina Tarefas, rota e item no menu"
```

---

## Self-review (feito)

- **Cobertura do spec:** modelo e validação (Tasks 1, 2); agrupamento com `Clock` (1); card com contador, 5 itens, "+N", adicionar com data de hoje, vazio e erro (4); página com seções, adicionar sem data, editar, excluir, concluídas recolhidas com 50 e contagem (5); menu e paleta (5); isolamento por usuário (2); testes esperados do spec (todas as tasks). Deploy fica fora, como no spec.
- **Consistência de nomes:** `TarefaResponse`, `TarefasResponse` (`hoje`, `atrasadas`, `deHoje`, `proximas`, `concluidasHoje`, `concluidas`, `totalConcluidas`), `TarefaRequest`, `ConcluirRequest`, hooks `useCriarTarefa`/`useEditarTarefa`/`useConcluirTarefa`/`useExcluirTarefa` usados igual nas tasks 3 a 5.
- **Review Focus:** cada linha tem teste na task indicada.
