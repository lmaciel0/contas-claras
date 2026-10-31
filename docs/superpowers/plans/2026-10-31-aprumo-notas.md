# Aprumo módulo 3: Notas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notas com texto formatado e categoria por usuário, uma nota fixada num card da tela inicial (com caixinhas que marcam ali mesmo) e página `/notas`.

**Architecture:** Backend novo pacote `nota/` seguindo o padrão de `tarefa/` e `categoria/`, migration V6. O conteúdo é o JSON do editor Tiptap, validado por lista permitida no backend; o texto simples é extraído e guardado para busca e prévia. Frontend: editor Tiptap com barra de ferramentas, salvamento automático por hook próprio, página com filtro de categorias, tela de edição `/notas/:id` e card irmão de `TarefasDeHoje`.

**Tech Stack:** Java 21 + Spring Boot + JPA + Flyway + Testcontainers; React 19 + TS + TanStack Query 5 + react-router + Tailwind + vitest + msw; Tiptap 3 (`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item`).

**Spec:** `docs/superpowers/specs/2026-10-31-aprumo-notas-design.md`

**Execução:** branch `feat/aprumo-notas` a partir de `docs/aprumo-notas-design`. Tasks 1 a 4 (Java) pelo agent `java-spring`; tasks 5 a 8 (front) pelo agent `frontend-developer`. Cada agent devolve resumo de até 15 linhas.

## Global Constraints

- Título da nota: 1 a 200 caracteres. Nome de categoria: 1 a 40 caracteres, único por usuário ignorando maiúsculas. Ambos: espaços nas pontas (inclusive espaço não separável ` `, ` `, ` `) são removidos antes de validar; caracteres de controle e de direção de texto (`‎`, `‏`, `‪`-`‮`, `⁦`-`⁩`) são recusados com 400.
- Conteúdo: JSON do Tiptap com raiz `doc`. Nós permitidos: `doc`, `paragraph`, `text`, `heading` (atributo `level` 1 a 3), `bulletList`, `orderedList`, `listItem`, `taskList`, `taskItem` (atributo `checked` booleano), `hardBreak`. Marcas permitidas: `bold`, `italic`, `strike`. Qualquer outro tipo, marca ou atributo: 400. JSON serializado com no máximo 100000 caracteres; profundidade máxima 20.
- Cores de categoria: chaves da paleta fixa `vermelho`, `laranja`, `amarelo`, `verde`, `azul`, `roxo`, `rosa`, `cinza`. Qualquer outra: 400.
- No máximo uma nota fixada por usuário, garantido por índice único parcial no banco.
- Id de nota ou categoria alheio ou inexistente: 404 (`NaoEncontradoException`), inclusive ao associar nota a categoria de outro usuário. Mensagens de erro em português como constantes `static final` no service.
- Migration `V6__nota.sql`, sem prefixo de schema; `usuario_id bigint not null references usuario (id) on delete cascade`; `categoria_id` da nota com `on delete set null`; `ddl-auto: validate`.
- Hora via `Clock` injetado (`America/Sao_Paulo`); `atualizado_em` é definido pela aplicação.
- Frontend: endpoints em `api/endpoints.ts`, tipos em `api/tipos.ts`, `invalidar.ts` do módulo, cores só por tokens `--cor-*` com contraste legível nos dois temas, card com `useQuery` próprio (a tela inicial não espera a nota). Nunca `dangerouslySetInnerHTML` com conteúdo da nota. Única dependência nova: Tiptap e suas extensões.
- Commits em português, convencionais, terminando com `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- Título só com espaços, só com ` `, com `‮` ou com 201 caracteres: 400 com mensagem, nunca 500 (Task 3).
- Conteúdo com `<script>` em texto, nó `image`, marca `link`, atributo `onclick`, raiz que não é `doc`, aninhamento acima de 20 níveis ou mais de 100000 caracteres: 400, nada gravado (Tasks 2 e 3).
- Busca com `%` ou `_` literal não casa tudo; busca vazia lista tudo (Task 3).
- Fixar a nota B quando A já está fixada deixa só B fixada; dois usuários podem ter uma fixada cada; fixar nota alheia dá 404 e não desfixa a do dono (Task 4).
- Apagar categoria com notas mantém as notas, agora sem categoria, e a lista de categorias informa quantas notas cada uma tem antes da exclusão (Task 4).
- Salvamento automático com falha de rede mantém o texto na tela e mostra o erro; mudança feita durante um salvamento em andamento não se perde (Task 6).
- Marcar caixinha no card da home grava; erro na API mostra mensagem dentro do card e a tela inicial segue funcionando; sem nota fixada o card mostra o convite (Task 8).

---

### Task 1: Backend, migration e categorias de nota

**Files:**
- Create: `backend/src/main/resources/db/migration/V6__nota.sql`
- Create: `backend/src/main/java/dev/lmaciel/contasclaras/nota/{CategoriaNota,CategoriaNotaRepository,CategoriaNotaService,CategoriaNotaController,CorCategoriaNota,TextoSeguro}.java`
- Create: `backend/src/main/java/dev/lmaciel/contasclaras/nota/dto/{CategoriaNotaRequest,CategoriaNotaResponse}.java`
- Test: `backend/src/test/java/dev/lmaciel/contasclaras/nota/CategoriaNotaControllerTest.java` (estende `IntegracaoTest`, mesmo padrão de `TarefaControllerTest`)

**Interfaces:**
- Produces (JSON, consumido pelas tasks 5 a 8):
  - `GET /api/categorias-nota` responde `CategoriaNotaResponse[]` em ordem alfabética pt-BR sem distinguir maiúsculas.
  - `POST /api/categorias-nota` corpo `{ "nome": string, "cor": string }` responde 201 `CategoriaNotaResponse`.
  - `PUT /api/categorias-nota/{id}` mesmo corpo, responde `CategoriaNotaResponse`.
  - `DELETE /api/categorias-nota/{id}` responde 204; as notas da categoria ficam sem categoria.
  - `CategoriaNotaResponse = { id: long, nome: string, cor: string, totalNotas: long }`.
  - Nome repetido (mesmo ignorando maiúsculas): 409.
- Produces (Java): `CategoriaNotaService.buscarDoUsuario(long, UsuarioLogado): CategoriaNota` (404 se alheia); enum `CorCategoriaNota` com as 8 chaves em minúsculas (`valor()` devolve a chave); `TextoSeguro.limpar(String): String` estático: remove espaços das pontas (incluindo ` `, ` `, ` `) e devolve o texto; `TextoSeguro.TEM_CARACTERE_PROIBIDO` regex usada nas anotações `@Pattern` dos requests (controle e direção de texto).

- [ ] **Step 1: Escrever os testes que falham** em `CategoriaNotaControllerTest` (nomes e asserções):
  - `criaCategoriaComNomeECor`: POST `{"nome":"  Saúde ","cor":"vermelho"}` responde 201 com `nome == "Saúde"`, `cor == "vermelho"`, `totalNotas == 0`.
  - `rejeitaNomeVazioSoComNbspOuComDirecaoDeTexto`: `"   "`, `" "` e `"abc‮def"` respondem 400 com `erro` preenchido.
  - `rejeitaNome41Caracteres`: 41 letras responde 400; 40 letras responde 201.
  - `rejeitaCorForaDaPaleta`: `"cor":"magenta"` e `"cor":null` respondem 400.
  - `nomeRepetidoIgnorandoMaiusculasDa409`: cria "Casa", depois "casa" responde 409; o mesmo nome em outro usuário responde 201.
  - `listaEmOrdemAlfabetica`: "banana", "Abacaxi", "Cereja" voltam como Abacaxi, banana, Cereja.
  - `renomearEMudarCor`: PUT responde 200 com os novos valores; renomear para o nome de outra categoria do usuário responde 409; renomear para o próprio nome com outra capitalização responde 200.
  - `excluirResponde204`: DELETE e depois GET sem a categoria.
  - `categoriaAlheiaDa404EFicaIntacta`: usuário OUTRA tenta PUT e DELETE em categoria do DONO e recebe 404; GET do DONO ainda mostra a categoria.
  - `exigeAutenticacao`: GET sem cookie responde 401.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && mvn -q test -Dtest=CategoriaNotaControllerTest`
Expected: FAIL (classes e tabela inexistentes).

- [ ] **Step 3: Implementar** a migration `V6__nota.sql` com as duas tabelas: `categoria_nota` (`id bigserial`, `usuario_id`, `nome varchar(40) not null check (char_length(nome) between 1 and 40)`, `cor varchar(10) not null check (cor in (<as 8 chaves>))`, `criado_em timestamptz not null default now()`, índice único `uq_categoria_nota_nome (usuario_id, lower(nome))`) e `nota` (`id bigserial`, `usuario_id`, `categoria_id bigint references categoria_nota (id) on delete set null`, `titulo varchar(200) not null check (char_length(titulo) between 1 and 200)`, `conteudo jsonb not null`, `texto text not null default ''`, `fixada boolean not null default false`, `criado_em` e `atualizado_em timestamptz not null default now()`, índices `idx_nota_usuario_atualizado (usuario_id, atualizado_em desc)` e `idx_nota_categoria (categoria_id)`, índice único parcial `uq_nota_fixada_usuario on nota (usuario_id) where fixada`). Depois entidade, repository, service e controller no estilo de `CategoriaService`/`CategoriaController`: checagem `existsBy...` para o 409 mais captura de `DataIntegrityViolationException` para corridas, ordenação com `Collator` pt-BR, `totalNotas` por consulta agrupada (a entidade `Nota` só chega na Task 3; nesta task use `JdbcTemplate` ou uma consulta nativa na contagem, e na Task 3 troque pela consulta do `NotaRepository`).

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && mvn -q test -Dtest=CategoriaNotaControllerTest`
Expected: PASS, 0 falhas.

- [ ] **Step 5: Suíte completa do backend**

Run: `cd backend && mvn -q test`
Expected: PASS (inclusive `SchemaTest` e a migration nova).

- [ ] **Step 6: Commit**

```bash
git add backend
git commit -m "feat(notas): migration V6 e categorias de nota"
```

---

### Task 2: Backend, validação do conteúdo e extração do texto

**Files:**
- Create: `backend/src/main/java/dev/lmaciel/contasclaras/nota/{ConteudoNota,ConteudoInvalidoException}.java` (ou reutilizar `RequisicaoInvalidaException`, que já vira 400)
- Test: `backend/src/test/java/dev/lmaciel/contasclaras/nota/ConteudoNotaTest.java` (teste unitário puro com `ObjectMapper`, sem Spring)

**Interfaces:**
- Produces: `ConteudoNota.validar(JsonNode conteudo): void` lança `RequisicaoInvalidaException` com mensagem em português se o conteúdo violar a lista permitida, o limite de 100000 caracteres serializados ou a profundidade 20. `ConteudoNota.textoSimples(JsonNode conteudo): String` junta os nós `text` e separa blocos (`paragraph`, `heading`, `listItem`, `taskItem`) e `hardBreak` com `\n`, sem espaços repetidos nas pontas. `ConteudoNota.VAZIO: JsonNode` é `{"type":"doc","content":[{"type":"paragraph"}]}`.

- [ ] **Step 1: Escrever os testes que falham** em `ConteudoNotaTest`:
  - `aceitaDocumentoVazio` e `aceitaTodosOsTiposPermitidos` (um documento com título nível 2, parágrafo com negrito, itálico e riscado, lista com marcadores, numerada, lista de caixinhas com `checked` true e false, e `hardBreak`).
  - `recusaRaizQueNaoEDoc`, `recusaNoImage`, `recusaMarcaLink`, `recusaMarcaUnderline`, `recusaAtributoDesconhecidoEmParagrafo` (`attrs.onclick`), `recusaHeadingNivel4`, `recusaCheckedNaoBooleano`, `recusaTextSemCampoText`.
  - `recusaAninhamentoAcimaDe20Niveis` (listas aninhadas 21 níveis) e `aceitaAninhamentoDe20Niveis`.
  - `recusaMaisDe100000Caracteres` (documento com texto que serializa em 100001) e aceita exatamente 100000.
  - `scriptEmTextoEAceitoComoTextoMasNuncaComoNo`: `{"type":"text","text":"<script>alert(1)</script>"}` é válido (é só texto) e `textoSimples` o devolve literal.
  - `textoSimplesSeparaBlocosComQuebraDeLinha`: dois parágrafos "Olá" e "mundo" viram `"Olá\nmundo"`; item de caixinha entra como linha própria; documento vazio vira `""`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && mvn -q test -Dtest=ConteudoNotaTest`
Expected: FAIL (classe inexistente).

- [ ] **Step 3: Implementar** `ConteudoNota` com mapa estático tipo de nó para atributos permitidos (`heading` -> `level` inteiro 1 a 3; `taskItem` -> `checked` booleano; os demais, nenhum atributo, com exceção de `orderedList`, que aceita `start` inteiro positivo: confira o JSON real que o Tiptap 3 emite para `orderedList` e `taskItem` e ajuste só essa lista permitida, nunca abrindo atributo livre). Percurso recursivo com contador de profundidade; marcas validadas pelo mesmo critério (tipo permitido, sem atributos).

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && mvn -q test -Dtest=ConteudoNotaTest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat(notas): validacao do conteudo por lista permitida e texto simples"
```

---

### Task 3: Backend, notas (criar, listar, filtrar, buscar, editar, excluir)

**Files:**
- Create: `backend/src/main/java/dev/lmaciel/contasclaras/nota/{Nota,NotaRepository,NotaService,NotaController}.java`
- Create: `backend/src/main/java/dev/lmaciel/contasclaras/nota/dto/{NovaNotaRequest,NotaRequest,NotaResponse,NotaResumoResponse}.java`
- Modify: `CategoriaNotaService` (contagem de `totalNotas` passa a usar `NotaRepository`)
- Test: `backend/src/test/java/dev/lmaciel/contasclaras/nota/NotaControllerTest.java`

**Interfaces:**
- Consumes: `ConteudoNota.validar`, `ConteudoNota.textoSimples`, `ConteudoNota.VAZIO` (Task 2); `TextoSeguro`, `CategoriaNotaService.buscarDoUsuario` (Task 1).
- Produces (JSON, consumido pelas tasks 5 a 8):
  - `POST /api/notas` corpo `{ "categoriaId": long | null }` responde 201 `NotaResponse` com título `"Sem título"`, conteúdo `ConteudoNota.VAZIO`, sem fixar.
  - `GET /api/notas?busca=&categoriaId=&semCategoria=` responde `NotaResumoResponse[]` por `atualizado_em` desc. `categoriaId` filtra uma categoria; `semCategoria=true` filtra as sem categoria; `busca` casa título ou texto simples ignorando maiúsculas, tratando `%` e `_` como literais; sem parâmetros lista tudo.
  - `GET /api/notas/{id}` responde `NotaResponse`.
  - `PUT /api/notas/{id}` corpo `{ "titulo": string, "conteudo": object, "categoriaId": long | null }` responde `NotaResponse`; substitui tudo (última gravação vale).
  - `DELETE /api/notas/{id}` responde 204.
  - `NotaResumoResponse = { id: long, titulo: string, previa: string, categoriaId: long | null, fixada: boolean, atualizadoEm: ISO-8601 instant }` (`previa` = texto simples com espaços colapsados, cortado em 160 caracteres).
  - `NotaResponse = { id, titulo, conteudo: object, categoriaId: long | null, fixada: boolean, criadoEm, atualizadoEm }`.
- Produces (Java): entidade `Nota` com `getId()`, `getTitulo()`, `getConteudo()`, `getTexto()`, `getCategoria()`, `isFixada()`, `getAtualizadoEm()` e métodos de domínio `editar(String titulo, String conteudoJson, String texto, CategoriaNota categoria, Instant quando)`, `fixar()`, `desfixar()` (sem setters); `NotaService.buscarDoUsuario(long, UsuarioLogado): Nota` (404 se alheia); mapeamento do `jsonb` como `String` com `@JdbcTypeCode(SqlTypes.JSON)` convertida com o `ObjectMapper` do projeto.

- [ ] **Step 1: Escrever os testes que falham** em `NotaControllerTest` (relógio fixo do projeto):
  - `criaNotaVaziaComTituloPadrao`: POST `{}` responde 201, `titulo == "Sem título"`, `fixada == false`, `categoriaId == null`; com `categoriaId` válida a nota nasce nela.
  - `criarComCategoriaAlheiaDa404`: usuário OUTRA usa categoria do DONO e recebe 404; nenhuma nota é criada.
  - `editaTituloConteudoECategoria`: PUT com título `"  Remédios "`, conteúdo com um parágrafo e uma lista de caixinhas e a categoria; GET devolve o mesmo; `atualizadoEm` muda para o instante do relógio.
  - `rejeitaTituloInvalido`: `"   "`, `" "`, `"abc‮def"` e 201 letras respondem 400; 200 letras responde 200.
  - `rejeitaConteudoForaDaListaPermitida`: nó `image`, marca `link`, raiz `paragraph` e conteúdo com 100001 caracteres respondem 400 e a nota segue com o conteúdo anterior.
  - `rejeitaCorpoSemConteudoOuComConteudoNaoObjeto`: `"conteudo": "texto"` e ausência do campo respondem 400.
  - `editarComCategoriaAlheiaDa404`.
  - `listaMaisRecentesPrimeiro`, `filtraPorCategoria`, `filtraSemCategoria`.
  - `buscaPorTituloETextoIgnorandoMaiusculas`: nota com texto "Losartana 50mg" é achada por `busca=losartana`.
  - `buscaTrataPorcentoELiteral`: `busca=%` só devolve notas que contêm `%`; `busca=_` idem; `busca=` vazia devolve tudo.
  - `previaTemNoMaximo160CaracteresEEspacosColapsados`.
  - `excluirResponde204ENotaSome`.
  - `notaAlheiaDa404EmGetPutEDeleteEFicaIntacta`.
  - `totalNotasDaCategoriaConta` (ajuste do teste da Task 1: depois de criar 2 notas na categoria, `totalNotas == 2`).
  - `exigeAutenticacao`: 401 sem cookie.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && mvn -q test -Dtest=NotaControllerTest`
Expected: FAIL.

- [ ] **Step 3: Implementar** entidade, repository (consulta de listagem com `like ... escape '\'`, escapando `\`, `%` e `_` da busca no service), service e controller no estilo de `TarefaService`/`TarefaController`. `NotaRequest`: `@NotBlank @Size(max = 200) @Pattern(regexp = TextoSeguro...)` no título, com `TextoSeguro.limpar` no construtor compacto, e `@NotNull JsonNode conteudo` que precisa ser objeto. A associação de categoria passa por `CategoriaNotaService.buscarDoUsuario`. O texto simples vem de `ConteudoNota.textoSimples`.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && mvn -q test -Dtest='NotaControllerTest,CategoriaNotaControllerTest'`
Expected: PASS.

- [ ] **Step 5: Suíte completa do backend**

Run: `cd backend && mvn -q test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend
git commit -m "feat(notas): criar, listar com filtro e busca, editar e excluir notas"
```

---

### Task 4: Backend, fixar, nota fixada, marcar caixinha e exclusão de categoria

**Files:**
- Modify: `Nota`, `NotaRepository`, `NotaService`, `NotaController` (pacote `nota/`); `CategoriaNotaService`
- Create: `backend/src/main/java/dev/lmaciel/contasclaras/nota/dto/{FixarRequest,ConteudoRequest,NotaFixadaResponse}.java`
- Test: `backend/src/test/java/dev/lmaciel/contasclaras/nota/NotaFixadaControllerTest.java`

**Interfaces:**
- Consumes: tudo da Task 3.
- Produces (JSON, consumido pelas tasks 5 a 8):
  - `GET /api/notas/fixada` responde 200 `NotaFixadaResponse = { nota: NotaResponse | null }`.
  - `PATCH /api/notas/{id}/fixada` corpo `{ "fixada": boolean }` responde `NotaResponse`. Fixar tira a fixação da nota anterior do mesmo usuário na mesma transação.
  - `PATCH /api/notas/{id}/conteudo` corpo `{ "conteudo": object }` responde `NotaResponse`; valida com `ConteudoNota.validar`, recalcula o texto simples e atualiza `atualizadoEm`. Usado pelas caixinhas do card da home.
  - Fixação concorrente que perde a corrida: 409 com a mensagem "Outra nota foi fixada ao mesmo tempo. Tente de novo."
  - `DELETE /api/categorias-nota/{id}` já existe (Task 1); aqui o teste prova que as notas sobrevivem sem categoria.

- [ ] **Step 1: Escrever os testes que falham** em `NotaFixadaControllerTest`:
  - `semNotaFixadaDevolveNotaNula`: `GET /api/notas/fixada` responde 200 com `nota == null`.
  - `fixarDevolveNotaFixadaNoGet`.
  - `fixarOutraTiraAAnterior`: fixa A, fixa B; `GET /fixada` devolve B; A tem `fixada == false` em `GET /api/notas`; exatamente uma nota com `fixada` verdadeiro.
  - `desfixarDeixaNenhumaFixada`.
  - `fixarDuasVezesAMesmaNotaContinuaFixada` (idempotente, 200).
  - `cadaUsuarioTemSuaFixada`: DONO e OUTRA fixam notas próprias; cada `GET /fixada` devolve só a sua.
  - `fixarNotaAlheiaDa404EMantemAFixadaDoDono`: OUTRA tenta fixar nota do DONO que já tem outra fixada; 404 e a fixada do DONO continua.
  - `marcarCaixinhaGravaConteudoETexto`: PATCH `/conteudo` com um `taskItem` `checked: true`; GET devolve o conteúdo novo, `atualizadoEm` do relógio; a busca ainda acha o texto.
  - `patchConteudoRecusaConteudoInvalido`: nó `image` responde 400 e o conteúdo anterior fica.
  - `patchConteudoDeNotaAlheiaDa404`.
  - `excluirCategoriaMantemNotasSemCategoria`: categoria com 2 notas; `totalNotas == 2` na listagem antes; DELETE responde 204; as 2 notas existem com `categoriaId == null`.
  - `excluirNotaFixadaDeixaNenhumaFixada`.
  - `fixacaoSimultaneaNaoDeixaDuasFixadas`: duas threads fixam notas diferentes do mesmo usuário; ao final há no máximo uma fixada e nenhuma resposta é 500 (cada uma é 200 ou 409).

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && mvn -q test -Dtest=NotaFixadaControllerTest`
Expected: FAIL.

- [ ] **Step 3: Implementar.** `fixar(id, true)`: buscar a nota do usuário (404), `update nota set fixada = false where usuario_id = :u and fixada and id <> :id` com flush, depois `fixar()` e flush; capturar `DataIntegrityViolationException` e lançar `ConflitoException`. O `/fixada` literal precisa ganhar do `/{id}` no mapeamento (confirmar no teste). O PATCH de conteúdo reutiliza a validação e a extração da Task 2.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && mvn -q test -Dtest=NotaFixadaControllerTest`
Expected: PASS.

- [ ] **Step 5: Suíte completa do backend**

Run: `cd backend && mvn -q test`
Expected: PASS, 0 falhas.

- [ ] **Step 6: Commit**

```bash
git add backend
git commit -m "feat(notas): fixar nota, nota fixada e marcar caixinha"
```

---

### Task 5: Frontend, dependências, camada de dados e cores das categorias

**Files:**
- Modify: `frontend/package.json` e lockfile (Tiptap), `frontend/src/api/tipos.ts`, `frontend/src/api/endpoints.ts`, `frontend/src/index.css` (tokens de cor das categorias, claro e escuro)
- Create: `frontend/src/paginas/notas/{invalidar.ts,useNotas.ts,coresCategoria.ts}`
- Test: `frontend/src/paginas/notas/useNotas.test.tsx`, `frontend/src/paginas/notas/coresCategoria.test.ts`; rodar também `frontend/src/estilos.test.ts` (já existe e valida tokens)

**Interfaces:**
- Consumes: JSON das tasks 1, 3 e 4.
- Produces:
  - Dependências: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item`, na mesma versão maior 3 (instalar com `npm install`, nada além disso).
  - Tipos em `api/tipos.ts`: `CategoriaNotaResponse { id; nome; cor: string; totalNotas }`, `CategoriaNotaRequest { nome; cor }`, `NotaResumoResponse`, `NotaResponse` (`conteudo: ConteudoNota`), `NotaRequest { titulo; conteudo; categoriaId: number | null }`, `NotaFixadaResponse { nota: NotaResponse | null }`, `ConteudoNota = { type: string; [chave: string]: unknown }`, espelhando o JSON.
  - `endpoints.categoriasNota = { listar, criar(req), editar(id, req), excluir(id) }` e `endpoints.notas = { listar(filtro: FiltroNotas), buscar(id), criar(categoriaId: number | null), editar(id, req: NotaRequest, opcoes?: RequestInit), excluir(id), fixada(), fixar(id, fixada: boolean), salvarConteudo(id, conteudo) }`, com `FiltroNotas = { busca?: string; categoriaId?: number; semCategoria?: boolean }` virando query string só com os campos preenchidos.
  - `invalidarNotas(queryClient): Promise<unknown>` invalida `['notas']`, `['nota-fixada']` e `['categorias-nota']` (o total por categoria muda); `invalidarCategoriasNota(queryClient)` invalida também `['notas']`.
  - Hooks: `useNotas(filtro)` (`queryKey: ['notas', filtro]`), `useNota(id)` (`['nota', id]`), `useNotaFixada()` (`['nota-fixada']`, `refetchOnWindowFocus: true`), `useCategoriasNota()` (`['categorias-nota']`); mutações `useCriarNota`, `useSalvarNota`, `useExcluirNota`, `useFixarNota`, `useSalvarConteudoNota`, `useCriarCategoriaNota`, `useEditarCategoriaNota`, `useExcluirCategoriaNota`. `useSalvarNota` (autosave) grava a resposta em `['nota', id]` com `setQueryData` e invalida só a lista, a fixada e as categorias, nunca `['nota', id]`, para não recarregar a nota debaixo do editor.
  - `coresCategoria.ts`: `CORES_CATEGORIA_NOTA: readonly string[]` com as 8 chaves da paleta, `corDaCategoria(cor: string | null): string` devolve `var(--cor-nota-<chave>)` e, sem categoria ou chave desconhecida, `var(--cor-mutado)`.
  - Tokens `--cor-nota-<chave>` para as 8 chaves em `:root` e no tema escuro, com contraste legível como cor de destaque sobre `--cor-card` nos dois temas.

- [ ] **Step 1: Escrever os testes que falham.** Em `useNotas.test.tsx` (msw via `servidor.use`): `listarEnviaSoOsParametrosPreenchidos` (`busca=remedios&categoriaId=3`; `semCategoria=true`; sem filtro, sem query string); `criarEnviaPostComCategoriaId`; `editarEnviaPutComConteudo`; `editarAceitaKeepalive` (o `fetch` recebe `keepalive: true`); `fixarEnviaPatchFixada`; `salvarConteudoEnviaPatchConteudo`; `fixadaDevolveNotaNula`; `autosaveNaoInvalidaANotaAberta` (depois de `useSalvarNota`, o GET `/api/notas/{id}` não é chamado de novo, mas o GET da lista é); `excluirCategoriaInvalidaNotasECategorias`. Em `coresCategoria.test.ts`: `todasAsChavesTemTokenNosDoisTemas` (lê `index.css` como o `estilos.test.ts` faz) e `chaveDesconhecidaUsaCorMutada`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && npx vitest run src/paginas/notas`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Implementar** a instalação das dependências, tipos, endpoints (mesmo estilo de `tarefas`, helper `json`), `invalidar.ts`, hooks, `coresCategoria.ts` e tokens. Escolher as 8 cores de modo que o `estilos.test.ts` continue passando (ele pode exigir os mesmos tokens nos dois temas).

- [ ] **Step 4: Rodar e ver passar**

Run: `cd frontend && npx vitest run src/paginas/notas src/estilos.test.ts && npm run build`
Expected: PASS e build sem erro.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat(notas): dependencias do Tiptap, tipos, endpoints, hooks e cores das categorias"
```

---

### Task 6: Frontend, editor com barra de ferramentas e salvamento automático

**Files:**
- Create: `frontend/src/paginas/notas/{extensoesNota.ts,NotaEditor.tsx,BarraFormatacao.tsx,useAutosave.ts}`
- Modify: setup de testes do vitest (arquivo `setupFiles` do `vite.config`/`vitest.config`) se o ProseMirror precisar de polyfills no jsdom (`Range.prototype.getClientRects`, `getBoundingClientRect`, `document.elementFromPoint`)
- Test: `frontend/src/paginas/notas/{NotaEditor.test.tsx,useAutosave.test.tsx,extensoesNota.test.ts}`

**Interfaces:**
- Consumes: tipos da Task 5.
- Produces:
  - `extensoesNota` (array de extensões Tiptap): `StarterKit.configure` com `heading: { levels: [1, 2, 3] }` e desligando tudo que a barra não oferece (`link`, `underline`, `blockquote`, `codeBlock`, `code`, `horizontalRule`; conferir os nomes das opções na versão instalada, que no Tiptap 3 inclui `link` e `underline` no pacote), mais `TaskList` e `TaskItem.configure({ nested: true })`. O JSON que esse editor produz precisa passar na lista permitida do backend (Global Constraints).
  - `NotaEditor({ conteudo: ConteudoNota, aoMudar: (c: ConteudoNota) => void })`: editor com `BarraFormatacao` acima. Conteúdo inicial vem de `conteudo` e não é recarregado depois (o editor é a fonte da verdade durante a edição); `aoMudar` dispara a cada alteração com `editor.getJSON()`.
  - `BarraFormatacao({ editor })`: botões com `aria-label` e `aria-pressed` refletindo o estado ativo: "Negrito", "Itálico", "Riscado", "Título", "Lista com marcadores", "Lista numerada", "Caixinhas de marcar". Alvo de toque mínimo `min-h-11`, foco visível, cores só por tokens.
  - `useAutosave<T>({ valor: T, salvar: (v: T) => Promise<unknown>, atrasoMs?: number, aoSair?: (v: T) => void }): { estado: 'salvo' | 'pendente' | 'salvando' | 'erro', descarregar: () => Promise<void> }`. `atrasoMs` padrão 1000. O primeiro `valor` recebido é o estado já salvo e não dispara gravação. Uma gravação por vez; mudança durante uma gravação em andamento gera exatamente uma gravação seguinte com o valor mais recente. Falha: `estado === 'erro'`, o valor continua sendo o último digitado e a próxima mudança ou `descarregar()` tenta de novo. `descarregar()` grava já o que estiver pendente. Ao desmontar com gravação pendente chama `descarregar()`; em `pagehide` e quando a aba fica oculta (`visibilitychange`) com valor pendente chama `aoSair(valor)` (melhor esforço).

- [ ] **Step 1: Escrever os testes que falham.**
  - `useAutosave.test.tsx` (timers falsos do vitest): `primeiroValorNaoGrava`; `grava1SegundoDepoisDaUltimaMudanca` (três mudanças em sequência dentro de 1 s geram uma gravação, com o último valor); `estadoPassaPorPendenteSalvandoSalvo`; `mudancaDuranteGravacaoGeraUmaGravacaoDepoisComOUltimoValor` (a primeira promessa só resolve depois da segunda mudança; ao final são 2 gravações, a segunda com o valor novo, nunca em paralelo); `falhaMostraErroEMantemOValor` e `proximaMudancaTentaDeNovo`; `descarregarGravaNaHora`; `desmontarComPendenteGrava`; `pagehideComPendenteChamaAoSair`; `semMudancaNaoChamaAoSair`.
  - `extensoesNota.test.ts`: `jsonDoEditorSoTemTiposPermitidos`: cria um editor headless com `extensoesNota`, aplica cada ação da barra (negrito, itálico, riscado, título 1 a 3, lista com marcadores, numerada, caixinhas, `Shift+Enter` para `hardBreak`), percorre `getJSON()` e confirma que todo tipo de nó, marca e atributo está nas constantes `NODOS_PERMITIDOS`, `MARCAS_PERMITIDAS` e `ATRIBUTOS_PERMITIDOS` do próprio teste (cópia da lista do Global Constraints). Atalhos que o StarterKit criaria para recursos desligados (`**código**`, `> citação`) não geram nós fora da lista.
  - `NotaEditor.test.tsx`: `botoesDaBarraTemNomesAcessiveis` (os 7 rótulos); `clicarEmNegritoMarcaOTextoSelecionado` e `aoMudarRecebeJsonComMarcaBold`; `botaoCaixinhasInsereListaDeTarefas` e clicar numa caixinha marca e dispara `aoMudar` com `checked: true`; `ariaPressedRefleteEstadoAtivo`; `renderizaConteudoInicial` (parágrafo, lista com marcadores e caixinha vindos do JSON); `textoComTagScriptApareceComoTexto` (conteúdo `<script>alert(1)</script>` aparece como texto e nenhum elemento `script` entra no DOM).

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && npx vitest run src/paginas/notas`
Expected: FAIL.

- [ ] **Step 3: Implementar** extensões, editor, barra e hook. Se o jsdom exigir polyfills para o ProseMirror, adicioná-los ao setup de testes sem alterar o comportamento dos outros testes.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd frontend && npx vitest run src/paginas/notas && npm run build && npm run lint`
Expected: PASS, build e lint sem erro.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat(notas): editor Tiptap com barra de formatacao e salvamento automatico"
```

---

### Task 7: Frontend, página Notas, categorias e tela de edição

**Files:**
- Create: `frontend/src/paginas/notas/{NotasPage.tsx,CartaoNota.tsx,FaixaCategorias.tsx,EditorCategoriaNota.tsx,NotaPage.tsx}`
- Modify: `frontend/src/App.tsx` (rotas `/notas` e `/notas/:id` dentro de `RotaProtegida` > `MolduraDoUsuario`), `frontend/src/layout/itensMenu.ts`
- Test: `frontend/src/paginas/notas/{NotasPage.test.tsx,NotaPage.test.tsx,FaixaCategorias.test.tsx}`; ajustar o teste existente do menu/paleta para incluir "Notas"

**Interfaces:**
- Consumes: hooks, tipos e `corDaCategoria` da Task 5; `NotaEditor` e `useAutosave` da Task 6.
- Produces:
  - `NotasPage(): JSX.Element` em `/notas`: campo de busca (espera 300 ms de pausa antes de consultar), botão "Nova nota" (cria já na categoria filtrada, se houver, e navega para `/notas/{id}`), `FaixaCategorias`, grade de `CartaoNota`.
  - `FaixaCategorias({ categorias, selecionada, aoSelecionar })`: chips "Todas", uma por categoria (bolinha com `corDaCategoria`), "Sem categoria" e "+ Categoria". Cada chip de categoria tem acesso a renomear, trocar a cor (as 8 chaves, como botões com `aria-label` do nome da cor) e excluir, em `EditorCategoriaNota`, seguindo o padrão de `paginas/categorias/EditorCategoria.tsx`; a confirmação de excluir diz quantas notas ficarão sem categoria (`totalNotas`). Erro 409 de nome repetido aparece na própria edição.
  - `CartaoNota({ nota, categoria, aoFixar })`: link para `/notas/{id}`, título, prévia, categoria com cor, data da última alteração em pt-BR, botão alfinete com `aria-label` "Fixar na tela inicial" ou "Tirar da tela inicial" e `aria-pressed`. Só uma nota fixada: ao fixar outra, a lista é invalidada e o alfinete anterior apaga.
  - `NotaPage(): JSX.Element` em `/notas/:id`: link "Voltar às notas", título editável, seletor de categoria (inclui "Sem categoria"), alfinete, "Excluir" com confirmação em duas etapas ("Sim, excluir"), `NotaEditor` e o indicador de salvamento ("Salvando…", "Salvo", "Não foi possível salvar. Tentando de novo na próxima alteração."). Salva título, conteúdo e categoria juntos com `useAutosave` e `useSalvarNota`; título vazio não é enviado e mostra "Informe um título." no lugar do indicador. Ao sair da rota, `descarregar()`; `aoSair` usa `endpoints.notas.editar(id, req, { keepalive: true })`. Nota inexistente ou alheia (404): mensagem "Nota não encontrada." com link de volta.
  - Item `{ rotulo: 'Notas', caminho: '/notas' }` em `GRUPOS_MENU`, no grupo sem título, depois de "Tarefas" (atualizar o comentário do arquivo, que cita "Notas, projetos e calendário" como futuros: passam a ser "projetos e calendário"). `/notas/:id` mantém "Notas" ativo no menu.

Estados: carregando (esqueleto), lista vazia ("Nenhuma nota ainda. Crie a primeira."), busca ou filtro sem resultado (mensagem própria), erro de API (mensagem na página). Estilo só por tokens do módulo 1.

- [ ] **Step 1: Escrever os testes que falham** (msw):
  - `NotasPage.test.tsx`: `listaCartoesComTituloPreviaECategoria`; `filtrarPorCategoriaEnviaCategoriaId`; `semCategoriaEnviaSemCategoriaTrue`; `buscarEsperaPausaEEnviaBusca` (timers falsos: digitar não consulta antes de 300 ms); `novaNotaPostENavegaParaEdicao`; `novaNotaNaCategoriaFiltradaEnviaCategoriaId`; `alfineteChamaPatchFixadaEAtualizaALista`; `estadoVazio`, `buscaSemResultado`, `erroDeApi`.
  - `FaixaCategorias.test.tsx`: `criarCategoriaComNomeECor`; `nomeRepetidoMostraErro409`; `renomearETrocarCor`; `excluirPedeConfirmacaoComQuantidadeDeNotas` ("3 notas ficarão sem categoria") e envia DELETE; `categoriaSelecionadaFicaMarcadaComAriaPressed`.
  - `NotaPage.test.tsx`: `carregaTituloConteudoECategoria`; `editarOTextoGravaUmSegundoDepoisComPutCompleto`; `indicadorPassaPorSalvandoESalvo`; `falhaDeRedeMantemOTextoEMostraAviso`; `tituloVazioNaoEnviaEMostraAviso`; `trocarCategoriaGravaComNovoCategoriaId`; `excluirPedeConfirmacaoEEnviaDelete` e volta para `/notas`; `fixarEnviaPatch`; `sairDaRotaComPendenteGravaAntes`; `notaAlheiaMostraNaoEncontrada`.
  - Layout: `menuLateralTemNotasEPaletaEncontraNotas` (digitar "nota" na paleta lista o item e Enter navega para `/notas`).

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && npx vitest run src/paginas/notas src/layout`
Expected: FAIL.

- [ ] **Step 3: Implementar** as páginas, os componentes, as rotas e o item de menu.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd frontend && npx vitest run src/paginas/notas src/layout && npm run build && npm run lint`
Expected: PASS, build e lint sem erro.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat(notas): pagina Notas, categorias, tela de edicao, rotas e menu"
```

---

### Task 8: Frontend, card "Nota fixada" na tela inicial e verificação final

**Files:**
- Create: `frontend/src/paginas/painel/NotaFixada.tsx`, `frontend/src/paginas/notas/ConteudoSomenteLeitura.tsx`
- Modify: `frontend/src/paginas/painel/PainelPage.tsx` (renderizar `<NotaFixada />` depois de `<TarefasDeHoje />` e antes de `<FinancasDoMes />`; os testes existentes do painel ganham um handler msw para `GET /api/notas/fixada` e `GET /api/categorias-nota` sem mudar asserções)
- Test: `frontend/src/paginas/painel/NotaFixada.test.tsx`, `frontend/src/paginas/notas/ConteudoSomenteLeitura.test.tsx`

**Interfaces:**
- Consumes: `useNotaFixada`, `useCategoriasNota`, `useSalvarConteudoNota`, `corDaCategoria` (Task 5); `extensoesNota` (Task 6).
- Produces:
  - `ConteudoSomenteLeitura({ conteudo: ConteudoNota, aoMarcarCaixinha: (novo: ConteudoNota) => void })`: renderiza o conteúdo com o editor Tiptap em modo não editável usando `extensoesNota`, com as caixinhas clicáveis (`TaskItem.configure({ nested: true, onReadOnlyChecked })` ou, se o Tiptap instalado não disparar a atualização em modo leitura, um renderizador próprio que percorre o JSON e devolve o JSON novo). Chama `aoMarcarCaixinha` com o conteúdo inteiro já com o `checked` alterado. Nunca usa `dangerouslySetInnerHTML`.
  - `NotaFixada(): JSX.Element`: `<section aria-labelledby className="card">` irmã de `TarefasDeHoje`, com título "Nota fixada", link "Ver todas" para `/notas`, o título da nota com a bolinha da cor da categoria (cor neutra sem categoria), o `ConteudoSomenteLeitura` com altura máxima e rolagem interna e o link "Abrir nota" para `/notas/{id}`. Marcar uma caixinha chama `useSalvarConteudoNota` (atraso curto de cerca de 300 ms para juntar cliques seguidos, mais descarga ao desmontar) e atualiza o card na hora (atualização otimista; em erro desfaz e mostra "Não foi possível salvar a marcação.").
  - Estados: carregando (esqueleto dentro do card), sem nota fixada (convite curto "Fixe uma nota para vê-la aqui." com link para `/notas`), erro de API (mensagem dentro do card; o resto da tela inicial não é afetado).

- [ ] **Step 1: Escrever os testes que falham** (msw):
  - `ConteudoSomenteLeitura.test.tsx`: `renderizaParagrafosListasECaixinhas`; `clicarNaCaixinhaDevolveConteudoComCheckedAlterado` (só aquele item muda; o resto do JSON fica idêntico); `textoNaoEEditavel` (digitar não altera nada e `aoMarcarCaixinha` não dispara); `scriptEmTextoNaoViraElemento`.
  - `NotaFixada.test.tsx`: `mostraTituloConteudoECorDaCategoria`; `marcarCaixinhaEnviaPatchConteudoComConteudoCompleto`; `doisCliquesSeguidosGeramUmaGravacaoComEstadoFinal`; `erroAoSalvarDesfazAMarcacaoEMostraAviso`; `semNotaFixadaMostraConvite` (link para `/notas`); `erroNaApiMostraMensagemNoCardENaoQuebraOPainel` (GET responde 500; a saudação do `PainelPage` e o card "Hoje" continuam visíveis); `linkAbrirNotaApontaParaAEdicao`; `linkVerTodasApontaParaNotas`; `carregandoNaoBloqueiaASaudacao`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && npx vitest run src/paginas/painel src/paginas/notas`
Expected: FAIL.

- [ ] **Step 3: Implementar** o componente de leitura, o card e a inclusão no `PainelPage`.

- [ ] **Step 4: Verificação completa de frontend e backend**

Run: `cd frontend && npx vitest run && npm run build && npm run lint` e `cd backend && mvn -q test`
Expected: todos os testes PASS (mostrar só o resumo e falhas), build e lint sem erro.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat(painel): card Nota fixada na tela inicial com caixinhas que marcam"
```

---

## Self-review (feito)

- **Cobertura do spec:** modelo da nota e da categoria com validação e paleta (Tasks 1, 3); lista permitida, limites de tamanho e profundidade, texto simples (Task 2); busca no servidor, filtros, prévia e título padrão (Task 3); uma fixada com índice único, troca atômica e corrida (Task 4); marcar caixinha por chamada própria (Tasks 4 e 8); apagar categoria deixando as notas sem categoria e confirmação com quantidade (Tasks 1, 4, 7); barra com os 7 botões e extensões desligadas (Task 6); salvamento automático com estados, falha sem perder texto e descarga ao sair (Tasks 6 e 7); página, faixa de categorias, cards, edição em tela própria e excluir com confirmação (Task 7); card da home com convite, erro isolado e caixinhas (Task 8); menu e paleta (Task 7); isolamento por usuário e 404 em categoria alheia (Tasks 1, 3, 4); sem `dangerouslySetInnerHTML` e nenhum HTML bruto (Tasks 6 e 8). Deploy fica fora, como no spec.
- **Consistência de nomes:** `CategoriaNotaResponse` (`totalNotas`), `NotaResumoResponse`, `NotaResponse`, `NotaFixadaResponse { nota }`, rotas `/api/categorias-nota`, `/api/notas`, `/api/notas/fixada`, `/{id}/fixada`, `/{id}/conteudo`, hooks `useNotas`/`useNota`/`useNotaFixada`/`useCategoriasNota` e mutações iguais nas tasks 5 a 8; `extensoesNota` e `ConteudoNota` iguais nas tasks 6 a 8; `TextoSeguro`, `ConteudoNota.validar`/`textoSimples`/`VAZIO` iguais nas tasks 1 a 4.
- **Review Focus:** cada linha tem teste na task indicada (título hostil e 201 letras: Task 3; conteúdo hostil: Tasks 2 e 3; busca com `%` e `_`: Task 3; fixar e isolamento: Task 4; apagar categoria: Tasks 4 e 7; autosave: Task 6; card: Task 8).
- **Passo a observar na execução:** o formato exato dos atributos que o Tiptap 3 emite para `orderedList` e `taskItem`, e se `onReadOnlyChecked` dispara a atualização em modo não editável. Ambos têm saída prevista no plano (ajustar só a lista permitida; renderizador próprio).
