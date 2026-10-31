# Contas Claras v1 — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> Código Java (inclusive testes): agent `java-spring`. Código de front-end: agent `frontend-developer`. A sessão principal só coordena (CLAUDE.md do dono).

**Goal:** App web responsivo de controle financeiro que substitui a planilha anual do dono: sobra do mês, onde mais gasta, lançamentos pago/previsto, vencimentos, limites de cartão, visão anual, login restrito, no ar.

**Architecture:** Monorepo com `backend/` (API REST Spring Boot, JWT em cookie HttpOnly, Postgres via Flyway) e `frontend/` (SPA React + TS). Em produção, o front fica na Vercel e reescreve `/api/*` para a API no Render, então o cookie é de primeira parte. A importação da planilha é um profile Spring que roda uma vez na máquina do dono contra o banco Neon.

**Tech Stack:** Java 21, Spring Boot 4.1.2 (Web MVC, Security, OAuth2 Resource Server para JWT, Data JPA, Validation, Flyway), PostgreSQL 17, Apache POI, Google API Client (verificação de ID token), JUnit 5, Mockito, Testcontainers. React 19 + TypeScript + Vite, React Router, TanStack Query, Tailwind CSS v4, Recharts, Vitest + Testing Library + MSW.

**Spec:** `docs/superpowers/specs/2026-10-29-contas-claras-design.md`

> **Atualização 2026-10-30 (durante a execução):** o deploy passou a ser um único projeto Vercel com Services (`web` = front Vite, `api` = backend em container) e banco Supabase. Onde este plano cita Render, Neon, `render.yaml` ou rewrite externo em `frontend/vercel.json`, vale o `vercel.json` da raiz (Tasks 16a/16b) e a seção 9 do spec. Na revisão final, a navegação de desktop (abas no topo) passou a valer a partir de 1280 px; abaixo disso vale a navbar inferior (onde o plano diz 768 px).

**Branch:** todo o trabalho em `feat/v1`, com um commit por task e PR para `main` no fim (o dono liberou branch, push, PR e merge neste repo).

## Global Constraints

- Repositório **público**: nenhum dado financeiro real, nome de pessoa da planilha ou caminho da planilha real em código, teste, fixture, doc ou commit. Material real só em `.local/` (git-ignored).
- Dinheiro: `BigDecimal` no Java, `numeric(12,2)` no banco, string decimal no JSON (`"1234.56"`). Nunca `double`/`float`.
- Locale `pt-BR`, moeda BRL (`R$ 1.234,56`), fuso `America/Sao_Paulo`. A data de "hoje" vem de um `java.time.Clock` injetável.
- Paleta: fundo `#F7F7FF`, principal `#27187E`, índigo claro `#A49DDB`, verde `#2E9E5B`, vermelho `#D64545`. Sem laranja.
- Celular: navbar fixa embaixo `Início · Lançamentos · (+) · Cartões · Relatórios`. Computador: abas no topo `Início · Lançamentos · Cartões · Categorias · Relatórios`.
- Toda rota `/api/**` exige sessão, exceto `/api/health`, `/api/auth/login`, `/api/auth/cadastro`, `/api/auth/google`.
- Recurso de outro usuário responde **404**, nunca 403.
- Erros da API: corpo `{"erro": "<mensagem em pt-BR>"}`.
- Cookie de sessão: nome `cc_session`, `HttpOnly`, `Secure` (desligável só no profile `dev` via `app.cookie.secure=false`), `SameSite=Strict`, `Path=/`, `Max-Age` 30 dias. Token nunca vai para `localStorage`.
- Variáveis de ambiente da API: `DATABASE_URL` (JDBC), `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `JWT_SECRET` (≥ 32 bytes), `GOOGLE_CLIENT_ID`, `ALLOWED_EMAILS` (vírgula, sem diferenciar maiúsculas). Front: `VITE_GOOGLE_CLIENT_ID`.
- Spring Boot 4 é modular (ex.: `spring-boot-starter-flyway`, Jackson 3). Antes de escrever configuração ou dependência, consultar a doc atual pelo `ctx7` (ver `~/.claude/rules/context7.md`).
- Comandos: backend `cd backend && ./mvnw -q test` (ou `-Dtest=Classe`); frontend `cd frontend && npm test -- --run`.

## Review Focus

1. **Mês sem dados ou primeiro mês do histórico**: o Início mostra zeros e esconde a comparação com o mês anterior, em vez de quebrar ou dividir por zero. Teste na Task 6.
2. **Dia de vencimento 31 (ou 29/30) em mês curto**: o vencimento vira o último dia do mês (fev/2026 → 28/02). Teste na Task 5.
3. **Valor digitado com vírgula, ponto de milhar ou mais de 2 casas** (`1.234,56`, `251,3`, `10,999`): o front converte e só aceita até 2 casas; a API rejeita mais de 2 casas com 400. Testes nas Tasks 5 e 13.
4. **Primeira chamada com a API dormindo (cold start ~30–60 s)**: o front mostra "Acordando o servidor…" e não desloga nem mostra erro antes de 90 s. Teste na Task 10.
5. **Sessão expirada no meio do uso**: qualquer 401 manda para o login, sem tela em branco e sem loop. Teste na Task 11.

---

## Estrutura de arquivos

```
backend/
  pom.xml, mvnw, .mvn/, Dockerfile
  src/main/resources/application.yml, application-dev.yml, application-importar.yml
  src/main/resources/db/migration/V1__schema.sql
  src/main/java/dev/lmaciel/contasclaras/
    ContasClarasApplication.java
    comum/        ApiErro.java, ApiExceptionHandler.java, NaoEncontradoException.java, ConflitoException.java, ClockConfig.java, Dinheiro.java
    saude/        HealthController.java
    usuario/      Usuario.java, UsuarioRepository.java
    auth/         SecurityConfig.java, TokenService.java, SessaoCookie.java, UsuarioLogado.java, AuthController.java, AuthService.java,
                  EmailsLiberados.java, LimiteTentativasLogin.java, GoogleTokenVerifier.java, GoogleIdTokenVerifierAdapter.java, dto/*.java
    categoria/    Categoria.java, TipoCategoria.java, CategoriaRepository.java, CategoriaService.java, CategoriaController.java, CategoriasPadrao.java, dto/*.java
    item/         Item.java, ItemRepository.java, ItemService.java, ItemController.java, dto/*.java
    lancamento/   Lancamento.java, StatusLancamento.java, LancamentoRepository.java, LancamentoService.java, LancamentoController.java, Vencimento.java, dto/*.java
    resumo/       ResumoService.java, ResumoController.java, dto/*.java
    cartao/       CartaoService.java, CartaoController.java, FaixaUso.java, dto/*.java
    relatorio/    RelatorioService.java, RelatorioController.java, dto/*.java
    importacao/   PlanilhaParser.java, PlanilhaLida.java (records), NomeNormalizado.java, ImportacaoService.java, ImportacaoRunner.java, ImportacaoRecusadaException.java
    demo/         DemoSeeder.java
  src/test/java/dev/lmaciel/contasclaras/...   (espelha main; IntegracaoTest.java = base Testcontainers)
  src/test/java/.../importacao/PlanilhaFicticia.java  (gera o .xlsx fictício em memória com POI)
frontend/
  package.json, vite.config.ts, tsconfig*.json, index.html, vercel.json, public/manifest.webmanifest, public/icon-*.png
  src/main.tsx, src/App.tsx, src/index.css (tokens + Tailwind)
  src/api/cliente.ts, src/api/tipos.ts, src/api/endpoints.ts
  src/formato/moeda.ts, src/formato/mes.ts
  src/auth/AuthProvider.tsx, src/auth/RotaProtegida.tsx, src/auth/LoginPage.tsx, src/auth/CadastroPage.tsx, src/auth/BotaoGoogle.tsx, src/auth/DefinirSenhaPage.tsx
  src/layout/AppShell.tsx, src/layout/AbasTopo.tsx, src/layout/NavbarInferior.tsx, src/layout/SeletorMes.tsx, src/layout/useMesSelecionado.ts, src/layout/AvisoServidor.tsx
  src/paginas/inicio/*, src/paginas/lancamentos/*, src/paginas/cartoes/*, src/paginas/categorias/*, src/paginas/relatorios/*
  src/teste/servidor.ts (MSW), src/teste/setup.ts, src/teste/render.tsx
render.yaml, .github/workflows/ci.yml, .env.example, README.md
```

---

## Backend

### Task 1: Esqueleto da API, schema e health

**Files:**
- Create: `backend/pom.xml`, `backend/mvnw` + `.mvn/` (wrapper Maven 3.9.x), `ContasClarasApplication.java`, `application.yml`, `application-dev.yml`, `db/migration/V1__schema.sql`, `comum/ClockConfig.java`, `comum/ApiErro.java`, `comum/ApiExceptionHandler.java`, `comum/NaoEncontradoException.java`, `comum/ConflitoException.java`, `saude/HealthController.java`
- Test: `IntegracaoTest.java` (base), `saude/HealthControllerTest.java`, `SchemaTest.java`

**Interfaces:**
- Produces: `abstract class IntegracaoTest` (`@SpringBootTest(webEnvironment=RANDOM_PORT)` + `@Testcontainers` com `PostgreSQLContainer("postgres:17-alpine")` e `@ServiceConnection`; expõe `MockMvc mvc` e um `Clock` fixo em `2026-10-29T12:00-03:00` via `@TestConfiguration`). `record ApiErro(String erro)`. `NaoEncontradoException` → 404, `ConflitoException(String msg)` → 409, `MethodArgumentNotValidException`/`ConstraintViolation` → 400 com a primeira mensagem. `@Bean Clock clock()` = `Clock.system(ZoneId.of("America/Sao_Paulo"))`.
- Schema (`V1__schema.sql`), nomes exatos:
  - `usuario(id bigserial pk, nome varchar(120) not null, email varchar(254) not null unique, senha_hash varchar(100), google_sub varchar(255) unique, criado_em timestamptz not null default now())`. E-mail sempre gravado em minúsculas.
  - `categoria(id bigserial pk, usuario_id bigint not null fk→usuario on delete cascade, nome varchar(80) not null, tipo varchar(10) not null check (tipo in ('RECEITA','DESPESA')), ordem int not null, unique(usuario_id, nome))`
  - `item(id bigserial pk, categoria_id bigint not null fk→categoria on delete cascade, nome varchar(120) not null, dia_vencimento smallint check (dia_vencimento between 1 and 31), cartao boolean not null default false, limite numeric(12,2) check (limite > 0), arquivado boolean not null default false, unique(categoria_id, nome))`
  - `lancamento(id bigserial pk, item_id bigint not null fk→item on delete cascade, ano smallint not null check (ano between 2000 and 2100), mes smallint not null check (mes between 1 and 12), valor numeric(12,2) not null check (valor > 0), status varchar(10) not null check (status in ('PREVISTO','PAGO')), vencimento date, unique(item_id, ano, mes))`
  - Índices: `categoria(usuario_id)`, `item(categoria_id)`, `lancamento(ano, mes)`.

- [ ] **Step 1: Gerar o projeto** (Spring Boot 4.1.2, Java 21, groupId `dev.lmaciel`, artifactId `contas-claras`, pacote `dev.lmaciel.contasclaras`; starters web, security, oauth2-resource-server, data-jpa, validation, flyway + `flyway-database-postgresql`, postgresql, testcontainers-postgresql, spring-boot-testcontainers). `application.yml` lê `DATABASE_URL`/`DATABASE_USERNAME`/`DATABASE_PASSWORD`, `spring.jpa.hibernate.ddl-auto=validate`, `spring.jpa.open-in-view=false`, `server.forward-headers-strategy=framework`. `application-dev.yml` aponta para Postgres local (`jdbc:postgresql://localhost:5432/contasclaras`, usuário/senha `contas`) e `app.cookie.secure=false`.
- [ ] **Step 2: Escrever os testes que falham**
  - `HealthControllerTest.health_responde_ok_sem_login`: `GET /api/health` → 200, `$.status == "ok"`.
  - `SchemaTest.flyway_cria_tabelas`: `information_schema.tables` contém `usuario`, `categoria`, `item`, `lancamento`.
  - `SchemaTest.lancamento_rejeita_valor_zero`: insert com `valor = 0` via `JdbcTemplate` lança `DataIntegrityViolationException`.
- [ ] **Step 3: Rodar** `./mvnw -q test` → FAIL (controller e migration ausentes).
- [ ] **Step 4: Implementar** `V1__schema.sql`, `HealthController` (`GET /api/health` → `{"status":"ok"}`), `comum/*`. Nesta task, `SecurityConfig` provisório libera só `/api/health` (será substituído na Task 2).
- [ ] **Step 5: Rodar** `./mvnw -q test` → PASS.
- [ ] **Step 6: Commit** `feat(api): esqueleto Spring Boot, schema Flyway e health`

### Task 2: Cadastro, login por senha e sessão em cookie

**Files:**
- Create: `usuario/Usuario.java`, `usuario/UsuarioRepository.java`, `auth/SecurityConfig.java`, `auth/TokenService.java`, `auth/SessaoCookie.java`, `auth/UsuarioLogado.java`, `auth/EmailsLiberados.java`, `auth/LimiteTentativasLogin.java`, `auth/AuthService.java`, `auth/AuthController.java`, `auth/dto/{CadastroRequest,LoginRequest,UsuarioResponse,DefinirSenhaRequest}.java`, `categoria/{Categoria,TipoCategoria,CategoriaRepository,CategoriasPadrao}.java`
- Test: `auth/AuthControllerTest.java`, `auth/EmailsLiberadosTest.java`, `auth/LimiteTentativasLoginTest.java`

**Interfaces:**
- Consumes: Task 1 (`IntegracaoTest`, schema, `ApiErro`).
- Produces:
  - `record UsuarioLogado(long id)` — resolvido em controllers por `@AuthenticationPrincipal Jwt jwt` → `UsuarioLogado.de(jwt)` (claim `sub` = id do usuário).
  - `TokenService.emitir(long usuarioId): String` (JWT HS256, `JWT_SECRET`, expira em 30 dias); validação pelo resource server com `NimbusJwtDecoder.withSecretKey`.
  - `SessaoCookie.criar(String token): ResponseCookie`, `SessaoCookie.limpar(): ResponseCookie` (regras do cookie em Global Constraints). `BearerTokenResolver` customizado lê o cookie `cc_session`.
  - `EmailsLiberados.permite(String email): boolean` (lê `ALLOWED_EMAILS`, separa por vírgula, `trim` + minúsculas).
  - `CategoriasPadrao.criarPara(Usuario u)` — cria, nesta ordem e com `ordem` 0..10: Receitas (RECEITA), Doméstica, Transporte, Entretenimento, Saúde, Dívidas/Empréstimos, Cartões de crédito, Bancos, Obrigações financeiras, Pagamentos diversos, Pessoais (todas DESPESA).
  - `AuthService.criarUsuario(String nome, String email, String senhaHashOuNull, String googleSubOuNull): Usuario` — único lugar que cria usuário; sempre chama `CategoriasPadrao.criarPara`.
  - Endpoints:
    - `POST /api/auth/cadastro {nome, email, senha}` → 201 + cookie + `UsuarioResponse{id, nome, email, temSenha}`.
    - `POST /api/auth/login {email, senha}` → 200 + cookie.
    - `POST /api/auth/logout` → 204 + cookie limpo.
    - `GET /api/auth/me` → 200 `UsuarioResponse`.
    - `PUT /api/auth/senha {senha}` → 204.
  - Validação: `nome` 1–120; `email` válido; `senha` 8–72 caracteres. Hash BCrypt.
  - CSRF desligado de propósito: cookie `SameSite=Strict` + endpoints de escrita só aceitam `application/json`. Colocar esse motivo num comentário curto no `SecurityConfig`.
  - Sem CORS: o front chama pelo mesmo domínio.

- [ ] **Step 1: Escrever os testes que falham** (`ALLOWED_EMAILS=dono@exemplo.com,outra@exemplo.com` no teste)
  - `cadastro_com_email_liberado_cria_usuario_e_seta_cookie`: 201; header `Set-Cookie` contém `cc_session=`, `HttpOnly`, `SameSite=Strict`; `$.temSenha == true`.
  - `cadastro_cria_11_categorias_padrao`: depois do cadastro, a tabela `categoria` do usuário tem 11 linhas e a de `ordem = 0` é `Receitas` / `RECEITA`.
  - `cadastro_com_email_nao_liberado_retorna_403`: `$.erro == "Cadastro não permitido para este e-mail."`.
  - `cadastro_normaliza_email`: `" Dono@Exemplo.com "` é aceito e gravado como `dono@exemplo.com`.
  - `cadastro_repetido_retorna_409`: `$.erro == "E-mail já cadastrado."`.
  - `cadastro_com_senha_curta_retorna_400`.
  - `login_com_senha_certa_retorna_200_e_cookie`.
  - `login_com_senha_errada_retorna_401`: `$.erro == "E-mail ou senha inválidos."`; mesma resposta para e-mail inexistente e para usuário sem senha.
  - `me_sem_cookie_retorna_401` e `me_com_cookie_retorna_usuario`.
  - `logout_limpa_cookie`: `Set-Cookie` com `Max-Age=0`.
  - `definir_senha_logado_permite_login_com_nova_senha`.
  - `EmailsLiberadosTest`: lista vazia não permite ninguém; comparação ignora maiúsculas e espaços.
  - `LimiteTentativasLoginTest`: 5 falhas seguidas do mesmo e-mail em 15 min bloqueiam; a 6ª tentativa retorna 429 `{"erro":"Muitas tentativas. Tente de novo em alguns minutos."}`, mesmo com senha certa; depois de 15 min (Clock avançado) libera; login certo zera o contador.
- [ ] **Step 2: Rodar** `./mvnw -q test -Dtest='Auth*,EmailsLiberados*,LimiteTentativas*'` → FAIL.
- [ ] **Step 3: Implementar** as classes acima. `LimiteTentativasLogin` fica em memória (`ConcurrentHashMap<email, janela>`), usando o `Clock`.
- [ ] **Step 4: Rodar** de novo → PASS; rodar `./mvnw -q test` (tudo) → PASS.
- [ ] **Step 5: Commit** `feat(api): cadastro restrito, login por senha e sessão JWT em cookie`

### Task 3: Login com Google

**Files:**
- Create: `auth/GoogleTokenVerifier.java` (interface), `auth/GoogleIdTokenVerifierAdapter.java`, `auth/dto/GoogleLoginRequest.java`
- Modify: `auth/AuthService.java`, `auth/AuthController.java`, `pom.xml` (`com.google.api-client:google-api-client`)
- Test: `auth/GoogleLoginTest.java`

**Interfaces:**
- Consumes: Task 2 (`AuthService.criarUsuario`, `TokenService`, `SessaoCookie`, `EmailsLiberados`).
- Produces:
  - `interface GoogleTokenVerifier { Optional<IdentidadeGoogle> verificar(String idToken); }` com `record IdentidadeGoogle(String sub, String email, boolean emailVerificado, String nome)`.
  - O adapter usa `GoogleIdTokenVerifier` com audience `GOOGLE_CLIENT_ID`.
  - `POST /api/auth/google {credential}` → 200 + cookie + `UsuarioResponse`.
  - Regras, nesta ordem:
    1. Token inválido → 401 `"Login Google inválido."`.
    2. `emailVerificado == false` → 401, mesma mensagem.
    3. Já existe usuário com esse `google_sub` → login.
    4. Existe usuário com o mesmo e-mail → grava `google_sub`, **zera `senha_hash`** e faz login.
    5. E-mail liberado → `criarUsuario(nome, email, null, sub)`.
    6. Senão → 403 `"Cadastro não permitido para este e-mail."`.

- [ ] **Step 1: Escrever os testes que falham** (`@MockitoBean GoogleTokenVerifier`)
  - `google_token_invalido_retorna_401`.
  - `google_email_nao_verificado_retorna_401`.
  - `google_primeiro_login_com_email_liberado_cria_usuario_sem_senha`: `$.temSenha == false` e 11 categorias criadas.
  - `google_email_nao_liberado_retorna_403`.
  - `google_vincula_conta_com_senha_e_apaga_senha`: com usuário cadastrado por senha, o login Google faz `senha_hash` ficar `null`, e o login por senha antigo passa a retornar 401.
  - `google_segundo_login_usa_google_sub`: mesmo `sub` com e-mail diferente no token entra no mesmo usuário.
- [ ] **Step 2: Rodar** `./mvnw -q test -Dtest=GoogleLoginTest` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar** `./mvnw -q test` → PASS.
- [ ] **Step 5: Commit** `feat(api): login com Google e vínculo com conta existente`

### Task 4: Categorias e itens

**Files:**
- Create: `categoria/CategoriaService.java`, `categoria/CategoriaController.java`, `categoria/dto/{CategoriaRequest,CategoriaResponse,OrdemRequest}.java`, `item/{Item,ItemRepository,ItemService,ItemController}.java`, `item/dto/{ItemRequest,ItemResponse}.java`
- Test: `categoria/CategoriaControllerTest.java`, `item/ItemControllerTest.java`

**Interfaces:**
- Consumes: Task 2 (`UsuarioLogado`, entidades `Categoria`, `TipoCategoria`).
- Produces:
  - Endpoints:
    - `GET /api/categorias` → `[CategoriaResponse{id, nome, tipo, ordem, itens: [ItemResponse{id, nome, diaVencimento, cartao, limite, arquivado}]}]`, ordenado por `ordem` e itens por `nome`.
    - `POST /api/categorias {nome, tipo}` → 201; entra com `ordem = max + 1`.
    - `PUT /api/categorias/{id} {nome}` → 200.
    - `PUT /api/categorias/ordem {ids: [..]}` → 204; a lista precisa conter exatamente as categorias do usuário, senão 400.
    - `DELETE /api/categorias/{id}` → 204; se tiver lançamento → 409 `"Categoria tem lançamentos. Arquive os itens em vez de apagar."`.
    - `POST /api/categorias/{categoriaId}/itens {nome, diaVencimento?, cartao, limite?}` → 201.
    - `PUT /api/itens/{id} {nome, diaVencimento, cartao, limite, arquivado}` → 200.
  - Nome duplicado (mesma categoria/usuário) → 409 `"Já existe um item com esse nome."` / `"Já existe uma categoria com esse nome."`.
  - `diaVencimento` 1–31; `limite` > 0 com até 2 casas.
  - `ItemService.buscarDoUsuario(long itemId, UsuarioLogado u): Item` — lança `NaoEncontradoException` se o item não for do usuário. Tasks 5–7 usam esse método.

- [ ] **Step 1: Escrever os testes que falham**
  - `lista_categorias_do_usuario_em_ordem`.
  - `cria_categoria_no_fim_da_ordem`.
  - `categoria_de_outro_usuario_retorna_404` (GET via item, PUT, DELETE).
  - `apagar_categoria_com_lancamento_retorna_409` (insere lançamento por `JdbcTemplate`).
  - `reordenar_com_ids_incompletos_retorna_400`.
  - `cria_item_cartao_com_limite`.
  - `item_dia_vencimento_32_retorna_400`.
  - `arquivar_item_mantem_no_get_com_arquivado_true`.
  - `item_nome_duplicado_retorna_409`.
- [ ] **Step 2: Rodar** `./mvnw -q test -Dtest='Categoria*,Item*'` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar** `./mvnw -q test` → PASS.
- [ ] **Step 5: Commit** `feat(api): CRUD de categorias e itens`

### Task 5: Lançamentos

**Files:**
- Create: `lancamento/{Lancamento,StatusLancamento,LancamentoRepository,LancamentoService,LancamentoController,Vencimento}.java`, `lancamento/dto/{SalvarLancamentoRequest,MesAno,LancamentoResponse,StatusRequest}.java`, `comum/Dinheiro.java`
- Test: `lancamento/VencimentoTest.java`, `lancamento/LancamentoControllerTest.java`

**Interfaces:**
- Consumes: Task 4 (`ItemService.buscarDoUsuario`).
- Produces:
  - `Vencimento.padrao(int ano, int mes, Integer dia): LocalDate` (`null` se `dia == null`; dia maior que o mês vira o último dia).
  - `Dinheiro.validar(BigDecimal v)`: > 0, ≤ `9999999999.99`, escala ≤ 2. Senão 400 `"Valor inválido."`.
  - `record MesAno(int ano, int mes)` (comparável).
  - Endpoints:
    - `GET /api/lancamentos?ano=&mes=` → `[LancamentoResponse{id, itemId, itemNome, categoriaId, categoriaNome, tipo, ano, mes, valor, status, vencimento}]`, ordenado por ordem da categoria e nome do item.
    - `PUT /api/lancamentos {itemId, ano, mes, valor, status, vencimento?, repetirAte?: {ano, mes}}` → 200 `[LancamentoResponse]` (o lançamento salvo primeiro, depois os repetidos criados). É upsert por `(itemId, ano, mes)`. Se `vencimento` vier nulo, usa `Vencimento.padrao` com o dia do item.
    - `PATCH /api/lancamentos/{id}/status {status}` → 200.
    - `DELETE /api/lancamentos/{id}` → 204.
  - **Repetir até**: para cada mês depois de `(ano, mes)` até `repetirAte` inclusive, cria `PREVISTO` com o mesmo valor e vencimento padrão, **só se o mês ainda não tem lançamento** desse item. `repetirAte` ≤ `(ano, mes)` ou mais de 60 meses à frente → 400 `"Período de repetição inválido."`.
  - Item arquivado não aceita lançamento novo → 409 `"Item arquivado."` (editar lançamento existente continua permitido).

- [ ] **Step 1: Escrever os testes que falham**
  - `VencimentoTest`: `padrao(2026, 2, 31) == 2026-02-28`; `padrao(2028, 2, 30) == 2028-02-29`; `padrao(2026, 11, 20) == 2026-11-20`; `padrao(2026, 4, null) == null`.
  - `salvar_cria_lancamento_com_vencimento_padrao_do_item` (item dia 10, nov/2026 → `2026-11-10`).
  - `salvar_de_novo_no_mesmo_mes_edita_em_vez_de_duplicar` (valor muda de `180.40` para `190.00`; GET retorna 1 item).
  - `valor_com_tres_casas_retorna_400` (`"10.999"`) e `valor_zero_retorna_400`.
  - `repetir_ate_cria_previstos_sem_sobrescrever`: existe dez/2026 = `650.00 PAGO`. Salvar out/2026 `500.00 PAGO` com `repetirAte = 2027-01` cria nov/2026 e jan/2027 `500.00 PREVISTO` e deixa dez/2026 intacto. A resposta tem 3 itens.
  - `repetir_ate_mais_de_60_meses_retorna_400`.
  - `patch_status_marca_pago`.
  - `lancamento_de_outro_usuario_retorna_404` (PATCH, DELETE e PUT com `itemId` alheio).
  - `item_arquivado_recusa_lancamento_novo`.
- [ ] **Step 2: Rodar** `./mvnw -q test -Dtest='Vencimento*,Lancamento*'` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar** `./mvnw -q test` → PASS.
- [ ] **Step 5: Commit** `feat(api): lançamentos com upsert mensal, status e repetição`

### Task 6: Resumo do mês (Início)

**Files:**
- Create: `resumo/ResumoService.java`, `resumo/ResumoController.java`, `resumo/dto/{ResumoMes,TotaisMes,CategoriaTotal,ProximaConta,PontoSerie}.java`
- Test: `resumo/ResumoServiceTest.java` (integração), `resumo/ResumoControllerTest.java`

**Interfaces:**
- Consumes: Task 5 (`LancamentoRepository`), `Clock`.
- Produces: `GET /api/resumo?ano=&mes=` → `ResumoMes`:
  - `receitas`, `despesas`, `sobra` (mês selecionado, pago + previsto).
  - `sobraAno`: soma das sobras dos 12 meses do ano.
  - `anterior: TotaisMes{receitas, despesas, sobra} | null`. É `null` quando o mês anterior não tem nenhum lançamento; jan usa dez do ano anterior.
  - `categorias: [CategoriaTotal{categoriaId, nome, total, percentual}]`: só categorias `DESPESA` com total > 0, em ordem decrescente de total. `percentual` = total ÷ despesas com 4 casas (ex.: `0.4815`); com despesas = 0, a lista vem vazia.
  - `proximas: [ProximaConta{lancamentoId, itemNome, categoriaNome, valor, vencimento, atrasada}]`: despesas `PREVISTO` com `vencimento` não nulo e `vencimento ≤ hoje + 30 dias`, ordenadas por vencimento. `atrasada = vencimento < hoje`. "Hoje" vem do `Clock` e **não depende do mês selecionado**.
  - `serieAno: [PontoSerie{mes, receitas, receitasPrevistas, despesas, despesasPrevistas}]` com 12 posições (mês 1..12). `receitasPrevistas`/`despesasPrevistas` são a parte `PREVISTO` dos totais.

- [ ] **Step 1: Escrever os testes que falham** (Clock fixo em 2026-10-29)
  - `resumo_calcula_receitas_despesas_e_sobra` (receita 5000.00, despesas 3000.00 + 1200.50 → sobra `799.50`).
  - `resumo_sem_mes_anterior_retorna_anterior_null`.
  - `resumo_janeiro_compara_com_dezembro_do_ano_anterior`.
  - `mes_sem_dados_retorna_zeros_e_listas_vazias` (Review Focus 1): `receitas == 0`, `despesas == 0`, `categorias == []`, `percentual` sem divisão por zero.
  - `categorias_ordenadas_por_total_com_percentual`.
  - `proximas_inclui_atrasadas_e_ate_30_dias_e_ignora_pagas`: previsto vencido em 2026-10-20 aparece `atrasada=true`; previsto em 2026-11-20 aparece; previsto em 2026-12-15 não aparece; pago em 2026-11-05 não aparece.
  - `serie_ano_tem_12_meses_e_separa_previsto`.
  - `resumo_so_conta_dados_do_usuario_logado`.
- [ ] **Step 2: Rodar** `./mvnw -q test -Dtest='Resumo*'` → FAIL.
- [ ] **Step 3: Implementar** com consultas agregadas no repositório (`group by` categoria/mês/status), sem carregar todos os lançamentos.
- [ ] **Step 4: Rodar** `./mvnw -q test` → PASS.
- [ ] **Step 5: Commit** `feat(api): resumo do mês para a tela inicial`

### Task 7: Cartões e relatório anual

**Files:**
- Create: `cartao/{CartaoService,CartaoController,FaixaUso}.java`, `cartao/dto/{CartoesMes,CartaoUso}.java`, `relatorio/{RelatorioService,RelatorioController}.java`, `relatorio/dto/{RelatorioAno,CategoriaAno,ItemAno,CelulaMes}.java`
- Test: `cartao/CartaoControllerTest.java`, `cartao/FaixaUsoTest.java`, `relatorio/RelatorioControllerTest.java`

**Interfaces:**
- Consumes: Tasks 4–5.
- Produces:
  - `FaixaUso.de(BigDecimal uso): FaixaUso`: `VERDE` se uso ≤ 0.50, `AMARELO` se ≤ 0.80, `VERMELHO` acima; `SEM_LIMITE` quando o limite é nulo.
  - `GET /api/cartoes?ano=&mes=` → `CartoesMes{totalFaturas, limiteTotal, usoGeral, cartoes: [CartaoUso{itemId, nome, diaVencimento, fatura, limite, uso, faixa}]}`.
    - Inclui itens com `cartao = true` e não arquivados.
    - `fatura` é o lançamento do mês (0 se não houver).
    - `uso` = fatura ÷ limite com 4 casas.
    - `limiteTotal` e `usoGeral` consideram só cartões com limite; `usoGeral` é `null` se `limiteTotal == 0`.
    - Ordem: maior fatura primeiro.
  - `GET /api/relatorios/ano/{ano}` → `RelatorioAno{ano, categorias: [CategoriaAno{categoriaId, nome, tipo, itens: [ItemAno{itemId, nome, meses: CelulaMes[12], total}], totaisMes: BigDecimal[12], total}], receitasMes[12], despesasMes[12], diferencaMes[12], receitasAno, despesasAno, diferencaAno}`.
    - `CelulaMes{valor, status}` ou `null` no mês sem lançamento.
    - Ficam só itens com algum lançamento no ano, incluindo arquivados.
    - Categorias em `ordem`, primeiro as `RECEITA`.

- [ ] **Step 1: Escrever os testes que falham**
  - `FaixaUsoTest`: `0.50 → VERDE`, `0.5001 → AMARELO`, `0.80 → AMARELO`, `0.81 → VERMELHO`, `null → SEM_LIMITE`.
  - `cartoes_calcula_uso_por_cartao_e_geral`: cartão A com fatura 730.00 e limite 1000.00 dá `uso 0.7300 AMARELO`; cartão B com fatura 200.00 sem limite dá `SEM_LIMITE`; resultado `limiteTotal 1000.00` e `usoGeral 0.7300`.
  - `cartao_sem_lancamento_no_mes_tem_fatura_zero`.
  - `cartoes_ignora_item_arquivado_e_nao_cartao`.
  - `relatorio_tem_12_meses_e_totais`: soma dos `totaisMes` = `total`; `diferencaMes[i] = receitasMes[i] − despesasMes[i]`.
  - `relatorio_marca_status_por_celula_e_null_sem_lancamento`.
  - `relatorio_de_outro_usuario_nao_vaza_dados`.
- [ ] **Step 2: Rodar** `./mvnw -q test -Dtest='Cartao*,FaixaUso*,Relatorio*'` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar** `./mvnw -q test` → PASS.
- [ ] **Step 5: Commit** `feat(api): uso de limite dos cartões e relatório anual`

### Task 8: Parser da planilha

**Files:**
- Create: `importacao/PlanilhaParser.java`, `importacao/PlanilhaLida.java`, `importacao/NomeNormalizado.java`; dependência `org.apache.poi:poi-ooxml` no `pom.xml`
- Test: `importacao/PlanilhaFicticia.java` (helper de teste), `importacao/PlanilhaParserTest.java`, `importacao/NomeNormalizadoTest.java`

**Interfaces:**
- Consumes: `MesAno` (Task 5), `TipoCategoria` (Task 2).
- Produces:
  - `record PlanilhaLida(List<CategoriaLida> categorias)`.
  - `record CategoriaLida(String nome, TipoCategoria tipo, List<ItemLido> itens)`.
  - `record ItemLido(String nome, Integer diaVencimento, boolean cartao, SortedMap<MesAno, ValorLido> valores)`.
  - `record ValorLido(BigDecimal valor, boolean pago)`.
  - `PlanilhaParser.ler(InputStream xlsx): PlanilhaLida` — puro: sem Spring e sem banco.
  - `NomeNormalizado.chave(String nome): String` — maiúsculas, sem acento (`Normalizer` NFD + remove marcas), espaços colapsados, `trim`; aplica o alias `DIVIDAS` → `DIVIDAS/EMPRESTIMOS`.
  - `NomeNormalizado.separarVencimento(String nome): (String nomeSemSufixo, Integer dia)` — regex `^(.*?)\s*\((\d{1,2})\)\s*$`; o dia só vale entre 1 e 31.
- Regras do parser (spec §8):
  - Lê só abas cujo nome casa `^\d{4}$`. Bloco começa onde a coluna C = `JAN`; a coluna B é a categoria (`RECEITAS` → `RECEITA`, demais → `DESPESA`).
  - Itens até B = `TOTAL`; o bloco `TOTAIS` encerra a aba. Colunas C..N = meses 1..12, coluna O ignorada.
  - Fórmula usa o valor em cache. Vazio, texto ou 0 é ignorado. Valor arredondado a 2 casas `HALF_UP`.
  - `pago` = cor da fonte da célula com tema 9 (accent6) **ou** ARGB `FF70AD47`.
  - Categorias e itens casam entre anos pela `chave`. O nome exibido e o `diaVencimento` vêm do ano mais recente em que aparecem.
  - Nome repetido no mesmo bloco/ano recebe sufixo ` 2`, ` 3` por ordem.
  - Categoria cuja chave começa com `CARTOES DE CREDITO` → itens com `cartao = true`.
  - Ordem das categorias e itens = primeira aparição.
- Planilha fictícia (`PlanilhaFicticia.gerar(): byte[]`, construída com POI em memória). Só nomes e valores inventados:
  - Aba `2025`:
    - `RECEITAS`: `SALARIO` com jan 3000.00 verde e fev 3000.00 preto; `FREELA` com jan 500.555 (vira 500.56).
    - `DIVIDAS`: `EMPRESTIMO A` com jan 100.00 verde.
    - `DOMESTICA`: `LUZ (10)` com jan 150.00 verde; `AGUA` com jan 0 e fev vazio.
    - `TOTAIS` em seguida.
  - Aba `2026`:
    - `RECEITAS`: `SALARIO` com jan 3200.00 verde.
    - `DIVIDAS/EMPRESTIMOS`: `EMPRESTIMO A` com fev 100.00 vermelho (`FFC00000`).
    - `DOMÉSTICA`: `LUZ (12)` com jan 160.00 verde (célula com fórmula `=150+10`); `ALUGUEL` duas vezes, jan 900.00 e jan 50.00.
    - `CARTÕES DE CREDITO - TESTE`: `CARTAO X (05)` com jan 700.00 verde.
    - Linha `TOTAL` em cada bloco.
    - `TOTAIS` seguido de uma anotação solta `J116 = 20000`.
  - Aba `ANOTACOES` com um bloco válido (`JAN` na coluna C), que precisa ser ignorado.

- [ ] **Step 1: Escrever os testes que falham**
  - `NomeNormalizadoTest`:
    - `chave("  Cartões  de Crédito ") == "CARTOES DE CREDITO"`.
    - `chave("DIVIDAS") == "DIVIDAS/EMPRESTIMOS"`.
    - `separarVencimento("LUZ (10)") == ("LUZ", 10)`.
    - `separarVencimento("LICENCIAMENTO (JUNHO)") == ("LICENCIAMENTO (JUNHO)", null)`.
    - `separarVencimento("X (45)") == ("X (45)", null)`.
  - `PlanilhaParserTest` (sobre `PlanilhaFicticia.gerar()`):
    - `le_so_abas_de_ano`: nenhuma categoria vem da aba `ANOTACOES`.
    - `receitas_viram_categoria_receita`.
    - `verde_e_pago_preto_e_vermelho_sao_previstos`.
    - `usa_valor_em_cache_da_formula`: LUZ jan/2026 = 160.00.
    - `ignora_zero_vazio_e_linhas_total_e_abaixo_de_totais`.
    - `arredonda_para_duas_casas`: FREELA = 500.56.
    - `casa_item_entre_anos_e_usa_vencimento_mais_recente`: um único item `LUZ`, `diaVencimento = 12`, com jan/2025 e jan/2026.
    - `alias_dividas_junta_categorias`: uma categoria, nome exibido `DIVIDAS/EMPRESTIMOS`, item `EMPRESTIMO A` com 2 valores.
    - `nome_repetido_no_bloco_vira_sufixo`: `ALUGUEL` 900.00 e `ALUGUEL 2` 50.00.
    - `itens_de_cartoes_de_credito_sao_cartao`: `CARTAO X` com `cartao = true` e dia 5.
- [ ] **Step 2: Rodar** `./mvnw -q test -Dtest='PlanilhaParser*,NomeNormalizado*'` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar** de novo → PASS.
- [ ] **Step 5: Commit** `feat(importacao): parser da planilha anual com fixture fictícia`

### Task 9: Importação para a conta (troca única)

**Files:**
- Create: `importacao/ImportacaoService.java`, `importacao/ImportacaoRunner.java`, `importacao/ImportacaoRecusadaException.java`, `src/main/resources/application-importar.yml`
- Test: `importacao/ImportacaoServiceTest.java`

**Interfaces:**
- Consumes: Task 8 (`PlanilhaLida`), Task 2 (`UsuarioRepository`), entidades das Tasks 4–5.
- Produces:
  - `ImportacaoService.importar(String email, PlanilhaLida planilha): ResumoImportacao` (`@Transactional`) com `record ResumoImportacao(SortedMap<Integer, TotaisAno> porAno, int categorias, int itens, int lancamentos)` e `record TotaisAno(BigDecimal receitas, BigDecimal despesas)`.
  - Usuário inexistente → `ImportacaoRecusadaException("Usuário não encontrado: <email>")`.
  - Usuário com qualquer lançamento → `ImportacaoRecusadaException("A conta já tem lançamentos. A importação só roda numa conta vazia.")`.
  - Antes de gravar, apaga as categorias do usuário (estão vazias). Grava categorias com `ordem` 0..n, itens e lançamentos. O vencimento de cada lançamento é `Vencimento.padrao(ano, mes, diaVencimento)`.
  - `ImportacaoRunner` (`@Profile("importar")`, `ApplicationRunner`) lê `--importar.arquivo` e `--importar.email`, chama o parser e o service, imprime uma tabela `ano | receitas | despesas | diferença` e encerra com código 0 (ou 1 com a mensagem de erro).
  - `application-importar.yml`: `spring.main.web-application-type: none`.
  - Uso: `./mvnw spring-boot:run -Dspring-boot.run.profiles=importar -Dspring-boot.run.arguments="--importar.arquivo=<caminho> --importar.email=<email>"`.

- [ ] **Step 1: Escrever os testes que falham** (planilha = `PlanilhaFicticia.gerar()` lida pelo parser)
  - `importa_em_conta_nova_e_remove_categorias_padrao`: depois de importar, não sobra `Cartões de crédito` padrão e existem as categorias da planilha.
  - `resumo_totais_por_ano_batem_com_a_fixture`: 2025 receitas `6500.56`, despesas `250.00`; 2026 receitas `3200.00`, despesas `1910.00`.
  - `lancamentos_tem_status_e_vencimento`: LUZ jan/2026 tem vencimento `2026-01-12` e `PAGO`; EMPRESTIMO A fev/2026 é `PREVISTO`.
  - `recusa_conta_com_lancamentos` (e não altera nada).
  - `recusa_usuario_inexistente`.
- [ ] **Step 2: Rodar** `./mvnw -q test -Dtest=ImportacaoServiceTest` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar** `./mvnw -q test` → PASS.
- [ ] **Step 5: Commit** `feat(importacao): importação única para a conta do dono`

---

## Frontend

Referência visual: `.local/mockups/dashboard-indigo.html` e `.local/mockups/cartoes-lancar.html` (só na máquina do dono, com números reais; **não copiar os números para o código**). Testes de página usam MSW com dados fictícios.

### Task 10: Esqueleto do front, layout e cliente da API

**Files:**
- Create: `frontend/` (Vite React TS), `vite.config.ts` (proxy `/api` → `http://localhost:8080` em dev), `vercel.json`, `public/manifest.webmanifest`, `public/icon-192.png`, `public/icon-512.png`, `src/index.css`, `src/main.tsx`, `src/App.tsx`, `src/api/{cliente,tipos,endpoints}.ts`, `src/formato/{moeda,mes}.ts`, `src/layout/{AppShell,AbasTopo,NavbarInferior,SeletorMes,useMesSelecionado,AvisoServidor}.tsx`, `src/teste/{servidor,setup,render}.ts(x)`
- Test: `src/formato/moeda.test.ts`, `src/formato/mes.test.ts`, `src/api/cliente.test.ts`, `src/layout/AppShell.test.tsx`

**Interfaces:**
- Produces:
  - `formatarMoeda(v: string | number): string` → `"R$ 1.234,56"`; negativo `"-R$ 6,20"` (formato do `Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})`).
  - `lerValor(texto: string): string | null` → aceita `"1.234,56"`, `"251,3"`, `"10"`, `"10.50"`. Devolve string decimal com ponto (`"1234.56"`, `"251.30"`); devolve `null` se tiver mais de 2 casas, for ≤ 0 ou não for número.
  - `nomeMes(m: number): string` (`"Outubro"`), `rotuloMes(ano, mes): string` (`"Outubro 2026"`), `mesAnterior` / `mesSeguinte({ano, mes})`.
  - `api<T>(caminho: string, opcoes?: RequestInit): Promise<T>`:
    - Sempre `credentials: 'same-origin'` e `Content-Type: application/json` no corpo.
    - Erro HTTP → lança `ErroApi{status, mensagem}`, com a mensagem de `{erro}`.
    - 401 → chama o handler registrado por `aoNaoAutenticado(fn)` (Task 11).
    - **Cold start**: se a resposta não chega em 3 s, liga o estado global `servidorAcordando = true`, que o `AvisoServidor` mostra como "Acordando o servidor… isso pode levar até 1 minuto". Timeout total de 90 s, depois `ErroApi{status: 0, mensagem: "Servidor não respondeu. Tente de novo."}`.
  - `useMesSelecionado(): {ano, mes, irPara(ano, mes), anterior(), seguinte()}` — guarda em `?ano=&mes=` na URL; padrão = mês atual em `America/Sao_Paulo`.
  - `AppShell`:
    - Em ≥ 768 px, `AbasTopo` com Início · Lançamentos · Cartões · Categorias · Relatórios, `SeletorMes`, botão "+ Lançar" e menu do usuário.
    - Em < 768 px, `NavbarInferior` fixa com Início · Lançamentos · (+) · Cartões · Relatórios. O "+" central é um círculo `#27187E` elevado; Categorias e Sair ficam no menu do perfil, no topo.
  - Rotas: `/login`, `/cadastro`, `/` (Início), `/lancamentos`, `/lancamentos/novo`, `/lancamentos/:id`, `/cartoes`, `/categorias`, `/relatorios`, `/conta/senha`.
  - `index.css`: tokens `--cor-fundo:#F7F7FF; --cor-principal:#27187E; --cor-principal-clara:#A49DDB; --cor-positivo:#2E9E5B; --cor-negativo:#D64545; --cor-texto:#16123A; --cor-mutado:#7D7A99; --cor-linha:#E9E8F5`, cards brancos com `border-radius` 20–24 px e fonte Inter.
  - `vercel.json`: rewrite `/api/(.*)` para a API e fallback SPA `/(.*)` → `/index.html` (substituído pelo `vercel.json` da raiz na Task 16b).

- [ ] **Step 1: Criar o projeto** (`npm create vite@latest frontend -- --template react-ts`), instalar react-router, @tanstack/react-query, tailwindcss v4 (+ plugin Vite), recharts, vitest, @testing-library/react, @testing-library/user-event, jsdom, msw. Script `"test": "vitest"`.
- [ ] **Step 2: Escrever os testes que falham**
  - `moeda.test`: `formatarMoeda("1234.56") === "R$ 1.234,56"` (comparar removendo NBSP); `lerValor("1.234,56") === "1234.56"`; `lerValor("251,3") === "251.30"`; `lerValor("10,999") === null`; `lerValor("0") === null`; `lerValor("abc") === null`.
  - `mes.test`: `mesAnterior({ano:2026, mes:1})` → `{ano:2025, mes:12}`; `rotuloMes(2026, 10) === "Outubro 2026"`.
  - `cliente.test` (fake timers + MSW com atraso): resposta em 5 s liga `servidorAcordando` depois de 3 s e desliga ao responder, sem erro (Review Focus 4); sem resposta em 90 s lança `status 0`; 401 chama o handler de não autenticado; corpo `{erro}` vira `mensagem`.
  - `AppShell.test`: com `window.innerWidth = 390`, a navbar inferior tem 5 itens na ordem Início, Lançamentos, Novo lançamento (+), Cartões, Relatórios; com `1280`, as abas do topo incluem Categorias.
- [ ] **Step 3: Rodar** `npm test -- --run` → FAIL.
- [ ] **Step 4: Implementar.**
- [ ] **Step 5: Rodar** `npm test -- --run` e `npm run build` → PASS / build ok.
- [ ] **Step 6: Commit** `feat(web): esqueleto React, layout responsivo e cliente da API`

### Task 11: Telas de autenticação

**Files:**
- Create: `src/auth/{AuthProvider,RotaProtegida,LoginPage,CadastroPage,BotaoGoogle,DefinirSenhaPage}.tsx`
- Test: `src/auth/LoginPage.test.tsx`, `src/auth/RotaProtegida.test.tsx`, `src/auth/CadastroPage.test.tsx`

**Interfaces:**
- Consumes: Task 10 (`api`, `aoNaoAutenticado`); endpoints da Task 2/3.
- Produces:
  - `useAuth(): {usuario: UsuarioResponse | null, carregando, entrar(email, senha), entrarComGoogle(credential), cadastrar(nome, email, senha), sair()}`. Na montagem, chama `GET /api/auth/me`.
  - `RotaProtegida`: sem usuário, vai para `/login?voltar=<rota>`.
  - `BotaoGoogle`: carrega `https://accounts.google.com/gsi/client`, `google.accounts.id.initialize({client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID, callback})` e `renderButton`; o callback envia `credential` para `entrarComGoogle`. Sem `VITE_GOOGLE_CLIENT_ID`, o botão não aparece.
  - `DefinirSenhaPage` (`/conta/senha`): nova senha + confirmação → `PUT /api/auth/senha`.
  - Telas no estilo dos mockups: logo "Contas Claras" e card branco centralizado.
- [ ] **Step 1: Escrever os testes que falham** (MSW)
  - `login_com_sucesso_vai_para_inicio`.
  - `login_invalido_mostra_mensagem_da_api` ("E-mail ou senha inválidos.").
  - `cadastro_nao_liberado_mostra_mensagem_da_api`.
  - `rota_protegida_sem_sessao_redireciona_para_login`.
  - `sessao_expirada_em_chamada_qualquer_volta_para_login_sem_loop` (Review Focus 5): `/api/resumo` responde 401 e a tela de login aparece uma vez; `/api/auth/me` não é chamado em loop (máx. 2 chamadas).
- [ ] **Step 2: Rodar** `npm test -- --run src/auth` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar** `npm test -- --run` → PASS.
- [ ] **Step 5: Commit** `feat(web): login por senha e Google, cadastro e rota protegida`

### Task 12: Início

**Files:**
- Create: `src/paginas/inicio/{InicioPage,CardSobra,CardsTotais,GraficoAno,OndeMaisGastou,ProximasContas}.tsx`
- Test: `src/paginas/inicio/InicioPage.test.tsx`

**Interfaces:**
- Consumes: `GET /api/resumo` (Task 6), `useMesSelecionado`, `formatarMoeda`.
- Produces: tela igual ao mockup `dashboard-indigo.html`.
  - `CardSobra` (fundo `#27187E`, texto branco): sobra do mês; "R$ X melhor/pior que <mês anterior>" (some se `anterior == null`); "No ano: R$ Y". Sobra negativa com sinal −; o card não fica vermelho, o valor vai com prefixo "−".
  - `CardsTotais`: receitas e despesas com chip `↑/↓ N% vs <mês>`. Despesa que cai fica verde; receita que cai fica vermelha.
  - `GraficoAno` (Recharts): barras agrupadas por mês, receitas `#27187E` e despesas `#A49DDB`, com a parte prevista empilhada em padrão listrado (SVG `<pattern>`) e legenda.
  - `OndeMaisGastou`: barra horizontal, nome, `R$` e `%` inteiro.
  - `ProximasContas`: lista com data `dd/mm`, item, categoria e valor; atrasadas com etiqueta vermelha "atrasada".
  - Celular: empilha os blocos na ordem sobra, totais, onde mais gastou, próximas contas, gráfico.
- [ ] **Step 1: Escrever os testes que falham** (MSW com resumo fictício)
  - `mostra_sobra_receitas_e_despesas_formatadas`.
  - `esconde_comparacao_quando_anterior_null` (Review Focus 1).
  - `lista_categorias_em_ordem_com_percentual`.
  - `proxima_conta_atrasada_tem_etiqueta`.
  - `trocar_mes_refaz_a_consulta_com_ano_e_mes`.
- [ ] **Step 2: Rodar** `npm test -- --run src/paginas/inicio` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar** `npm test -- --run` → PASS.
- [ ] **Step 5: Commit** `feat(web): tela inicial com sobra, gráfico e onde mais gastou`

### Task 13: Lançamentos (lista e formulário)

**Files:**
- Create: `src/paginas/lancamentos/{LancamentosPage,GrupoCategoria,LancamentoForm,SeletorItem}.tsx`
- Test: `src/paginas/lancamentos/LancamentosPage.test.tsx`, `src/paginas/lancamentos/LancamentoForm.test.tsx`

**Interfaces:**
- Consumes: `GET /api/lancamentos`, `PUT /api/lancamentos`, `PATCH /api/lancamentos/{id}/status`, `DELETE /api/lancamentos/{id}`, `GET /api/categorias`, `POST /api/categorias/{id}/itens` (Tasks 4–5), `lerValor`.
- Produces:
  - `LancamentosPage`: lista do mês agrupada por categoria (receitas primeiro), com total por grupo. Cada linha mostra item, vencimento `dd/mm`, valor e um chip clicável `Previsto`/`Pago` (PATCH). Tocar na linha abre `/lancamentos/:id`.
  - `LancamentoForm` (tela cheia em < 768 px, modal em ≥ 768 px), campos nesta ordem:
    1. Despesa | Receita.
    2. Categoria (filtrada pelo tipo).
    3. Item (com "+ novo item", que cria o item com nome e dia de vencimento opcional).
    4. Mês (padrão = mês selecionado).
    5. Valor (teclado `inputMode="decimal"`, aceita vírgula).
    6. Vencimento (pré-preenchido com o dia do item, editável).
    7. Previsto | Pago.
    8. Interruptor "Repetir nos próximos meses" com "até [mês/ano]".
    9. Salvar.
  - Na edição, o mesmo form tem o botão "Excluir" com confirmação.
  - Valor inválido mostra "Use até 2 casas decimais." e não envia.
  - Item arquivado não aparece no seletor.
- [ ] **Step 1: Escrever os testes que falham**
  - `lista_agrupa_por_categoria_com_total`.
  - `clicar_no_chip_alterna_status_via_patch`.
  - `form_envia_put_com_valor_convertido`: digitar `"1.234,56"` envia `valor: "1234.56"` (Review Focus 3).
  - `form_recusa_valor_com_tres_casas`.
  - `form_preenche_vencimento_pelo_dia_do_item`: item com dia 31 em fev/2026 → `28/02/2026` (Review Focus 2, lado do front).
  - `repetir_ate_envia_repetirAte`.
  - `novo_item_inline_aparece_selecionado`.
  - `item_arquivado_nao_aparece_no_seletor`.
- [ ] **Step 2: Rodar** `npm test -- --run src/paginas/lancamentos` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar** `npm test -- --run` → PASS.
- [ ] **Step 5: Commit** `feat(web): lista de lançamentos e formulário de lançamento`

### Task 14: Cartões e Categorias

**Files:**
- Create: `src/paginas/cartoes/{CartoesPage,CardCartao}.tsx`, `src/paginas/categorias/{CategoriasPage,EditorCategoria,EditorItem}.tsx`
- Test: `src/paginas/cartoes/CartoesPage.test.tsx`, `src/paginas/categorias/CategoriasPage.test.tsx`

**Interfaces:**
- Consumes: `GET /api/cartoes` (Task 7), endpoints de categorias/itens (Task 4).
- Produces:
  - `CartoesPage` (mockup `cartoes-lancar.html`):
    - Três cards de resumo: faturas do mês, limite total e uso geral (`—` quando for `null`).
    - Grid de cards por cartão, com nome, "vence dia NN", barra de uso e chip `%`. Cores por `faixa`: `VERDE` `#2E9E5B`, `AMARELO` `#E0A100`, `VERMELHO` `#D64545`. `SEM_LIMITE` mostra "Cadastrar limite", que leva a `/categorias`.
    - Nota fixa: "O limite do banco também desconta parcelas futuras, que o app não conhece."
  - `CategoriasPage`:
    - Lista de categorias com itens, separando Receitas e Despesas.
    - Criar e renomear categoria; reordenar com botões ↑/↓ (sem arrastar).
    - Apagar mostra a mensagem 409 da API quando houver lançamentos.
    - Editar item: nome, dia de vencimento, "É cartão de crédito" + limite e arquivar.
- [ ] **Step 1: Escrever os testes que falham**
  - `cartoes_mostra_faixa_e_percentual` (`0.7300` → `73%`, amarelo).
  - `cartao_sem_limite_mostra_cadastrar_limite`.
  - `uso_geral_null_mostra_traco`.
  - `categorias_cria_e_renomeia`.
  - `apagar_categoria_com_lancamentos_mostra_mensagem_409`.
  - `editar_item_marca_cartao_e_salva_limite_convertido` (`"4.000,00"` → `"4000.00"`).
  - `reordenar_envia_lista_completa_de_ids`.
- [ ] **Step 2: Rodar** `npm test -- --run src/paginas/cartoes src/paginas/categorias` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar** `npm test -- --run` → PASS.
- [ ] **Step 5: Commit** `feat(web): telas de cartões e categorias`

### Task 15: Relatórios

**Files:**
- Create: `src/paginas/relatorios/{RelatoriosPage,TabelaAnual}.tsx`
- Test: `src/paginas/relatorios/RelatoriosPage.test.tsx`

**Interfaces:**
- Consumes: `GET /api/relatorios/ano/{ano}` (Task 7).
- Produces:
  - Seletor de ano (‹ 2026 ›).
  - Tabela com colunas Item, JAN..DEZ e Ano. Categorias agrupadas, com subtotal, receitas primeiro.
  - Linhas finais "Despesas totais" e "Diferença de caixa" (negativo em `#D64545`).
  - Células `PAGO` com texto `#2E9E5B`; previstas em cor normal.
  - Primeira coluna fixa e rolagem horizontal **só dentro da tabela** (a página não rola de lado no celular).
- [ ] **Step 1: Escrever os testes que falham**
  - `tabela_tem_12_meses_e_coluna_ano`.
  - `celula_paga_tem_classe_de_pago`.
  - `diferenca_negativa_em_vermelho`.
  - `trocar_ano_refaz_consulta`.
- [ ] **Step 2: Rodar** `npm test -- --run src/paginas/relatorios` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar** `npm test -- --run` → PASS.
- [ ] **Step 5: Commit** `feat(web): relatório anual no formato da planilha`

---

## Entrega

### Task 16: Docker, CI e dados de demonstração

**Files:**
- Create: `backend/Dockerfile`, `render.yaml`, `.github/workflows/ci.yml`, `.env.example`, `backend/src/main/java/dev/lmaciel/contasclaras/demo/DemoSeeder.java`, `docker-compose.yml` (Postgres local para dev)
- Test: `demo/DemoSeederTest.java`

**Interfaces:**
- Produces:
  - `Dockerfile` multi-stage (`eclipse-temurin:21-jdk` para build com `./mvnw -q package -DskipTests`, `eclipse-temurin:21-jre` para rodar), porta `${PORT:-8080}` (Render injeta `PORT`; `server.port=${PORT:8080}`).
  - `render.yaml`: web service `contas-claras-api`, `runtime: docker`, `rootDir: backend`, `plan: free`, `healthCheckPath: /api/health`, env vars da Global Constraints com `sync: false`.
  - CI (`push` e `pull_request`): job backend (`actions/setup-java` 21, `./mvnw -q verify`, Docker disponível no runner para Testcontainers) e job frontend (`node 22`, `npm ci`, `npm test -- --run`, `npm run build`).
  - `.env.example` com todas as variáveis e valores de exemplo óbvios (`JWT_SECRET=troque-por-32-bytes-aleatorios...`).
  - `DemoSeeder` (`@Profile("demo")`, `ApplicationRunner`): cria `demo@contasclaras.dev` / senha `demo12345` com 12 meses fictícios de 2026 (salário, aluguel, luz, 2 cartões com limite, um financiamento repetido), parte paga e parte prevista. Não roda se o usuário demo já existir. Serve para dev local e para os prints do README.
- [ ] **Step 1: Escrever o teste que falha**: `DemoSeederTest.cria_usuario_demo_uma_vez`, que roda duas vezes e mantém 1 usuário e o mesmo número de lançamentos.
- [ ] **Step 2: Rodar** `./mvnw -q test -Dtest=DemoSeederTest` → FAIL.
- [ ] **Step 3: Implementar** os arquivos acima.
- [ ] **Step 4: Verificar**: `./mvnw -q verify` → PASS; `docker build -t contas-claras-api backend` → ok; `docker run --rm -e ... contas-claras-api` com Postgres do compose sobe e `curl localhost:8080/api/health` → `{"status":"ok"}`.
- [ ] **Step 5: Commit** `chore: Dockerfile, render.yaml, CI e seed de demonstração`

### Task 17: Deploy e importação real

Esta task depende do dono para contas e credenciais. O coordenador conduz, passo a passo, e só segue quando cada um estiver feito.

- [ ] **Step 1 (dono): Neon** — criar o projeto `contas-claras` (região São Paulo, se houver) e passar a connection string. O coordenador converte para `DATABASE_URL` JDBC + usuário/senha.
- [ ] **Step 2 (dono): Google Cloud** — criar o OAuth Client "Web application" com origem JavaScript autorizada `https://<projeto>.vercel.app` e `http://localhost:5173`, e passar o Client ID.
- [ ] **Step 3 (dono): Render** — New → Blueprint apontando para o repo (usa o `render.yaml`) e preencher as env vars (`JWT_SECRET` gerado com `openssl rand -base64 48`, `ALLOWED_EMAILS` com os e-mails liberados). Conferir `https://contas-claras-api.onrender.com/api/health`. Se o nome do serviço ficar diferente, ajustar a URL no `frontend/vercel.json` e commitar.
- [ ] **Step 4: Vercel** — criar o projeto ligado ao repo, com root `frontend`, framework Vite e env `VITE_GOOGLE_CLIENT_ID` (via MCP da Vercel ou pelo painel). Deploy de produção.
- [ ] **Step 5: Smoke test em produção**: cadastro com e-mail liberado, login, logout, login Google, lançamento no celular (viewport 390 px) e conferência do cookie `cc_session` `HttpOnly; Secure; SameSite=Strict` no domínio da Vercel.
- [ ] **Step 6: Importação real** (máquina do dono): o dono cria a conta dele no app; depois rodar o profile `importar` contra o Neon com `--importar.arquivo=<caminho anotado em .local/conferencia-importacao.md> --importar.email=<e-mail do dono>`. **Não colar o caminho nem a saída em commit, PR ou issue.**
- [ ] **Step 7: Conferência manual**: comparar a tabela impressa com `.local/conferencia-importacao.md`. Aceite: receitas e despesas de cada ano dentro de **R$ 0,05** dos valores esperados. O arredondamento célula a célula já dá +R$ 0,03 nas despesas de 2024 e +R$ 0,01 nas receitas de 2026. Abrir Início em out/2026 e Relatórios 2026 e conferir com a planilha.

### Task 18: README, prints e repositório público

**Files:**
- Create: `README.md`, `docs/prints/*.png`
- [ ] **Step 1:** Rodar local com `docker compose up -d` + backend profile `dev,demo` + `npm run dev`. Tirar prints (computador 1280 px e celular 390 px) de Início, Lançamento, Cartões e Relatórios **logado como demo**.
- [ ] **Step 2:** Escrever o `README.md` em pt-BR:
  - O que é e o problema que resolve, em 3 linhas.
  - Prints.
  - Funcionalidades.
  - Stack.
  - Diagrama de arquitetura (Vercel → rewrite → Render → Neon) e decisões: JWT em cookie HttpOnly, allowlist, 404 para recurso alheio, `BigDecimal`.
  - Como rodar local.
  - Como rodar os testes.
  - Como importar uma planilha.
  - Link do app.
- [ ] **Step 3: Varredura de dados pessoais** em todo o histórico: `git log -p --all | grep -n -i -E "<nomes e valores listados em .local/conferencia-importacao.md>"`, mais `git ls-files | grep -i xlsx`. O resultado esperado é vazio, exceto a fixture gerada por código.
- [ ] **Step 4:** Abrir o PR `feat/v1` → `main` com o resumo e o checklist; CI verde; merge.
- [ ] **Step 5:** Só com o Step 3 vazio: `gh repo edit lmaciel0/contas-claras --visibility public --accept-visibility-change-consequences`.

