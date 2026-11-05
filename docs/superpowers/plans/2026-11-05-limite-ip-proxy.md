# Limite de envio por IP atrás de Vercel + Render — Plano

> **Para agentes:** use `superpowers:subagent-driven-development` ou `superpowers:executing-plans`. Todo código Java (inclusive teste) é escrito pelo agent `java-spring`. Passos usam checkbox (`- [ ]`).

**Goal:** o limite de 10 envios/hora por IP (`LimiteEnvio.MAX_POR_IP_HORA`) contar o cliente de verdade, sem que um cliente consiga forjar o IP para fugir do limite nem que todos os usuários da Vercel caiam no mesmo balde.

**Architecture:** hoje `AuthController` passa `http.getRemoteAddr()` a `FluxoEmailService` (cadastro, reenvio, esqueci-senha). Com `server.forward-headers-strategy: framework` o `ForwardedHeaderFilter` do Spring 7 reescreve `getRemoteAddr()` a partir de `X-Forwarded-For` (o teste `IpAtrasDoProxyTest` prova isso no MockMvc). Falta provar qual salto da cadeia real (cliente → Vercel rewrite → balanceador do Render → API) vira o IP e se dá para forjar. Primeiro mede-se em produção, depois trava-se o salto confiável.

**Tech Stack:** Spring Boot 4.1.2 (Spring Framework 7.0.10), JUnit 5 + MockMvc (`IntegracaoTest`), Render, Vercel.

**Spec:** sem design à parte; origem é `HANDOFF.md` §7 ("Limite de envio por IP usa `getRemoteAddr()`").

## Global Constraints

- Nunca ler nem imprimir `.local/segredos.env`; responder em português do Brasil.
- Não gravar IP em claro: `LimiteEnvio` já usa HMAC do IP; o log temporário da Task 1 é a única exceção e sai na Task 2.
- A API é pública em `api.useaprumo.com.br` (a Vercel só reescreve `/api/*` para ela, ver `vercel.json`), então o `X-Forwarded-For` pode chegar sem passar pela Vercel.
- Commit e push só quando o usuário pedir.

## Review Focus

- `X-Forwarded-For` forjado em chamada direta à API (sem Vercel): o IP forjado não pode zerar nem trocar o balde de quem forja.
- Cabeçalho `X-Forwarded-For` ausente: usa o endereço da conexão, sem erro.
- Cabeçalho malformado ou com várias vírgulas/espaços: não derruba a requisição (nada de 500) e não vira chave vazia.
- Cadeia de 2 saltos (cliente, Vercel): clientes diferentes caem em baldes diferentes.
- IPv6 no cabeçalho: tratado como uma chave, sem quebrar o HMAC.

---

### Task 1: Medir o formato real em produção (log temporário)

**Files:**
- Modify (temporário, não vai para a `main`): `backend/src/main/java/dev/lmaciel/aprumo/auth/AuthController.java:75-77` (método `esqueciSenha`)

**Interfaces:**
- Produces: uma tabela anotada (no HANDOFF, Task 2) com o `X-Forwarded-For` bruto e o `getRemoteAddr()` nos 3 cenários abaixo.

- [ ] **Step 1: Branch nova** `fix/limite-ip-proxy` a partir da `main` atualizada.
- [ ] **Step 2: `java-spring` adiciona** em `esqueciSenha` um `log.info("DIAG-IP remoteAddr={} xff={}", http.getRemoteAddr(), http.getHeader("X-Forwarded-For"))`. O `ForwardedHeaderFilter` remove `X-Forwarded-*` da requisição, então o log lê o cabeçalho bruto por um `OncePerRequestFilter` temporário ordenado antes do filtro, ou compara com `strategy: native` se o bruto não aparecer; o agent escolhe o mais simples e explica.
- [ ] **Step 3: Verificar build:** `cd backend && ./mvnw -q test -Dtest=IpAtrasDoProxyTest` passa.
- [ ] **Step 4: Deploy do log no Render** (push da branch + deploy manual da branch no serviço `aprumo-api`, voltando para `main` na Task 2). Pedir ao usuário o "ok" antes do push, por ser publicação externa.
- [ ] **Step 5: Três chamadas reais** a `POST /api/auth/esqueci-senha` com um e-mail descartável:
  1. `https://app.useaprumo.com.br/api/auth/esqueci-senha` (via Vercel);
  2. a mesma, com cabeçalho `X-Forwarded-For: 203.0.113.9` (forjado, via Vercel);
  3. `https://api.useaprumo.com.br/api/auth/esqueci-senha` direto, com `X-Forwarded-For: 203.0.113.9`.
- [ ] **Step 6: Ler os logs do Render** e anotar, por cenário, `remoteAddr` e `xff` bruto. Saída esperada: cenário 1 mostra o IP do cliente (e talvez um IP da Vercel no fim); 3 mostra `203.0.113.9` à esquerda e o IP real à direita.

### Task 2: Travar o salto confiável (TDD)

Regra de decisão pelos dados da Task 1:

| Resultado medido | Implementação |
|---|---|
| Vercel sobrescreve o `X-Forwarded-For` e o Render só acrescenta o IP da Vercel (formato `cliente, vercel`); chamada direta fica `forjado, real` | Chave do limite = `X-Forwarded-For` na posição do salto confiável contada **da direita**; chamada direta (cabeçalho com 1 salto, só o IP do balde) usa o próprio IP da conexão |
| Todos os saltos confiáveis têm o mesmo formato | Usar `server.tomcat.remoteip` (`internal-proxies` restrito) com `forward-headers-strategy: native` |
| Não dá para distinguir via Vercel de direto sem forjar | Parar e voltar ao usuário: opção é segredo compartilhado no rewrite ou aceitar o IP da conexão |

**Files (conforme a linha da tabela escolhida):**
- Create: `backend/src/main/java/dev/lmaciel/aprumo/auth/IpDoCliente.java` (resolve o IP do cliente de `HttpServletRequest`)
- Modify: `backend/src/main/java/dev/lmaciel/aprumo/auth/AuthController.java:49,55,76` (trocar `http.getRemoteAddr()` por `ipDoCliente.de(http)`; remover o log da Task 1)
- Modify: `backend/src/main/resources/application.yml:53` (se a estratégia mudar)
- Modify: `backend/src/test/java/dev/lmaciel/aprumo/auth/IpAtrasDoProxyTest.java`
- Modify: `HANDOFF.md:88` (remover a pendência; registrar o formato medido e a regra)

**Interfaces:**
- Produces: `IpDoCliente` com `String de(HttpServletRequest requisicao)`; nunca devolve nulo nem vazio (cai no `getRemoteAddr()`).

- [ ] **Step 1: Testes falhando** em `IpAtrasDoProxyTest`, nomes e asserções:
  - `cadeia_de_dois_saltos_separa_clientes_diferentes`: `X-Forwarded-For: <IP_A>, <IP_VERCEL>` ×10 aceitos, 11º do A é 429; `<IP_B>, <IP_VERCEL>` é 202.
  - `x_forwarded_for_forjado_a_esquerda_nao_troca_o_balde`: 10 pedidos com `forjado1, <IP_A>, <IP_VERCEL>`, `forjado2, <IP_A>, <IP_VERCEL>` etc.; o 11º é 429.
  - `sem_cabecalho_usa_o_endereco_da_conexao`: pedido sem `X-Forwarded-For` responde 202, não 500.
  - `cabecalho_malformado_nao_derruba`: `X-Forwarded-For: ,,  ,` responde 202 ou 429, nunca 5xx.
  - `ipv6_no_cabecalho_vira_uma_chave`: `2001:db8::1, <IP_VERCEL>` ×10 aceitos, 11º é 429.
  Os valores (`IP_VERCEL` etc.) vêm da medição da Task 1.
- [ ] **Step 2: Rodar e ver falhar:** `cd backend && ./mvnw -q test -Dtest=IpAtrasDoProxyTest` → falha nos testes novos.
- [ ] **Step 3: Implementar `IpDoCliente`** (`@Component`, injetado em `AuthController`) conforme a linha da tabela; remover o log temporário.
- [ ] **Step 4: Rodar e ver passar:** `./mvnw -q test -Dtest=IpAtrasDoProxyTest` e depois `./mvnw -q test` completo.
- [ ] **Step 5: Atualizar `HANDOFF.md`** (remover o item da §7, anotar o formato medido).
- [ ] **Step 6: Revisão e verificação:** `code-reviewer` + `security-auditor` (entrada externa, cabeçalho de rede) no diff final; depois `superpowers:verification-before-completion` e `superpowers:finishing-a-development-branch`. Deploy do Render de volta à `main` após o merge.

---

## Resultado da Task 1 e decisão (2026-11-05)

Medido em produção (API com log temporário; o log já saiu, produção voltou ao commit da `main`):

| Chamada | XFF bruto na API |
|---|---|
| via Vercel | `cliente,ipVercel, ipBordaRender` |
| via Vercel com XFF forjado | igual (a Vercel descarta o forjado) |
| direto na API com XFF forjado | `forjado,cliente, ipBordaRender` |

Nenhuma posição fixa contada da direita serve aos dois caminhos (cai na linha 3 da tabela). Decisão do dono ("o que você acha melhor"): **segredo compartilhado no rewrite**.

- Vercel: `routes` com transform `request.headers` `set` `X-Aprumo-Origem: $ORIGEM_SEGREDO` para `/api/*`.
- API: `server.forward-headers-strategy` sai de `framework` (o filtro reescrevia `getRemoteAddr()` com o IP forjado e apagava o XFF). `IpDoCliente` lê o XFF bruto: com o cabeçalho de segredo correto, cliente = 3º da direita; sem ele (ou errado, ou segredo não configurado), cliente = 2º da direita. XFF curto, vazio ou malformado cai em `getRemoteAddr()`.
- Segredo: variável `ORIGEM_SEGREDO` no Render (nome na API: `aprumo.proxy.segredo-origem`) e na Vercel. Nunca no repo.
- Ordem de rollout: API primeiro (sem segredo configurado ela se comporta como "direto"), depois segredo no Render e na Vercel, depois `vercel.json`.
