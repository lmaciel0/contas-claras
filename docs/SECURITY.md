# Segurança

O repositório é público. Nada aqui contém segredo, e nada de segredo pode entrar aqui.

## Autenticação e sessão

- Sessão: JWT HS256 assinado pela API, em cookie `HttpOnly`, `Secure`, `SameSite=Strict`. Nada fica em `localStorage`.
- Cada token carrega a versão de sessão do usuário: trocar a senha ou vincular o Google invalida os tokens antigos.
- Inatividade: o front encerra a sessão após 30 minutos sem atividade (`frontend/src/auth/useTimeoutInatividade.ts`).
- Cadastro só nasce depois de confirmação por código de 6 dígitos ou link enviado por e-mail; a senha é definida nessa confirmação. E-mail novo e já cadastrado recebem a mesma resposta.
- Limites no banco: envio de e-mail (1 a cada 60 s e 3 por hora por e-mail, 10 por hora por IP, 300 em 24 h) e login (5 tentativas por e-mail a cada 15 minutos).
- Google: o ID token é validado no backend (emissor, expiração, audience e `email_verified`).
- Isolamento: toda consulta filtra pelo usuário autenticado; recurso de outro usuário responde 404, nunca 403.
- Origem: a Vercel manda um cabeçalho secreto ao repassar `/api/*`, e o IP do cliente é lido do fim da cadeia `X-Forwarded-For`, não do começo.
- Front: CSP restrita (só Google Identity Services como origem externa), `X-Frame-Options: DENY`, `nosniff`, redirecionamento pós-login validado contra open redirect. Nunca `dangerouslySetInnerHTML`.

## Entrada externa

- Relato de erros: `POST /api/diagnostico/erros` é público (o erro pode ocorrer antes do login). Tem limite por IP, o texto é limpo no servidor (e-mail, token, query string, id na rota, caracteres de controle) e só vai para o log, sem IP nem usuário.
- Nota: o conteúdo é JSON do editor validado por lista permitida de nós e marcas (`ConteudoNota`). Mudar o editor exige mudar a lista do backend junto.
- Importação de planilha: só pelo perfil `importar` na linha de comando, para conta vazia do dono.

## Onde ficam os segredos

- `.local/` (ignorado pelo git): senhas, JWT e credenciais locais. Nunca comitar, nunca ler, nunca imprimir `.local/segredos.env`.
- Produção: variáveis nos painéis do Render e da Vercel. O modelo de nomes está em `.env.example`.
- Também fora do git: `.env`, `.env.*`, `.mcp.json` (referencia chave de serviço), `*.xlsx` com dados pessoais, keystore Android (`*.jks`).
- Prints e conta de revisor usam dados fictícios. Nunca use dados reais.

## Bloqueio de leitura no Claude Code

O `~/.claude/settings.json` do dono tem `permissions.deny` para `Read(./.local/**)`, `Read(./.env)`, `Read(./.env.*)` e `Read(./.mcp.json)`.

Verificado em 2026-11-12, com um arquivo inofensivo em `.local/`:
- A ferramenta `Read` nesses caminhos é negada pela permissão.
- Comandos de shell como `cat` e `ls` sobre esses caminhos também foram barrados na sessão de teste, mas a garantia do `deny` para `Bash` é só parcial: ele reconhece comandos de leitura conhecidos, não qualquer programa. Leitura por interpretador (`python -c`, `node -e`, `sed`, `awk` e semelhantes) não deve ser tratada como coberta.

O que NÃO cobre:
- Outros agentes e ferramentas fora do Claude Code (por exemplo Gemini), que dependem da regra escrita no `AGENTS.md`.
- Segredo que já foi colado em conversa, log ou commit.
- Efeito colateral: `Read(./.env.*)` também bloqueia `.env.example`, que é só um modelo sem segredo. Para ler o modelo, peça ao Lucas ou ajuste o `deny`.

Por isso a regra de texto continua valendo: não abrir esses arquivos por nenhum meio.

## Quando chamar o `security-auditor`

Chame o agent `security-auditor` quando a mudança tocar:
- autenticação, sessão, cadastro, recuperação de senha ou Google;
- autorização ou isolamento por usuário (qualquer consulta nova que filtre por dono);
- dados sensíveis (valores financeiros, e-mail, exportação, exclusão de conta);
- entrada externa: HTTP público, upload ou importação de arquivo, fila, webhook;
- cabeçalhos de segurança, CSP, CORS, cookies ou limites de taxa.
