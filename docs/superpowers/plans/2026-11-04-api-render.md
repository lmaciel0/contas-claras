# API no Render Starter com o domínio useaprumo.com.br — Plano de Implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: usar `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar este plano tarefa a tarefa. Os passos usam checkbox (`- [ ]`). Passos marcados **[LUCAS]** só o Lucas pode fazer: o agente pausa, diz exatamente o que fazer e espera o aviso.

**Goal:** a API do Aprumo deixa de dormir (hoje a primeira requisição leva até 17 s): roda sempre ligada no Render Starter, junto de um banco novo na mesma região, atrás do domínio `useaprumo.com.br`.

**Architecture:** front continua na Vercel em `app.useaprumo.com.br`. A Vercel repassa `/api/*` ao Render (`api.useaprumo.com.br`) por rewrite externo, então o navegador só fala com uma origem: o cookie `SameSite=Strict` e a ausência de CORS/CSRF no backend continuam valendo e **nenhum Java muda**. Banco: projeto novo do Supabase em `us-east-1`, mesma região do Render (Virginia), dados migrados por `pg_dump`/`pg_restore`.

**Tech Stack:** Render (Blueprint `render.yaml`, Docker), Vercel (`vercel.json`, rewrite externo), Supabase Postgres 17 (session pooler), Registro.br (DNS), Vitest, Docker (`postgres:17` para dump/restore).

**Spec:** não há documento de design separado. O desenho foi aprovado no chat em 2026-11-04 e está resumido na Arquitetura acima e em `~/.claude/projects/-home-lmaciel0--rea-de-trabalho-repositorios-contas-claras/memory/missoes-2026-11-04-aprumo.md`.

## Global Constraints

- Português do Brasil em commits, PR e mensagens. Commits convencionais (`chore(infra): ...`).
- Branch `chore/api-render` (já criada a partir da `main`, commit `e4be042`). **Quem faz o merge é o Lucas.** Nunca force push na `main`.
- Nunca ler, imprimir ou commitar `.local/segredos.env`. Comandos que precisam dele rodam pelo Lucas com `! comando` e a saída não pode conter valores secretos.
- Zero mudança em `.java`. Ajustes do pool de conexões vão por variável de ambiente no Render.
- Domínios: front `app.useaprumo.com.br`; API `api.useaprumo.com.br`; apex `useaprumo.com.br` fica livre (missão 3: política de privacidade da Play Store).
- Render: plano `starter`, região `virginia`, health check `/api/health`. Supabase novo: região `us-east-1`, conexão pelo **session pooler** (IPv4), nunca pelo host direto (só IPv6).
- Teste-guarda `frontend/src/nome.test.ts` (nome antigo) e `frontend/src/vercel.test.ts` (headers e rotas) continuam verdes.
- Deploy da Vercel só a partir de `git archive main` em pasta temporária, nunca da pasta do repo (subiria `.local/`).
- A Vercel atual (`contas-claras-ten.vercel.app`, API em container + banco de São Paulo) fica intacta até a Tarefa 6. O banco antigo só é lido, nunca alterado.

## Review Focus

1. **Cookie atravessa o rewrite:** depois do login pelo domínio novo, o `Set-Cookie` (`cc_session`, `Secure`, `SameSite=Strict`, `HttpOnly`) chega ao navegador e a sessão sobrevive a um F5. Teste manual na Tarefa 6.
2. **Upload grande pelo rewrite:** a importação de planilha (`importacao/`) envia arquivo pela Vercel até o Render. Se o limite de corpo do proxy for menor que o do backend, falha silenciosa. Teste manual na Tarefa 6 com uma planilha real.
3. **Perda de dados na migração:** linhas gravadas depois do dump somem. Mitigação: congelar o uso entre o dump final e a virada, e comparar contagem de linhas por tabela (Tarefa 6).
4. **Memória do Starter (512 MB):** a JVM usa `MaxRAMPercentage=65` e `-XX:+ExitOnOutOfMemoryError`; se estourar, o Render reinicia. Conferir nos logs após uso normal (Tarefa 6).
5. **Health check durante o deploy:** Flyway roda na subida; se a migration demorar, o Render derruba o deploy. Conferir `Deploy live` e a versão de `flyway_schema_history` (Tarefa 3).
6. **Esgotar conexões do pooler:** o pooler grátis aceita 15 conexões; pool do Hikari em 8 deixa folga para o dump e o console SQL (Tarefa 3).

---

## Estrutura de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `render.yaml` | criar | Blueprint do serviço `aprumo-api` (Docker, Starter, Virginia, health check, variáveis) |
| `vercel.json` | modificar | só o service `web`; `/api/*` vira rewrite externo para `api.useaprumo.com.br` |
| `frontend/src/vercel.test.ts` | modificar | bloco "Vercel Services" passa a descrever o rewrite externo |
| `frontend/src/nome.test.ts` | modificar | remove a exceção `contas-claras-ten.vercel.app` (Tarefa 5) |
| `README.md` | modificar | URL do app, diagrama e seção Deploy |
| `HANDOFF.md` | atualizar (fora do git) | novo fluxo de deploy e domínios |

---

## Tarefa 1: Banco novo no Supabase (us-east-1) e ensaio de migração

**Quem:** Lucas cria o projeto e o arquivo de variáveis; o agente confere e ensaia o dump/restore.

**Interfaces:**
- Produz: `NOVO_PG_URI` e `ANTIGO_PG_URI` em `.local/segredos.env` (formato `postgresql://USUARIO:SENHA@HOST:5432/postgres`, ambos pelo **session pooler**), usados só por comandos que o Lucas roda com `!`.

- [ ] **Step 1 [LUCAS]: liberar vaga no Supabase.** O plano grátis permite 2 projetos ativos; `flow-games` e `readmecraft` estão pausados. No painel do Supabase, conferir se criar um terceiro projeto é permitido. Se não for, o Lucas decide: apagar um projeto pausado (irreversível) ou assinar o Pro.
- [ ] **Step 2 [LUCAS]: criar o projeto `aprumo`.** Região **East US (N. Virginia) / us-east-1**, senha forte guardada só por ele. Em "Connect", copiar a string do **Session pooler** (porta 5432, usuário `postgres.<ref>`).
- [ ] **Step 3 [LUCAS]: editar `.local/segredos.env`** acrescentando as duas linhas `NOVO_PG_URI=...` (projeto novo) e `ANTIGO_PG_URI=...` (projeto `contas-claras` de São Paulo, também pelo session pooler). Não colar nada disso no chat.
- [ ] **Step 4: conferir o ambiente do ensaio.** Rodar `docker --version` e `docker pull postgres:17 -q`. Esperado: Docker responde e a imagem baixa.
- [ ] **Step 5 [LUCAS]: ensaio de dump.** Rodar com `!`:
  `set -a; . .local/segredos.env; set +a; docker run --rm --network host postgres:17 pg_dump "$ANTIGO_PG_URI" --schema=contas --no-owner --no-privileges -Fc > /tmp/aprumo-ensaio.dump && ls -l /tmp/aprumo-ensaio.dump`
  Esperado: arquivo com tamanho maior que zero e nenhuma mensagem de erro.
- [ ] **Step 6 [LUCAS]: ensaio de restore.** Rodar com `!`:
  `set -a; . .local/segredos.env; set +a; docker run --rm -i --network host postgres:17 pg_restore --no-owner --no-privileges --clean --if-exists -d "$NOVO_PG_URI" < /tmp/aprumo-ensaio.dump; echo "saida=$?"`
  Esperado: `saida=0` (avisos de "does not exist, skipping" do `--clean` em banco vazio são normais).
- [ ] **Step 7 [LUCAS]: comparar contagens exatas.** Rodar com `!` (imprime só nomes de tabela e números):
  `set -a; . .local/segredos.env; set +a; for u in "$ANTIGO_PG_URI" "$NOVO_PG_URI"; do docker run --rm --network host postgres:17 psql "$u" -Atc "select table_name, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from contas.%I', table_name), false, true, '')))[1]::text from information_schema.tables where table_schema='contas' and table_type='BASE TABLE' order by 1" | md5sum; done`
  Esperado: os dois hashes iguais. Se diferirem, rodar de novo sem o `md5sum` e comparar tabela a tabela.
- [ ] **Step 8: apagar o dump do ensaio.** `rm -f /tmp/aprumo-ensaio.dump` (tem dados pessoais).


> **Executada em 2026-11-04 (Steps 1 a 8 prontos; ajustes descobertos no ensaio):**
> - O banco usa o schema **`contas`** (não `public`), dono `contas_app` (sem superusuário, `search_path=contas`). Os comandos acima já usam `--schema=contas`.
> - Projeto novo: ref `uvqzounxlmjcrygnozjl`, `us-east-1`, **Data API desligada** (a API fala só por JDBC). Pooler de sessão: `aws-0-us-east-1.pooler.supabase.com:5432`, usuário `<role>.uvqzounxlmjcrygnozjl`.
> - No banco novo foi criado o role `contas_app` (login, `search_path=contas`, sem superusuário) e o schema `contas` passou a ser dele, igual ao antigo. O restore roda como `postgres` com `--no-owner`; depois: `grant contas_app to postgres; alter schema contas owner to contas_app;` + laço `alter table/sequence ... owner to contas_app` + `revoke contas_app from postgres;`.
> - Em `.local/segredos.env` foram acrescentados `NOVO_DB_PASSWORD`, `NOVO_APP_PASSWORD`, `ANTIGO_PG_URI`, `NOVO_PG_URI` (sem imprimir valores). Variáveis do Render: `DATABASE_URL=jdbc:postgresql://aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`, `DATABASE_USERNAME=contas_app.uvqzounxlmjcrygnozjl`, `DATABASE_PASSWORD=$NOVO_APP_PASSWORD`.
> - Resultado do ensaio: dump 44 873 bytes, restore `0`, contagens exatas iguais nas 12 tabelas (ex.: `lancamento` 338, `item` 42, `usuario` 3), `contas_app` conecta e enxerga as tabelas. Dump do ensaio apagado.

Sem commit: esta tarefa não altera arquivos do repo.

---

## Tarefa 2: Blueprint do Render (`render.yaml`)

**Files:**
- Create: `render.yaml`

**Interfaces:**
- Produz: serviço Render `aprumo-api` (web, Docker). Variáveis fixas no YAML e variáveis secretas com `sync: false` (o Lucas preenche no painel):
  - fixas: `SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE=5`, `SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE=1`, `SPRING_DATASOURCE_HIKARI_IDLE_TIMEOUT=600000`.
  - secretas (`sync: false`): `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `JWT_SECRET`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `APP_URL`, `GOOGLE_CLIENT_ID`.

- [ ] **Step 1: criar `render.yaml` na raiz** com um único serviço: `type: web`, `name: aprumo-api`, `runtime: docker`, `dockerfilePath: ./backend/Dockerfile`, `dockerContext: ./backend`, `plan: starter`, `region: virginia`, `healthCheckPath: /api/health`, `autoDeploy: false` (decisão minha: o deploy segue manual, como o HANDOFF pede, e passa a ser o botão "Manual Deploy" ou a CLI), e o bloco `envVars` acima. Comentário no topo explicando o porquê do Starter (sempre ligado) e da região (junto do Supabase `us-east-1`). Os nomes `SPRING_DATASOURCE_HIKARI_*` funcionam por relaxed binding do Spring Boot e sobrescrevem `application.yml` sem tocar em código.
- [ ] **Step 2: validar o YAML.** Rodar `python3 -c "import yaml,sys; d=yaml.safe_load(open('render.yaml')); s=d['services'][0]; assert s['plan']=='starter' and s['region']=='virginia' and s['healthCheckPath']=='/api/health'; print('ok', len(s['envVars']))"`. Esperado: `ok 11`.
- [ ] **Step 3: rodar o teste-guarda do nome.** `cd frontend && npx vitest run src/nome.test.ts --reporter=dot`. Esperado: 3 passando (o `render.yaml` não pode conter o nome antigo).
- [ ] **Step 4: commit.**
  ```bash
  git add render.yaml
  git commit -m "chore(infra): blueprint do Render para a API"
  ```

---

## Tarefa 3: Criar o serviço no Render e subir a API contra o banco novo

**Quem:** Lucas cadastra o cartão e dá as permissões; o agente conduz o painel pelo Brave (`agent-browser --auto-connect`, só a aba do Render) e verifica.

**Pré-requisitos:** Tarefas 1 e 2 prontas; a branch `chore/api-render` com o `render.yaml` empurrada (`git push -u origin chore/api-render`).

- [ ] **Step 1 [LUCAS]: cadastrar o cartão.** Render → Billing → "Add Card". O Starter custa cerca de US$ 7/mês.
- [ ] **Step 2 [LUCAS]: conectar o GitHub ao Render.** Se ainda não estiver, autorizar o repo `lmaciel0/contas-claras` (Account settings → GitHub).
- [ ] **Step 3: criar o serviço pelo Blueprint.** Render → Blueprints → New Blueprint Instance → repo `lmaciel0/contas-claras`, branch `chore/api-render`. Esperado: o painel lista o serviço `aprumo-api` (Starter, Virginia) e pede as 8 variáveis `sync: false`.
- [ ] **Step 4 [LUCAS]: preencher as 8 variáveis secretas.** Valores: `DATABASE_URL` no formato `jdbc:postgresql://HOST_DO_POOLER_NOVO:5432/postgres`, `DATABASE_USERNAME` = `contas_app.<ref-do-projeto-novo>` (role sem superusuário; nunca `postgres.<ref>`), `DATABASE_PASSWORD` = senha do `contas_app`; `JWT_SECRET`, `MAIL_USERNAME`, `MAIL_PASSWORD` e `GOOGLE_CLIENT_ID` = **os mesmos valores atuais da Vercel** (mudar o `JWT_SECRET` desloga todo mundo); `APP_URL` = `https://app.useaprumo.com.br`. O agente não vê esses valores.
- [ ] **Step 5: acompanhar o primeiro deploy.** Esperado nos logs do Render: Flyway reconhece o histórico já restaurado ("Schema ... is up to date" ou "Successfully validated 6 migrations") e o serviço fica `Live`. Se o health check falhar, ler o log, não adivinhar.
- [ ] **Step 6: testar a API pela URL do Render.** `curl -s https://<nome-do-servico>.onrender.com/api/health`. Esperado: `{"status":"ok"}`.
- [ ] **Step 7: medir que não dorme.** Esperar 20 min sem tráfego e rodar `curl -s -o /dev/null -w '%{time_total}\n' https://<nome-do-servico>.onrender.com/api/health` 3 vezes. Esperado: cada uma abaixo de 1 s.

Sem commit.

---

## Tarefa 4: Registro.br publicado e DNS

**Quem:** Lucas (pagamento e DNS); o agente entrega os valores e confere.

- [ ] **Step 1 [LUCAS]: pagar o domínio.** Painel do Registro.br → `useaprumo.com.br` (ticket 32554858) → pagar o boleto/Pix. Esperado: status muda de "Registrando" para "Publicado".
- [ ] **Step 2: conferir a publicação.** `whois useaprumo.com.br | head -20` ou `dig +short NS useaprumo.com.br`. Esperado: servidores de nome do Registro.br (`*.dns.br`).
- [ ] **Step 3: adicionar os domínios nos provedores.** Render → `aprumo-api` → Settings → Custom Domains → `api.useaprumo.com.br` (mostra o alvo CNAME). Vercel (projeto `aprumo-app`): `vercel domains add app.useaprumo.com.br` ou `vercel api` POST em `/v10/projects/aprumo-app/domains` (mostra o alvo CNAME, normalmente `cname.vercel-dns.com`). O agente anota os dois alvos para o Lucas.
- [ ] **Step 4 [LUCAS]: criar os registros no Registro.br.** Painel → Domínios → `useaprumo.com.br` → "Editar zona" (DNS do próprio Registro.br, modo avançado): `api` CNAME → alvo do Render; `app` CNAME → alvo da Vercel. Sem registro para o apex.
- [ ] **Step 5: esperar e verificar.** `dig +short CNAME api.useaprumo.com.br` e `dig +short CNAME app.useaprumo.com.br` devolvem os alvos; Render e Vercel mostram os domínios como verificados e emitem o certificado TLS. Depois: `curl -s https://api.useaprumo.com.br/api/health`. Esperado: `{"status":"ok"}`.

Sem commit.

---

## Tarefa 5: Vercel só com o front e rewrite externo (TDD)

**Files:**
- Modify: `frontend/src/vercel.test.ts` (bloco `vercel.json: projeto com Vercel Services`)
- Modify: `vercel.json`, `frontend/src/nome.test.ts`, `README.md`

**Quem escreve:** agent `frontend-developer` (teste em TypeScript), conforme o fluxo do CLAUDE.md; o `vercel.json` e o README são configuração/documentação.

**Interfaces:**
- Produz: `vercel.json` com `services` contendo só `web`; `rewrites` = `[{ source: '/api/(.*)', destination: 'https://api.useaprumo.com.br/api/$1' }, { source: '/(.*)', destination: { service: 'web' } }]` nessa ordem; `headers` e `regions` inalterados.

- [ ] **Step 1: escrever os testes que falham** em `frontend/src/vercel.test.ts`, substituindo `api_e_o_container_do_backend` e `roteia_api_para_o_servico_api_e_o_resto_para_o_web_nessa_ordem`:
  - `nao_tem_mais_o_service_api`: `expect(Object.keys(vercel.services)).toEqual(['web'])`.
  - `repassa_api_ao_render_e_o_resto_ao_web_nessa_ordem`: `expect(vercel.rewrites).toEqual([{ source: '/api/(.*)', destination: 'https://api.useaprumo.com.br/api/$1' }, { source: '/(.*)', destination: { service: 'web' } }])`.
  - `destino_da_api_usa_o_dominio_proprio_e_nao_o_onrender`: o JSON inteiro não contém `onrender.com` (mantém `nao_referencia_mais_o_render`, com o texto do `it` ajustado para "nao_expoe_a_url_tecnica_do_render").
  - Ajustar o tipo `Rewrite.destination` se necessário para aceitar `string`; ele já aceita.
- [ ] **Step 2: ver falhar.** `cd frontend && npx vitest run src/vercel.test.ts --reporter=dot`. Esperado: 2 falhas (service `api` ainda existe; rewrite ainda aponta para `{ service: 'api' }`).
- [ ] **Step 3: editar `vercel.json`:** remover `services.api` e trocar o primeiro rewrite pelo destino externo acima.
- [ ] **Step 4: ver passar.** `cd frontend && npx vitest run src/vercel.test.ts src/nome.test.ts --reporter=dot`. Esperado: tudo verde.
- [ ] **Step 5: validar o formato na Vercel antes de qualquer produção.** Gerar um deploy de **preview** (sem `--prod`) a partir de `git archive` da branch em pasta temporária: `rm -rf /tmp/deploy && mkdir /tmp/deploy && git archive chore/api-render | tar -x -C /tmp/deploy && cd /tmp/deploy && vercel link --yes --project aprumo-app && vercel deploy --yes`. Esperado: build sem erro e a URL de preview responde `curl -s <preview>/api/health` com `{"status":"ok"}` (vindo do Render). **Se a Vercel recusar rewrite externo junto de `services`:** parar, registrar o erro e voltar ao Lucas com a alternativa (mover o front para um projeto Vercel comum com `frontend/` como Root Directory). Não improvisar.
- [ ] **Step 6: atualizar o `README.md`:** diagrama (Vercel → Render → Supabase `us-east-1`), a linha da tabela "Deploy" e a seção "Deploy" (novo fluxo: API pelo Render, front pela Vercel; lista de variáveis por plataforma; `APP_URL` e a origem autorizada no Google). Trocar também a linha `**App:**` para `https://app.useaprumo.com.br` e remover de `frontend/src/nome.test.ts` o `.replaceAll('contas-claras-ten.vercel.app', '')` (a exceção deixa de existir). Rodar `cd frontend && npx vitest run src/nome.test.ts --reporter=dot`: esperado 3 passando; se falhar, sobrou a URL antiga em arquivo versionado fora de `docs/`.
- [ ] **Step 7: commit.**
  ```bash
  git add vercel.json frontend/src/vercel.test.ts frontend/src/nome.test.ts README.md
  git commit -m "chore(infra): Vercel repassa /api ao Render por rewrite externo"
  ```

---

## Tarefa 6: Revisão, virada e verificação em produção

**Pré-requisitos:** Tarefas 1 a 5 prontas e commitadas.

- [ ] **Step 1: revisão.** Push da branch e PR para a `main` (descrição em português: o que muda, o que fica de fora, como reverter). Agent `code-reviewer` uma vez no diff final e agent `security-auditor` (a mudança toca o caminho de autenticação por cookie e uma entrada externa nova). Corrigir o que for importante.
- [ ] **Step 2 [LUCAS]: merge do PR** no GitHub (squash and merge). Depois: `git checkout main && git pull`.
- [ ] **Step 3 [LUCAS]: congelar o uso.** Avisar que ninguém usa o app daqui até o Step 7 (o dump final não pode perder gravações).
- [ ] **Step 4: pausar a API nova.** Render → `aprumo-api` → Suspend (evita escrever no banco novo durante o restore).
- [ ] **Step 5 [LUCAS]: migração final.** Com `!`: repetir os Steps 5 e 6 da Tarefa 1 trocando o nome do arquivo para `/tmp/aprumo-final.dump` e mantendo `--clean --if-exists`. Esperado: `saida=0`. Comparar as contagens exatas com o mesmo comando do Step 7 da Tarefa 1. Esperado: hashes idênticos.
- [ ] **Step 6: religar a API.** Render → Resume. Esperado: `Live`, Flyway sem erro, `curl -s https://api.useaprumo.com.br/api/health` devolve `{"status":"ok"}`.
- [ ] **Step 7 [LUCAS]: autorizar a origem no Google.** Google Cloud Console → Credenciais → OAuth Client web → "Origens JavaScript autorizadas" → acrescentar `https://app.useaprumo.com.br`. Manter a origem antiga até a Tarefa 7.
- [ ] **Step 8: deploy de produção do front** pelo fluxo do HANDOFF (seção 4): `git archive main` em `/tmp/deploy`, `vercel link --yes --project aprumo-app`, `vercel deploy --prod --yes`, e atribuir `app.useaprumo.com.br` ao deploy. Apagar `/tmp/deploy` ao final (tem `.env.local`).
- [ ] **Step 9: verificação em produção** (o agente roda o que der por `curl`; o resto o Lucas confirma no navegador):
  1. `curl -s https://app.useaprumo.com.br/api/health` → `{"status":"ok"}`.
  2. **[LUCAS]** Login por e-mail/senha e por Google em `https://app.useaprumo.com.br`; F5 mantém a sessão (Review Focus 1).
  3. **[LUCAS]** Abrir `/notas` e criar uma nota; abrir `/lancamentos`; criar e excluir uma tarefa.
  4. **[LUCAS]** Importar uma planilha real pelo app (Review Focus 2).
  5. Latência: `for i in 1 2 3 4 5; do curl -s -o /dev/null -w '%{time_total}\n' https://app.useaprumo.com.br/api/health; done`. Esperado: todas abaixo de 1 s, sem a primeira lenta.
  6. Depois de 20 min parado, repetir o item 5. Esperado: igual (sem cold start).
  7. Logs do Render nas últimas horas sem `OutOfMemoryError` nem reinício (Review Focus 4).

**Reversão (se qualquer item do Step 9 falhar de forma que não se resolva rápido):** na Vercel, `vercel rollback` para o deploy anterior (volta ao service `api` em container + banco de São Paulo, que nunca foi alterado) e o Lucas remove a origem nova do Google. Gravações feitas só no banco novo depois da virada seriam perdidas; por isso o congelamento do Step 3 só termina após o Step 9.

---

## Tarefa 7: Fechamento

- [ ] **Step 1: aposentar o antigo (só depois de uso real sem problemas, com o ok do Lucas).** Vercel: redirecionar `contas-claras-ten.vercel.app` para `https://app.useaprumo.com.br`; remover as variáveis `DATABASE_*`, `JWT_SECRET`, `MAIL_*` do projeto `aprumo-app`. Supabase: pausar o projeto `contas-claras` (São Paulo), sem apagar, por 30 dias de segurança. Google: remover a origem antiga.
- [ ] **Step 2: atualizar o `HANDOFF.md` local** (fora do git): novo fluxo de deploy (Render manual + Vercel), domínios, IDs do serviço Render e do projeto Supabase novo, tarefa B encerrada.
- [ ] **Step 3: atualizar a memória do projeto** (`missoes-2026-11-04-aprumo.md`): missão 2 concluída, decisões finais (Render Virginia, Supabase `us-east-1`, rewrite externo, `app.`/`api.`).
- [ ] **Step 4: `superpowers:verification-before-completion`:** `cd frontend && npx vitest run --reporter=dot && npm run build && npm run lint`, saída real à vista; backend não mudou, então `./mvnw -q test` é opcional.
- [ ] **Step 5: `superpowers:finishing-a-development-branch`** e recomendar `/clear` ao terminar.
