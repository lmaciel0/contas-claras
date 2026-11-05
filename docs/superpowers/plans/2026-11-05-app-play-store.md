# Aprumo na Play Store: plano de implementação

> **Para agentes:** use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar tarefa por tarefa. Os passos usam checkbox (`- [ ]`). Todo código Java vai pelo agent `java-spring`; todo código de front-end pelo `frontend-developer` (regra do dono).

**Objetivo:** publicar o Aprumo na Play Store como app Android público (TWA), com navegação de celular em dock flutuante e exclusão de conta exigida pela Play.

**Arquitetura:** o app é uma casca TWA (Bubblewrap) que abre `https://app.useaprumo.com.br`. O front ganha uma dock inferior no celular, uma folha de ação rápida e uma tela de exclusão de conta; o backend ganha o endpoint que apaga a conta e todos os dados. A ficha da loja e as declarações são conferidas por checklist.

**Stack:** React 19 + TypeScript + Vite + Tailwind + vitest/msw (front); Java 21 + Spring Boot 4 + JPA + Flyway + Testcontainers (back); Bubblewrap CLI, JDK 17 e Android SDK na máquina do Lucas (Android).

**Spec:** `docs/superpowers/specs/2026-11-05-app-play-store-design.md`

## Global Constraints

- Português do Brasil em tudo (código de domínio, textos, commits, PRs).
- Só tokens de cor `--cor-*` (claro e escuro), alvo de toque `min-h-11` (44 px), foco visível, `prefers-reduced-motion` respeitado, nunca `dangerouslySetInnerHTML`.
- Repo público: nada de segredo, keystore, senha, ID de infraestrutura nem credencial de revisor em arquivo commitado. Fingerprints SHA-256 de certificado são públicos e podem ir.
- Isolamento por usuário: todo acesso filtra pelo usuário logado; id alheio ou inexistente responde 404.
- Package name do app: `br.com.useaprumo.app` (imutável depois de publicado).
- Contato público: `aprumo.assistente@gmail.com`.
- Cookie de sessão `SameSite=Strict` em `app.useaprumo.com.br`; a CSP de `vercel.json` só libera `accounts.google.com`: não afrouxar.
- Dock inferior só abaixo de 768 px; de 768 a 1279 px fica a barra de topo com menu deslizante; ≥ 1280 px a dock lateral.
- Mudança de tabela exige migration (`ddl-auto: validate`); próxima é `V14__...sql`.
- Cada PR em branch própria a partir da `main`, commits convencionais em português; o Lucas faz o merge; sem deploy sem pedido dele.
- Build e testes com saída filtrada: `cd backend && ./mvnw -q test`, `cd frontend && npx vitest run --reporter=dot`, `npm run build`, `npm run lint`.

## Review Focus

1. Excluir conta com lançamentos: `lancamento.item_id` é `ON DELETE RESTRICT` (V3), então apagar só o `usuario` falha com 500 se houver lançamento. Esperado: 204 e tudo apagado.
2. Sessão e reuso: depois da exclusão, o cookie antigo e um segundo `DELETE` devem dar 401, e login com o e-mail apagado deve falhar.
3. Isolamento: excluir o usuário A não pode alterar nenhum dado do usuário B (inclusive categorias com o mesmo nome).
4. Reautenticação: senha errada, senha ausente em conta com senha e credencial Google de outro usuário não apagam nada (401).
5. Dock cobrindo conteúdo: o último item de listas longas e o botão "Salvar" de formulários precisam ficar acessíveis acima da dock; no limite 767/768 px e ao redimensionar o layout troca sem estado preso (menu aberto).
6. `/.well-known/assetlinks.json` deve ser servido como `application/json`, não como o `index.html` do SPA.

---

## PR 1: `feat/exclusao-conta`

### Task 1: Endpoint de exclusão de conta (java-spring)

**Files:**
- Create: `backend/src/main/resources/db/migration/V14__codigo_email_usuario_cascade.sql` somente se `codigo_email` ou `envio_email` tiverem FK para `usuario` sem cascade (conferir `V4__codigo_email.sql`; se não tiverem FK, não criar migration e apagar essas linhas por e-mail no serviço)
- Create: `backend/src/main/java/dev/lmaciel/aprumo/auth/dto/ExcluirContaRequest.java`
- Modify: `backend/src/main/java/dev/lmaciel/aprumo/auth/AuthController.java` (novo `@DeleteMapping("/conta")` ao lado de `PUT /senha`)
- Modify: `backend/src/main/java/dev/lmaciel/aprumo/auth/AuthService.java`
- Modify: `backend/src/main/java/dev/lmaciel/aprumo/lancamento/LancamentoRepository.java`
- Test: `backend/src/test/java/dev/lmaciel/aprumo/auth/ExclusaoContaIntegracaoTest.java` (estende `IntegracaoTest`)

**Interfaces:**
- Produces: `DELETE /api/auth/conta`, corpo JSON `ExcluirContaRequest(String senha, String credencialGoogle)` com exatamente um dos dois preenchido (o nome do campo Google segue o de `GoogleLoginRequest`); resposta `204` com o cookie de sessão expirado (usar `SessaoCookie`); `401` para reautenticação inválida (mesma convenção do `PUT /senha`); `400` se vierem os dois ou nenhum; `401` sem sessão.
- Produces: `AuthService.excluirConta(Long usuarioId, ExcluirContaRequest pedido): void`, `@Transactional`.
- Produces: `LancamentoRepository.apagarDoUsuario(Long usuarioId): int` (apaga os lançamentos cujo item pertence a categoria do usuário; JPQL ou nativa).

- [ ] **Step 1: Escrever os testes que falham** em `ExclusaoContaIntegracaoTest`, com estes nomes e asserções:
  - `excluiContaComSenhaEApagaTodosOsDadosDoUsuario`: cria usuário A com senha, 1 categoria, 1 item, 1 lançamento, 1 tarefa, 1 nota, 1 projeto; `DELETE /api/auth/conta` com a senha certa → `204`; as contagens de `usuario`, `categoria`, `item`, `lancamento`, `tarefa`, `nota`, `projeto` do A são 0.
  - `naoMexeNosDadosDeOutroUsuario`: usuário B com dados iguais e uma categoria de mesmo nome; depois de excluir A, as contagens de B são as mesmas de antes.
  - `senhaErradaNaoApagaNada`: `401` e o usuário continua existindo.
  - `semSenhaNemGoogleRetorna400` e `senhaEGoogleJuntosRetorna400`.
  - `contaSoGoogleExcluiComCredencialDoMesmoUsuario` e `credencialGoogleDeOutroUsuarioRetorna401` (usar o `GoogleTokenVerifier` falso que os testes de login Google já usam).
  - `cookieAntigoEntrarDepoisRetorna401`: após excluir, `GET /api/auth/me` com o cookie antigo → `401`, e `POST /api/auth/login` com o e-mail apagado → `401`.
  - `segundaExclusaoRetorna401`.
  - `semSessaoRetorna401`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && ./mvnw -q test -Dtest=ExclusaoContaIntegracaoTest`
Expected: FAIL (endpoint inexistente, 404/405).

- [ ] **Step 3: Implementar** `ExcluirContaRequest`, o endpoint e `AuthService.excluirConta`. Ordem dentro da transação: validar reautenticação (senha com o mesmo encoder do login; Google com o `GoogleTokenVerifier` conferindo que o `sub` é o do usuário) → `LancamentoRepository.apagarDoUsuario(usuarioId)` → apagar registros de `codigo_email`/`envio_email` do usuário ou do e-mail dele → `usuarioRepository.deleteById(usuarioId)` (o resto cai por `ON DELETE CASCADE`) → resposta com cookie expirado. Não logar senha nem credencial.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && ./mvnw -q test -Dtest=ExclusaoContaIntegracaoTest`
Expected: PASS, depois `./mvnw -q test` inteiro verde.

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat(auth): exclusão de conta com apagamento de todos os dados do usuário"
```

### Task 2: Telas de exclusão de conta e política (frontend-developer)

**Files:**
- Create: `frontend/src/auth/useExcluirConta.ts` e `frontend/src/auth/useExcluirConta.test.tsx`
- Create: `frontend/src/auth/ExcluirContaPage.tsx` e `ExcluirContaPage.test.tsx` (rota logada `/conta/excluir`)
- Create: `frontend/src/legal/ExclusaoDeContaPage.tsx` e `ExclusaoDeContaPage.test.tsx` (rota pública `/excluir-conta`, texto para a Play, sem login)
- Modify: `frontend/src/App.tsx` (duas rotas, `lazy()` como as demais, a pública fora do `RotaProtegida`)
- Modify: `frontend/src/layout/DockLateral.tsx` (link "Excluir conta" abaixo de "Alterar senha", discreto, `text-xs`)
- Modify: a página de privacidade existente em `frontend/src/legal/` (citar a exclusão, o prazo "imediata e definitiva" e o contato `aprumo.assistente@gmail.com`; ajustar o teste que confere o texto)

**Interfaces:**
- Consumes: `DELETE /api/auth/conta` da Task 1 e `ExcluirContaRequest`.
- Produces: `useExcluirConta(): UseMutationResult<void, Error, { senha?: string; credencialGoogle?: string }>`; ao sucesso limpa o cache do TanStack Query e o estado de auth e navega para `/login`.

- [ ] **Step 1: Escrever os testes que falham.**
  - `useExcluirConta`: chama `DELETE /api/auth/conta` com o corpo recebido; em sucesso limpa o cache; em `401` expõe erro.
  - `ExcluirContaPage`: botão "Excluir minha conta" fica desabilitado até marcar "Entendo que é definitivo"; com senha vazia mostra erro; senha errada mostra a mensagem e não navega; sucesso navega para `/login`; conta sem senha (só Google) mostra o botão do Google em vez do campo de senha; o `<h1>` é "Excluir conta".
  - `ExclusaoDeContaPage`: renderiza sem login, lista os passos (abrir o app, Preferências ou menu, "Excluir conta"), cita o e-mail `aprumo.assistente@gmail.com` e o que é apagado (tarefas, notas, lançamentos, cartões, categorias, projetos).

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && npx vitest run src/auth src/legal --reporter=dot`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Implementar** hook, as duas páginas, as rotas e o link no menu. Reaproveitar `CampoTexto`, `TelaAuth` e o `BotaoGoogle` existentes. Como saber se a conta tem senha: usar o que `GET /api/auth/me` já devolve; se não devolver, acrescentar o campo `temSenha` no DTO de `me` (pedir ao `java-spring` num commit separado, com teste) em vez de adivinhar no front.

- [ ] **Step 4: Rodar tudo**

Run: `cd frontend && npx vitest run --reporter=dot && npm run lint && npm run build`
Expected: tudo verde, sem erro de lint.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat(conta): telas de exclusão de conta e política atualizada"
```

Depois do PR 1: `code-reviewer` no diff final e `security-auditor` (mexe em autenticação e dados sensíveis).

---

## PR 2: `feat/navegacao-celular`

### Task 3: Dock inferior flutuante (frontend-developer)

Antes de escrever, buscar o código do componente "Bottom Nav Bar" (autor arunachalam) com `mcp__21st__get_component` (id `8343`) só como referência de estrutura e animação; o resultado deve usar os tokens `--cor-*`, não as cores do componente. Chamar a skill `ui-ux-pro-max` e, como é tela nova, `anthropic-skills:design-taste-frontend`. Mockup aprovado: https://claude.ai/artifact/14uh5VYivLS4noTWH8rkNc.

**Files:**
- Create: `frontend/src/layout/useEhCelular.ts` e `useEhCelular.test.ts`
- Create: `frontend/src/layout/DockInferior.tsx` e `DockInferior.test.tsx`
- Modify: `frontend/src/layout/itensMenu.ts` (exportar `ITENS_DOCK`)
- Modify: `frontend/src/layout/AppShell.tsx` (renderizar a dock e dar folga ao `main`)
- Modify: `frontend/src/layout/useEhDesktop.ts` (corrigir o comentário que fala em "navbar inferior")

**Interfaces:**
- Produces: `export const LARGURA_CELULAR = 768` e `useEhCelular(): boolean` (`window.innerWidth < 768`, mesmo padrão de `useSyncExternalStore` do `useEhDesktop`, snapshot de servidor `false`).
- Produces: `ITENS_DOCK: ItemMenu[]` com Início (`/`, `exata`), Tarefas (`/tarefas`), Notas (`/notas`) e Finanças (`/financeiro`, `comMes`).
- Produces: `DockInferior()` sem props: `<nav aria-label="Navegação principal">` com um `NavLink` por item; só o ativo mostra o rótulo em texto, os outros mostram o ícone e `aria-label` com o nome; cada alvo `min-h-11 min-w-11`.

- [ ] **Step 1: Escrever os testes que falham.**
  - `useEhCelular`: `true` em 767 px, `false` em 768 px, reage a `resize`.
  - `DockInferior`: tem `nav` com nome "Navegação principal"; 4 links com os nomes Início, Tarefas, Notas e Finanças; na rota `/tarefas` só "Tarefas" mostra texto visível e tem `aria-current="page"`; o link de Finanças leva `?ano=&mes=` do mês em foco; foco por teclado visível (classe de outline).
  - `AppShell`: em 600 px renderiza a dock e a barra de topo; em 900 px não renderiza a dock; em 1300 px não renderiza a dock e mantém a lateral; o `main` em 600 px tem `padding-bottom` que reserva a dock (`pb-28` ou equivalente com `env(safe-area-inset-bottom)`); ao redimensionar de 600 para 1300 px com o menu deslizante aberto, ele fecha.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && npx vitest run src/layout --reporter=dot`
Expected: FAIL nos testes novos.

- [ ] **Step 3: Implementar** o hook, `ITENS_DOCK`, `DockInferior` (posição fixa, `left/right/bottom` com `env(safe-area-inset-bottom)`, pílula com `superficie`, transição 150 a 250 ms só em `transform`/`opacity`/cor, `prefers-reduced-motion` desliga) e a integração no `AppShell`. Os ícones são os de `ICONES` em `DockLateral.tsx`: extrair `ICONES` para `frontend/src/layout/icones.tsx` e importar nos dois lugares, sem duplicar SVG.

- [ ] **Step 4: Rodar tudo**

Run: `cd frontend && npx vitest run --reporter=dot && npm run lint && npm run build`
Expected: verde.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat(layout): dock inferior flutuante no celular"
```

### Task 4: Botão "+" e folha de ações rápidas (frontend-developer)

**Files:**
- Create: `frontend/src/layout/AcaoRapida.tsx` e `AcaoRapida.test.tsx`
- Modify: `frontend/src/layout/AppShell.tsx` (renderizar só quando `useEhCelular()`)

**Interfaces:**
- Consumes: `useEhCelular()` da Task 3; `useMesSelecionado()` para o `busca` do mês.
- Produces: `AcaoRapida()` sem props: botão `aria-label="Criar"` flutuante acima da dock; ao abrir mostra `role="dialog"` "Criar" com três links: "Nova nota", "Nova conta" (`/lancamentos/novo` com o `busca` do mês) e "Nova tarefa".

- [ ] **Step 1: Conferir como nota e tarefa são criadas hoje** em `frontend/src/paginas/notas` e `frontend/src/paginas/tarefas`. Se houver rota de criação, o link aponta para ela; se for estado da página, o link leva à página com parâmetro de busca (`?nova=1`) que a página lê e abre o formulário, sem reescrever o fluxo. Registrar a escolha no commit.

- [ ] **Step 2: Escrever os testes que falham.** O botão "Criar" existe só em 600 px; clicar abre o diálogo com os 3 links e o foco vai para o primeiro; `Esc` fecha e devolve o foco ao botão; clicar no fundo fecha; escolher "Nova conta" navega para `/lancamentos/novo` e fecha; o botão tem `min-h-11 min-w-11`.

- [ ] **Step 3: Rodar e ver falhar**

Run: `cd frontend && npx vitest run src/layout/AcaoRapida.test.tsx --reporter=dot`
Expected: FAIL.

- [ ] **Step 4: Implementar** `AcaoRapida` com o mesmo padrão de diálogo/fundo/`travarRolagem`/`prenderFoco` do menu do `AppShell` (extrair o que for comum em vez de copiar).

- [ ] **Step 5: Rodar tudo e commitar**

Run: `cd frontend && npx vitest run --reporter=dot && npm run lint && npm run build`
Expected: verde.

```bash
git add frontend
git commit -m "feat(layout): ação rápida para criar nota, conta e tarefa no celular"
```

Depois do PR 2: `code-reviewer` no diff final. Conferir no navegador em 375 px e 767/768 px (agent-browser) e mostrar a captura ao Lucas.

---

## PR 3: `chore/manifest-pwa`

### Task 5: Manifest completo e ícone maskable (frontend-developer)

**Files:**
- Modify: `frontend/public/manifest.webmanifest`
- Create: `frontend/public/icon-maskable-512.png` (o "A" dentro dos 80% centrais, fundo `#27187E` até a borda)
- Create: `frontend/src/manifest.test.ts`

- [ ] **Step 1: Escrever o teste que falha** `manifest.test.ts`, que lê o arquivo e confere: `id` igual a `/`; `description` sem a palavra "em breve" e citando finanças, tarefas, notas e projetos; `categories` contém `finance` e `productivity`; existe ícone `purpose: "maskable"` apontando para `/icon-maskable-512.png` (arquivo existe em `public/`); `shortcuts` com "Nova nota" e "Nova conta" apontando para URLs existentes (`/notas`, `/lancamentos/novo`); `theme_color` `#27187E`; `lang` `pt-BR`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && npx vitest run src/manifest.test.ts --reporter=dot`
Expected: FAIL.

- [ ] **Step 3: Implementar** o manifest e gerar o PNG maskable a partir de `icon-512.png` (Python com Pillow ou ImageMagick, script fora do repo; só o PNG vai no commit).

- [ ] **Step 4: Rodar tudo e commitar**

Run: `cd frontend && npx vitest run --reporter=dot && npm run build`
Expected: verde.

```bash
git add frontend
git commit -m "chore(front): manifest com ícone maskable, atalhos e descrição atual"
```

---

## PR 4: `chore/android-twa`

### Task 6: Spike do TWA em aparelho real (Lucas, com roteiro meu)

Não é código de produto. Sem PR. Resultado: decisão registrada.

- [ ] **Step 1:** instalar JDK 17 e `npm i -g @bubblewrap/cli`; na primeira execução o Bubblewrap baixa o Android SDK.
- [ ] **Step 2:** numa pasta temporária fora do repo, `bubblewrap init --manifest=https://app.useaprumo.com.br/manifest.webmanifest` com package `br.com.useaprumo.app`, nome "Aprumo", e keystore de teste local; `bubblewrap build`; instalar o `.apk` no celular (`adb install`).
- [ ] **Step 3:** no aparelho, conferir: abre em tela cheia sem barra de endereço (sem `assetlinks.json` vai aparecer a barra, isso é esperado nesta etapa); login com e-mail e senha; login com Google; F5/voltar mantém a sessão; cadastro com e-mail de confirmação.
- [ ] **Step 4:** se o login com Google falhar, tentar a Custom Tab e, se ainda falhar, **parar e voltar ao Lucas** com as opções (design, "Plano B"). Não trocar de empacotamento sozinho.

### Task 7: Projeto Android e `assetlinks.json` (frontend-developer, com o Lucas fornecendo fingerprints)

**Files:**
- Create: `android/twa-manifest.json` (gerado pelo `bubblewrap init`, revisado: sem caminhos de keystore pessoais)
- Create: `android/README.md` (como gerar o `.aab` e onde guardar a keystore fora do repo)
- Modify: `.gitignore` (`android/*.keystore`, `android/*.jks`, `android/build/`, `android/*.aab`, `android/*.apk`, `android/local.properties`, `android/node_modules/`)
- Create: `frontend/public/.well-known/assetlinks.json`
- Modify: `vercel.json` (cabeçalho `Content-Type: application/json` para `/.well-known/assetlinks.json`, sem mexer na CSP)
- Test: `frontend/src/assetlinks.test.ts`

**Interfaces:**
- Consumes: os dois fingerprints SHA-256 (chave de upload e chave do Play App Signing), que o Lucas copia do painel da Play depois do primeiro envio de `.aab` (Task 8). Até lá o arquivo fica com o fingerprint de upload só.
- Produces: `assetlinks.json` no formato `[{"relation":["delegate_permission/common.handle_all_urls"],"target":{"namespace":"android_app","package_name":"br.com.useaprumo.app","sha256_cert_fingerprints":[...]}}]`.

- [ ] **Step 1: Escrever o teste que falha** `assetlinks.test.ts`: o JSON é um array, `package_name` é `br.com.useaprumo.app`, cada fingerprint casa com `/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/`, e `vercel.json` tem o cabeçalho `Content-Type: application/json` para esse caminho. Teste `gitignore`: contém as linhas de keystore, `.aab` e `.apk`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && npx vitest run src/assetlinks.test.ts --reporter=dot`
Expected: FAIL.

- [ ] **Step 3: Implementar** os arquivos. `android/twa-manifest.json` com `host` `app.useaprumo.com.br`, `startUrl` `/`, `themeColor` `#27187E`, `display` `standalone`, `signingKey` apontando para um caminho relativo sem a keystore versionada.

- [ ] **Step 4: Rodar tudo e commitar**

Run: `cd frontend && npx vitest run --reporter=dot && npm run build`
Expected: verde.

```bash
git add android frontend vercel.json .gitignore
git commit -m "chore(android): projeto TWA e assetlinks do Digital Asset Links"
```

- [ ] **Step 5 (após o merge e o deploy a pedido do Lucas):** conferir em produção `curl -sI https://app.useaprumo.com.br/.well-known/assetlinks.json` com `content-type: application/json` e `200`, e abrir o `.aab` de teste interno vendo o app sem barra de endereço.

---

## Passos do Lucas e preparação da ficha (sem PR de código)

### Task 8: Conta, teste fechado e publicação

**Files:**
- Create: `docs/play-store/ficha-da-loja.md` (textos prontos em pt-BR: nome, descrição curta de até 80 caracteres, descrição longa, notas da versão, respostas de Segurança dos dados e classificação indicativa). Sem credenciais nem dados pessoais.

- [ ] **Step 1 (Lucas):** criar a conta de desenvolvedor pessoa física na Play Console (taxa única de US$ 25, verificação de identidade e telefone) e anotar o número exato de testadores e de dias do teste fechado exibido no painel.
- [ ] **Step 2 (eu):** escrever `ficha-da-loja.md` e gerar o ícone 512, a imagem de destaque 1024x500 e os prints de celular (mínimo 2) com a conta de revisor e dados de exemplo, nunca dados reais.
- [ ] **Step 3 (Lucas):** criar a conta de revisor (e-mail confirmado, dados de exemplo) e colocar login e senha no campo "Acesso ao app" da Play Console. A senha só existe no painel.
- [ ] **Step 4 (Lucas):** gerar o `.aab` assinado (`android/README.md`), enviar para teste interno, copiar os dois fingerprints, passar para mim (Task 7).
- [ ] **Step 5 (Lucas):** recrutar 12 a 20 testadores (confirmar o mínimo no painel), publicar o teste fechado e manter por 14 dias seguidos.
- [ ] **Step 6 (Lucas):** preencher as declarações (Segurança dos dados, classificação, público adulto, sem anúncios, recursos financeiros, URL da política `https://app.useaprumo.com.br/privacidade`, URL de exclusão `https://app.useaprumo.com.br/excluir-conta`, contato `aprumo.assistente@gmail.com`) e pedir produção.

---

## Auto-revisão

- **Cobertura do spec:** front mobile (Tasks 3 e 4), manifest (5), exclusão de conta com backend e telas (1 e 2), spike e empacotamento (6 e 7), conta e ficha (8). O "Mais" do topo reaproveita o botão "Abrir menu" da barra de topo atual, sem tarefa nova; se o Lucas quiser o rótulo visível "Mais", entra como ajuste na Task 3.
- **Ordem:** PR 1 antes do build assinado (a Play exige exclusão); Task 6 antes de PR 4; Task 8 passo 1 pode começar hoje, em paralelo.
- **Consistência de tipos:** `ExcluirContaRequest`, `useExcluirConta`, `useEhCelular`, `LARGURA_CELULAR`, `ITENS_DOCK`, `DockInferior` e `AcaoRapida` têm o mesmo nome em todas as tarefas.
- **Riscos que viram parada:** Google no TWA (Task 6 passo 4) e `temSenha` ausente em `/me` (Task 2 passo 3).
