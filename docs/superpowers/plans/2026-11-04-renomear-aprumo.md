# Renomear "Contas Claras" para Aprumo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover o nome "Contas Claras" (e variantes) de todo arquivo versionado, exceto histórico em `docs/`, sem mudar comportamento.

**Architecture:** Um teste-guarda no frontend lista `git ls-files` e falha se achar o nome antigo. Ele começa vermelho e fica verde no fim. O backend troca pacote, classe, e-mails e artefato com TDD nos e-mails e a suíte inteira como rede de segurança do rename mecânico.

**Tech Stack:** Java 21, Spring Boot 4, Maven wrapper, Docker, React 19 + vitest.

**Spec:** descrição aprovada no chat em 2026-11-04 (não há documento de design; o escopo está em Global Constraints).

## Global Constraints

- Branch `refactor/renomear-aprumo` a partir da `main`. Sem commit na `main`.
- Pacote Java: `dev.lmaciel.contasclaras` vira `dev.lmaciel.aprumo` (main e test, inclusive strings JPQL com nome totalmente qualificado). `ContasClarasApplication` vira `AprumoApplication`.
- `backend/pom.xml`: `artifactId` e `name` = `aprumo`; `description` = `API do Aprumo, assistente pessoal`. `backend/Dockerfile`: `mv target/aprumo-*.jar target/app.jar`.
- `spring.application.name` = `aprumo`.
- E-mails (assunto, texto e HTML) e `NOME_REMETENTE` em `SmtpEnvioEmail`: "Contas Claras" vira "Aprumo".
- Banco, usuário e senha locais: `contasclaras` e `contas` viram `aprumo` (`docker-compose.yml`, `.env.example`, `application-dev.yml`, testes que citam a URL). Container `aprumo-db`, volume `aprumo-dados`.
- Usuário demo: `demo@contasclaras.dev` vira `demo@useaprumo.com.br` (`DemoSeeder`, testes, README).
- Em `docs/`: trocar só referências a código que mudou (`dev.lmaciel.contasclaras`, `dev/lmaciel/contasclaras`, `ContasClarasApplication`). Prosa histórica e nomes de arquivo `2026-10-29-contas-claras-*` ficam.
- Fora desta branch: URL `contas-claras-ten.vercel.app`, `APP_URL`, deploy, `vercel.json`. A URL no README fica e o teste-guarda a ignora até a tarefa do domínio.
- Código Java e `pom.xml`: agent `java-spring`. Código do frontend: agent `frontend-developer`. Eu coordeno. Nunca ler `.local/segredos.env`.
- Verificação com saída filtrada: `./mvnw -q test`, `npx vitest run --reporter=dot`.

## Review Focus

- FQCN dentro de JPQL esquecido (`LancamentoRepository`, `NotaRepository`): a consulta quebra em runtime. Coberto pela suíte de integração na Tarefa 2.
- `Dockerfile` com `mv` apontando para o jar antigo: build da imagem falha. Coberto por `docker build` na Tarefa 2.
- Variante do nome escapando (`CONTAS CLARAS`, `contas_claras`, `ContasClaras`): o regex do guarda é case-insensitive e aceita espaço, `_`, `-` ou nada entre as palavras.
- Pasta antiga `dev/lmaciel/contasclaras` sobrando vazia ou com arquivo não movido: conferir com `find` na Tarefa 2.
- Banco local com nome novo, mas `.env` do dev ainda com o antigo: aviso explícito ao Lucas na Tarefa 5, porque `.env` não é versionado.

---

### Task 1: Teste-guarda do nome antigo (frontend)

**Files:**
- Modify: `frontend/src/nome.test.ts`

**Interfaces:**
- Produces: teste `nenhum arquivo versionado cita o nome antigo, exceto docs/` que lê `git ls-files` da raiz do repo (`resolve(raizFront, '..')`).

- [ ] **Step 1: Escrever o teste que falha.** Novo `it` em `describe('nome do produto')`. Lista os arquivos com `execFileSync('git', ['ls-files'], { cwd: raiz, encoding: 'utf8' })`. Ignora: caminhos que começam com `docs/`, os arquivos `frontend/src/nome.test.ts` e `frontend/src/layout/AppShell.test.tsx` (esse tem a asserção negativa `/contas claras/i`), e `sonar-project.properties` (sai da lista na Tarefa 4). Arquivos binários (qualquer byte NUL nos primeiros 8000 bytes) são pulados. Antes de testar, remove do conteúdo a string `contas-claras-ten.vercel.app`. Regex `/contas[\s_-]?claras?|contasclaras/i`. Asserção: `expect(arquivosComNomeAntigo).toEqual([])`.
- [ ] **Step 2: Rodar e ver falhar.** Run: `cd frontend && npx vitest run src/nome.test.ts --reporter=dot`. Expected: FAIL, lista com cerca de 230 arquivos (pacote Java, pom, compose etc.).
- [ ] **Step 3: Commit.** `git add frontend/src/nome.test.ts && git commit -m "test(nome): guarda contra o nome antigo em arquivos versionados"`

### Task 2: Backend (pacote, e-mails, artefato, config local)

**Files:**
- Move: `backend/src/main/java/dev/lmaciel/contasclaras` para `.../aprumo`; idem `backend/src/test/java/dev/lmaciel/contasclaras`.
- Modify: `AprumoApplication.java` (ex-`ContasClarasApplication`), `ModelosEmail.java`, `SmtpEnvioEmail.java`, `DemoSeeder.java`, `LancamentoRepository.java`, `NotaRepository.java`, `EnvioEmail.java` (Javadoc), `backend/pom.xml`, `backend/Dockerfile`, `backend/src/main/resources/application.yml`, `backend/src/main/resources/application-dev.yml`, `docker-compose.yml`, `.env.example`.
- Test: `ModelosEmailTest`, `SmtpEnvioEmailTest`, `DemoSeederTest`, `DemoSeederGuardaTest`, `GuardaBancoDemoTest`.

**Interfaces:**
- Produces: pacote `dev.lmaciel.aprumo.*`; classe `dev.lmaciel.aprumo.AprumoApplication`; jar `backend/target/aprumo-0.0.1-SNAPSHOT.jar`.

- [ ] **Step 1: Testes de e-mail que falham.** Em `ModelosEmailTest`, um teste por modelo (confirmação, conta já existente, redefinição, sem conta) que exige: assunto contém `Aprumo`, e texto e HTML contêm `Aprumo` e não contêm `Contas Claras`. Em `SmtpEnvioEmailTest` trocar a asserção do remetente para `isEqualTo("Aprumo")` e renomear o método para `envia_multipart_com_texto_e_html_e_remetente_aprumo`. Run: `cd backend && ./mvnw -q test -Dtest=ModelosEmailTest+SmtpEnvioEmailTest`. Expected: FAIL nas novas asserções.
- [ ] **Step 2: Mudar os textos.** Em `ModelosEmail` e `SmtpEnvioEmail`, "Contas Claras" vira "Aprumo" (frases já concordam: "no Aprumo", "do Aprumo"). Rodar o mesmo comando. Expected: PASS.
- [ ] **Step 3: Rename do pacote.** `git mv` das duas pastas `contasclaras` para `aprumo` e de `ContasClarasApplication.java` para `AprumoApplication.java`. Em todo `backend/`, substituir `dev.lmaciel.contasclaras` por `dev.lmaciel.aprumo` (inclui `package`, `import` e as strings JPQL `select new ...` de `LancamentoRepository` e `NotaRepository`, que citam o FQCN) e `ContasClarasApplication` por `AprumoApplication`.
- [ ] **Step 4: Config e artefato.** `pom.xml`, `Dockerfile` e `application.yml` conforme Global Constraints. `docker-compose.yml`, `.env.example`, `application-dev.yml` e os testes de guarda do demo: `contasclaras` e `contas` viram `aprumo`. `DemoSeeder.EMAIL` e `DemoSeederTest.EMAIL_DEMO` passam a `demo@useaprumo.com.br`.
- [ ] **Step 5: Verificação.** Run: `find backend/src -type d -name contasclaras` (Expected: vazio) e `git grep -n -i -E 'contas[ _-]?claras?|contasclaras' -- backend docker-compose.yml .env.example` (Expected: sem linhas). Run: `cd backend && ./mvnw -q test 2>&1 | tail -30` (Expected: sem falhas; precisa de Docker). Run: `cd backend && ./mvnw -q -B -DskipTests package && ls target/aprumo-*.jar` (Expected: lista o jar) e `docker build -t aprumo-api-teste backend` (Expected: termina sem erro; depois `docker rmi aprumo-api-teste`).
- [ ] **Step 6: Commit.** `git add -A backend docker-compose.yml .env.example && git commit -m "refactor(backend): renomeia pacote e artefato para aprumo"`

### Task 3: README e docs

**Files:**
- Modify: `README.md`, arquivos em `docs/superpowers/**` que citam `dev.lmaciel.contasclaras`, `dev/lmaciel/contasclaras` ou `ContasClarasApplication`.

- [ ] **Step 1: README.** Caminho do jar vira `target/aprumo-0.0.1-SNAPSHOT.jar`; usuário demo vira `demo@useaprumo.com.br / demo12345`; título e textos que ainda digam "Contas Claras" passam a "Aprumo". A URL do app não muda.
- [ ] **Step 2: Docs.** Substituir só as três referências a código listadas em Files. Nomes de arquivo e prosa histórica ficam.
- [ ] **Step 3: Verificação.** Run: `git grep -n -i -E 'dev[./]lmaciel[./]contasclaras|ContasClarasApplication' ; git grep -n 'Contas Claras' -- README.md`. Expected: sem linhas.
- [ ] **Step 4: Commit.** `git commit -am "docs: atualiza referências ao pacote e ao nome do projeto"`

### Task 4: Fechar o guarda (sonar e URL ficam de fora)

**Files:**
- Modify: `frontend/src/nome.test.ts` (nenhuma mudança de regra; só conferir exceções), `sonar-project.properties` (apenas depois do passo de renomear o repo).

- [ ] **Step 1: Rodar o guarda.** Run: `cd frontend && npx vitest run src/nome.test.ts --reporter=dot`. Expected: PASS (as exceções `sonar-project.properties` e a URL da Vercel ainda valem).
- [ ] **Step 2 (depende do Lucas): sonar e repo.** Só depois de o Lucas renomear o repo no GitHub (ou pedir que eu renomeie com `gh repo rename aprumo`) e a chave do projeto no Sonar: trocar `sonar.projectKey` em `sonar-project.properties`, remover a exceção do arquivo no teste-guarda e `git remote set-url origin https://github.com/lmaciel0/aprumo.git`. Sem esse "ok", esta etapa fica pendente e a branch segue sem ela.

### Task 5: Verificação final, revisão e PR

- [ ] **Step 1: Verificação completa.** Run: `cd backend && ./mvnw -q test 2>&1 | tail -30` e `cd frontend && npx vitest run --reporter=dot 2>&1 | tail -15 && npm run build 2>&1 | tail -5 && npm run lint 2>&1 | tail -5`. Expected: tudo verde, saída real mostrada.
- [ ] **Step 2: Revisão.** Agent `code-reviewer` uma vez no diff final da branch. `security-auditor` não é necessário (sem autenticação, dado sensível ou entrada externa nova).
- [ ] **Step 3: PR.** `git push -u origin refactor/renomear-aprumo` e `gh pr create` em português. O Lucas faz o merge.
- [ ] **Step 4: Avisar o Lucas.** (a) Para o banco local: `docker compose down -v && docker compose up -d`, e atualizar o `.env` local (não versionado) com `DATABASE_URL=jdbc:postgresql://localhost:5432/aprumo` e usuário/senha `aprumo`. (b) Produção não muda de banco; o rename só chega ao ar no próximo deploy, que não faz parte desta branch.
