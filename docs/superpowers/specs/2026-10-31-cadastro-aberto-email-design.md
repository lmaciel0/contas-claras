# Cadastro aberto com e-mail confirmado, Google e recuperação de senha

Data: 2026-10-31. Status: aguardando aprovação do dono.

## Por quê

O Contas Claras é portfólio público, mas só e-mails da lista `ALLOWED_EMAILS` criam conta. O dono quer que qualquer visitante use o app. Sem a lista, o e-mail precisa ser provado, e a conta precisa de recuperação de senha. O botão Sair também parece quebrado e entra nesta entrega.

## Objetivos

1. O Sair reage na hora ao clique.
2. Qualquer visitante cria conta; a lista `ALLOWED_EMAILS` sai do código.
3. Login e cadastro oferecem Google, com o ícone na tela.
4. O cadastro normal pede a senha duas vezes e só cria a conta depois da confirmação por e-mail, com código de 6 dígitos ou link clicável.
5. "Esqueci a senha": a pessoa informa o e-mail, recebe um código e define a senha nova.
6. A troca entre login e cadastro é animada, e as telas seguem o CSS de referência (Uiverse, Smit-Prajapati).

## Não objetivos

- Domínio próprio. O envio começa por um Gmail só do app.
- Reduzir o cold start da API.
- Mudar `/conta/senha` ou o visual das telas logadas.
- Persistir `LimiteTentativasLogin` (ver Riscos).

## Anti-objetivos

- Resposta ou tempo revelarem quais e-mails têm conta.
- Conta criada sem prova de posse do e-mail.
- Botão sem nenhuma reação durante o cold start.
- Um script esgotar a cota de envio do Gmail.

## Decisões do dono

- Qualquer visitante pode criar conta; a lista sai.
- Sem domínio: envio por um Gmail só do app, com senha de app.
- O e-mail de cadastro traz código e link. O de senha traz só código.
- Sem mockup: o CSS de referência basta.

## O que os logs de produção mostraram

Em 2026-10-31, às 03:08 UTC, chegaram 8 `POST /api/auth/logout` em 7 s. Cada um subiu uma instância própria. O Spring leva cerca de 12 s para iniciar, e a primeira resposta só foi possível cerca de 15 s depois do clique. Duas instâncias caíram com `FATAL: (EMAXCONNSESSION) max clients reached in session mode - max clients are limited to pool_size: 15`. As instâncias encerraram cerca de 35 s depois de subir.

Consequências para este design:

- Quase todo passo depois de uma pausa enfrenta cold start, então toda ação de envio mostra estado de espera e ignora clique repetido.
- A API roda em várias instâncias, então limites novos ficam no banco, não em memória.

## Parte 1: Sair

- `MenuUsuario`: fecha o menu no clique em Sair.
- `MolduraDoUsuario`: guarda o estado `saindo`, mostra "Saindo…" (`role="status"`, mesma posição do aviso de erro) e ignora novos cliques. Em falha, volta ao aviso de erro atual e libera o botão.
- `application.yml`: `spring.datasource.hikari.maximum-pool-size: 2` e `minimum-idle: 0`. Sem configuração, o padrão é 10 por instância, e duas instâncias já quase esgotam as 15 conexões.

## Parte 2: Backend

### Dados (migração `V4`)

```sql
create table codigo_email (
    id          bigserial primary key,
    tipo        varchar(10) not null check (tipo in ('CADASTRO', 'SENHA')),
    email       varchar(254) not null,
    nome        varchar(120),          -- só CADASTRO
    senha_hash  varchar(100),          -- só CADASTRO
    codigo_hmac varchar(64) not null,
    token_hash  varchar(64),           -- só CADASTRO
    tentativas  int not null default 0,
    expira_em   timestamptz not null,
    criado_em   timestamptz not null default now(),
    unique (tipo, email)
);

create table envio_email (
    id          bigserial primary key,
    email_hmac  varchar(64) not null,
    ip_hmac     varchar(64) not null,
    criado_em   timestamptz not null default now()
);
create index on envio_email (email_hmac, criado_em);
create index on envio_email (ip_hmac, criado_em);
create index on envio_email (criado_em);
```

O cadastro pendente fica fora de `usuario`. Assim, nenhum caminho de login precisa conhecer "conta não confirmada", e um cadastro pendente não ocupa o e-mail de ninguém. Linhas vencidas são apagadas a cada escrita, e `envio_email` guarda só as últimas 24 h.

### Endpoints públicos

| Rota | Corpo | Resposta |
|---|---|---|
| `POST /api/auth/cadastro` | `nome, email, senha` | sempre `202`, sem cookie |
| `POST /api/auth/cadastro/reenviar` | `email` | sempre `202` |
| `POST /api/auth/cadastro/confirmar` | `email, codigo` ou `token` | `201`, cookie e `UsuarioResponse` |
| `POST /api/auth/esqueci-senha` | `email` | sempre `202` |
| `POST /api/auth/redefinir-senha` | `email, codigo, senha` | `200`, cookie e `UsuarioResponse` |

Erros usam o formato atual `{erro}`. Código errado, vencido, esgotado ou de e-mail desconhecido responde sempre `400` com "Código inválido ou expirado."

### Regras de envio

Cadastro e esqueci-senha enviam sempre exatamente um e-mail, para resposta e tempo não dependerem de o e-mail ter conta:

| Pedido | E-mail sem conta | E-mail com conta |
|---|---|---|
| Cadastro | código + link | aviso: já existe conta; entre ou use "Esqueci a senha" |
| Esqueci-senha | aviso: não há conta com este e-mail | código |

Ordem no cadastro: validar, gerar o BCrypt (sempre), aplicar limites, decidir o e-mail, gravar, enviar.

Reenvio: com cadastro pendente, gera novo código e novo link e mantém nome e senha. Sem pendência, responde `202` sem enviar. Esse caso revela só que não há cadastro pendente, nunca que há conta; o risco é aceito.

Limites, contados em `envio_email`:

- **Por e-mail:** um envio a cada 60 s. Dentro desse prazo, responde `202` sem enviar, nos dois casos da tabela, e um retry do cliente não invalida o código anterior.
- **Por e-mail:** 3 por hora. Acima disso, `429`.
- **Por IP:** 10 por hora. Acima disso, `429`.
- **Global:** 300 em 24 h, com margem abaixo do limite do Gmail. Acima disso, `429`.

A mensagem do `429` é sempre "Muitos pedidos agora. Tente de novo mais tarde."

O SMTP roda dentro da requisição, com `await` efetivo, porque a Vercel pode pausar trabalho em segundo plano depois da resposta. O envio fica fora de transação, para não prender conexão. Falha de SMTP responde `503` com mensagem genérica e não consome limite nem o prazo de 60 s.

### Código e link

- **Código:** 6 dígitos de `SecureRandom`, com zeros à esquerda. Validade de 15 min. Máximo de 5 tentativas; depois a linha é apagada. Uso único. Novo pedido substitui o anterior.
- **Tentativas:** incremento sob `select ... for update`, porque há instâncias paralelas.
- **Hash do código:** HMAC-SHA256 de `tipo|email|codigo`, com chave derivada de `JWT_SECRET`. Comparação em tempo constante.
- **Link:** 32 bytes aleatórios em base64url, guardados como SHA-256. Mesmo prazo do código. Aponta para `${APP_URL}/confirmar?token=...`.
- **Pré-carregamento:** abrir o link não confirma nada. Confirmar exige clique em um botão da página, porque filtros de e-mail podem abrir links sozinhos.

### Regras de conta

- Confirmar chama `criarUsuario`, com o hash guardado, e emite sessão. Se o e-mail já virou conta (ex.: Google nesse meio-tempo), apaga a pendência e responde o erro genérico.
- Redefinir valida o tamanho da senha antes de consumir tentativa, grava o hash, chama `invalidarSessoes` e emite sessão nova. Vale também para conta só com Google.
- `entrarComGoogle` perde a checagem da lista e cria a conta para qualquer e-mail verificado pelo Google. O resto do fluxo não muda, inclusive vincular e apagar a senha.
- Sai: `EmailsLiberados`, `ALLOWED_EMAILS`, `app.allowed-emails` e os usos em testes, `DemoSeeder`, `.env.example` e `README`. Specs e planos antigos ficam como estão.

### Envio

- Interface `EnvioEmail`, para trocar o Gmail por uma API HTTP depois sem tocar nas regras.
- Implementação SMTP com `smtp.gmail.com:587`, STARTTLS e timeouts de no máximo 10 s (`spring.mail.properties[mail.smtp.*]`).
- Profile `dev`: implementação que escreve o e-mail no console. Em produção, código e link nunca vão para log.
- SMTP sem configuração: a API sobe, registra aviso, e as rotas de envio respondem `503`. Login e o resto do app seguem funcionando.
- Mensagens em PT-BR, com HTML simples e texto plano. O assunto não contém o código. O corpo traz a validade e "Se não foi você, ignore este e-mail".

## Parte 3: Frontend

### Telas

- `/login`: e-mail, senha, "Esqueci a senha", Google, link para cadastro.
- `/cadastro`: nome, e-mail, senha, repetir senha, Google, link para login. Senhas diferentes bloqueiam o envio no próprio formulário. Sucesso leva a `/confirmar`, com o e-mail no estado da rota, nunca na URL.
- `/confirmar`:
  - Sem token: e-mail, código (`inputMode="numeric"`, `autoComplete="one-time-code"`), "Reenviar" com contagem de 60 s e aviso para olhar o spam.
  - Com `?token=`: lê o token, tira da URL com `history.replaceState` e mostra só o botão "Confirmar minha conta".
- `/esqueci-senha`: passo 1 com e-mail; passo 2 com código, senha nova e repetir senha. Também com "Reenviar" e contagem.

Quem já tem sessão é levado a `/`. Todo botão de envio mostra estado de espera e fica desabilitado enquanto a chamada dura. O `AvisoServidor` segue cobrindo o cold start.

### Google

`BotaoGoogle` passa a usar `type: 'icon'` e `shape: 'circle'` no `renderButton`, sob o texto "ou continue com". Fica no layout compartilhado das telas, para não reinicializar a cada troca. A regra atual continua: sem `VITE_GOOGLE_CLIENT_ID`, não aparece.

### Visual e animação

- Do CSS de referência: card com raio de 40 px, borda branca de 5 px e sombra azulada; campos brancos em pílula, com sombra e borda lateral no foco; botão em gradiente, com escala no hover e no clique; títulos em peso 900.
- Vale para `/login`, `/cadastro`, `/confirmar` e `/esqueci-senha`.
- Animação: uma rota-layout com `<Outlet />` e `key={pathname}`. Deslize horizontal com fade em cerca de 300 ms, com direção conforme a ordem das telas. Só CSS, sem dependência nova. `prefers-reduced-motion` desliga.

## Configuração e operação

| Variável | Onde | Valor |
|---|---|---|
| `MAIL_USERNAME`, `MAIL_PASSWORD` | Vercel, `.local/segredos.env` | Gmail do app e senha de app |
| `APP_URL` | Vercel | `https://contas-claras-ten.vercel.app` |
| `GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID` | Vercel | Client ID do OAuth |
| `ALLOWED_EMAILS` | Vercel | remover depois do deploy |

O dono precisa fazer, porque depende das contas dele:

1. Criar o Gmail do app, ligar a verificação em duas etapas e gerar a senha de app.
2. Criar o OAuth Client (web) no Google Cloud, com a origem `https://contas-claras-ten.vercel.app`, e publicar a tela de consentimento.

A senha de app vai direto para `.local/segredos.env`, nunca para o chat. O código pode ser escrito e testado antes disso, mas o deploy vem depois das variáveis configuradas.

## Testes

- TDD, com os agents `java-spring` e `frontend-developer`.
- Backend: um teste por linha das tabelas de endpoints e de envio; expiração; quinta tentativa errada; uso único; limites; falha de SMTP; corrida de tentativas; ausência de código em log. `CadastroSemEnumeracaoTest` é reescrito para o novo fluxo: mesma resposta e mesmo número de envios com ou sem conta.
- Frontend: senhas diferentes; estados de espera; clique repetido no Sair; token fora da URL; contagem do reenvio; reduced motion.
- Revisão: `code-reviewer` e `security-auditor`, porque a mudança toca autenticação e entrada externa.
- Em produção: cadastro real por código e por link, Google, esqueci-senha e Sair.

## Riscos aceitos

- **Gmail:** a ajuda do Google cita 500 envios por dia em conta pessoal, sem detalhar o caso de SMTP. Trocar a senha da conta revoga a senha de app, e o próprio Google não recomenda esse tipo de senha. A Vercel prefere API HTTP em produção. A interface `EnvioEmail` deixa a troca barata.
- **Remetente `@gmail.com`:** o e-mail pode cair no spam; a tela avisa.
- **`LimiteTentativasLogin` em memória:** o Javadoc diz "uma única instância", mas os logs mostram várias, então o limite de login vale por instância. O problema já existe hoje e fica fora desta entrega; `melhorias.md` já o lista.
- **IP por `X-Forwarded-For`:** o plano precisa confirmar que a Vercel não repassa valor forjado até o container.

## Decisões do autor, para o dono conferir

- Cor: mantive formas e efeitos do CSS de referência, mas com o índigo do app (`--cor-principal`) no lugar do azul e ciano. O ciano com texto branco tem contraste baixo, e a tela de login ficaria diferente do resto do app.
- Rótulos visíveis nos campos, em vez de só placeholder, e nenhum texto menor que 12 px.
- "Esqueci a senha" é uma tela no mesmo card, não um modal, para funcionar bem no celular.
- Confirmar o cadastro ou redefinir a senha já entra na conta.
- Os valores de prazo e limite: 15 min, 5 tentativas, 60 s, 3/h por e-mail, 10/h por IP, 300/dia.
- Pool Hikari de 2 conexões, não 3 como no plano do chat: os logs mostraram 8 instâncias ao mesmo tempo.
