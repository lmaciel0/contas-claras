# Política de privacidade e termos de uso: plano de implementação

> **Para agentes:** use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans. Todo código de front-end é escrito pelo agent `frontend-developer`. Os passos usam checkbox (`- [ ]`).

**Objetivo:** publicar `/privacidade` e `/termos` (páginas públicas) e linkar nas telas de login e cadastro, para o cadastro aberto do Aprumo ficar em conformidade com a LGPD.

**Arquitetura:** duas páginas estáticas em React, fora da área logada e fora do `LayoutAuth`, com um layout comum (`PaginaLegal`). Os dados do responsável ficam em um único arquivo de constantes. Sem mudança de backend.

**Tech stack:** React 19, TypeScript, react-router, Tailwind, vitest + Testing Library.

**Branch:** `feat/politica-privacidade`, a partir da `main` atualizada. Um PR só. Quem faz o merge é o Lucas.

**Fora de escopo (PRs próprios, depois):** exclusão de conta e exportação de dados pela interface (backend), `noindex`, `robots.txt`, OG image, hospedar a política no apex `useaprumo.com.br` para a Play Store.

## Restrições globais

- Português do Brasil, sem travessão como pontuação.
- Só tokens de cor `--cor-*`, alvo de toque mínimo `min-h-11`, foco visível, `prefers-reduced-motion` respeitado.
- Nunca `dangerouslySetInnerHTML`.
- O texto não promete recurso que não existe. Hoje não há exclusão nem exportação pela interface: a política diz que o pedido é feito por e-mail.
- Não é parecer jurídico. O Lucas deve decidir se quer uma revisão por advogado antes de divulgar.

## Fatos que o texto deve refletir (levantados no código em 2026-11-05)

- **Dados da conta:** nome, e-mail, senha (guardada só como hash BCrypt), identificador do Google (`google_sub`) quando o login é pelo Google, data de criação.
- **Conteúdo do usuário:** categorias, cartões e itens, lançamentos (valores, status, vencimentos), tarefas, notas, projetos e subtarefas.
- **Verificação por e-mail:** código e link de cadastro ou redefinição, válidos por 15 minutos, com e-mail e nome guardados temporariamente. Máximo de 5 tentativas.
- **Segurança e abuso:** o IP não é gravado em claro; só um HMAC do IP e do e-mail por até 24 horas, para limitar envios. O limite de tentativas de login fica só em memória.
- **Cookie:** `cc_session`, só de sessão, HttpOnly, Secure, SameSite=Strict, 24 h. Sem rastreamento, sem analytics, sem publicidade.
- **localStorage:** `aprumo-ultima-atividade`, `aprumo-preferencias`, `aprumo-tema`, `aprumo-reflexoes-favoritas`. Só preferências visuais, favoritos e horário da última atividade.
- **Terceiros (operadores):** Google (login com Google), Gmail SMTP (envio dos e-mails), Supabase (banco, EUA, `us-east-1`), Render (API, EUA, Virginia), Vercel (front, São Paulo, e repasse das chamadas `/api`). Isso é transferência internacional de dados (LGPD art. 33).
- **Sem integração com Google Calendar** hoje. Não mencionar.
- **Logs dos provedores:** a retenção é definida por eles e não é controlada pelo Aprumo. O texto diz isso, sem inventar prazo.

## Decisões minhas (o Lucas pode trocar)

1. **Base legal:** execução de contrato (art. 7, V) para conta e conteúdo; legítimo interesse (art. 7, IX) para segurança e limite de abuso. Sem consentimento como base, então sem checkbox.
2. **Idade:** termos dizem que o app é para maiores de 18 anos. O cadastro não verifica idade. Isso evita o regime de dados de crianças (art. 14).
3. **Encarregado:** o próprio responsável, no mesmo contato.
4. **Prazo de resposta a pedidos de titular:** 15 dias.
5. **Legislação aplicável:** brasileira, sem cláusula de foro.
6. **Links nas telas de auth abrem em nova aba** (`target="_blank"` com `rel="noopener noreferrer"`), para quem está preenchendo o cadastro não perder o formulário.

## Dados do responsável (fornecidos pelo Lucas em 2026-11-05; plano aprovado)

- `RESPONSAVEL_NOME`: `Lucas Maciel`
- `CONTATO_EMAIL`: `aprumo.assistente@gmail.com`
- Ficam em `frontend/src/legal/responsavel.ts`. O nome tem duas palavras, então o teste de `RESPONSAVEL_NOME` vale como está.

## Foco da revisão

Entradas e condições que o plano não cobre por tarefa, mais prováveis primeiro:

1. Visitante sem sessão abre `/privacidade` ou `/termos` direto (link do e-mail ou da Play Store): não pode ser jogado para o login.
2. Usuário logado abre `/privacidade`: não pode ser redirecionado para o painel.
3. Recarregar a página em produção em `/privacidade`: o rewrite da Vercel deve servir o app (conferir com `curl` após o deploy).
4. Tema escuro: texto e links legíveis com os tokens (conferência manual).
5. Contato vazio ou com valor de exemplo publicado por engano: o teste do Task 1 barra.

## Mapa de arquivos

- Criar `frontend/src/legal/responsavel.ts`: constantes do responsável.
- Criar `frontend/src/legal/PaginaLegal.tsx`: layout comum (título, vigência, link "Voltar", conteúdo).
- Criar `frontend/src/legal/PrivacidadePage.tsx` e `TermosPage.tsx`: o texto.
- Criar testes ao lado: `responsavel.test.ts`, `PrivacidadePage.test.tsx`, `TermosPage.test.tsx`.
- Modificar `frontend/src/App.tsx`: duas rotas públicas.
- Modificar `frontend/src/auth/LayoutAuth.tsx`: rodapé com os dois links.
- Modificar `frontend/src/auth/CadastroPage.tsx` e o aviso do botão Google: frase de ciência.
- Modificar `frontend/src/layout/DockLateral.tsx`: link para quem está logado.

---

### Task 1: Base e Política de Privacidade

**Arquivos:**
- Criar: `frontend/src/legal/responsavel.ts`, `PaginaLegal.tsx`, `PrivacidadePage.tsx`
- Testar: `frontend/src/legal/responsavel.test.ts`, `PrivacidadePage.test.tsx`, `frontend/src/App.test.tsx`
- Modificar: `frontend/src/App.tsx`

**Interfaces:**
- Produz: `RESPONSAVEL_NOME: string`, `CONTATO_EMAIL: string`, `VIGENCIA: string` (data `dd/mm/aaaa`, hoje 05/11/2026) em `responsavel.ts`.
- Produz: `PaginaLegal({ titulo, children })`, usado também pelo Task 2.
- Produz: `PrivacidadePage()` na rota `/privacidade`.

- [ ] **Passo 1: branch.** `git checkout main && git pull && git checkout -b feat/politica-privacidade`.
- [ ] **Passo 2: testes que falham.**
  - `responsavel.test.ts`: `CONTATO_EMAIL` casa com `/^[^@\s]+@[^@\s]+\.[^@\s]+$/` e não contém `exemplo`; `RESPONSAVEL_NOME` tem ao menos duas palavras.
  - `PrivacidadePage.test.tsx`: há um `h1` "Política de Privacidade"; há um `h2` para cada seção da lista abaixo; o texto contém `CONTATO_EMAIL`, "Supabase", "Render", "Vercel", "Google", "cc_session" e "15 dias"; não há `a` com `href` vazio.
  - `App.test.tsx`: sem sessão, `/privacidade` mostra o `h1` e não o formulário de login; com sessão, também mostra o `h1`.
- [ ] **Passo 3: rodar** `cd frontend && npx vitest run src/legal src/App.test.tsx`. Esperado: FALHA (módulos inexistentes).
- [ ] **Passo 4: implementar** `responsavel.ts` com os dados fornecidos pelo Lucas, `PaginaLegal.tsx` e `PrivacidadePage.tsx`. Seções (`h2`), nesta ordem, cada uma cobrindo os fatos acima:
  1. Quem somos (controlador e encarregado, com contato)
  2. Dados que coletamos
  3. Para que usamos e base legal (art. 7, V e IX)
  4. Com quem compartilhamos (operadores e transferência internacional, art. 33)
  5. Cookies e armazenamento local
  6. Por quanto tempo guardamos (conta ativa; exclusão a pedido; códigos 15 min; HMAC 24 h; cópias e logs dos provedores sob prazo deles)
  7. Segurança
  8. Seus direitos (art. 18: confirmação, acesso, correção, anonimização ou eliminação, portabilidade, informação sobre compartilhamento, revogação; pedido por e-mail, resposta em até 15 dias; direito de reclamar à ANPD)
  9. Crianças e adolescentes (app para maiores de 18)
  10. Mudanças nesta política (vigência no topo)
- [ ] **Passo 5: rotas.** Em `App.tsx`, `/privacidade` fica fora de `RotaProtegida` e fora de `LayoutAuth`. Se houver regra que redirecione logado para longe de rota pública, a nova rota fica de fora dela.
- [ ] **Passo 6: rodar** os mesmos testes. Esperado: PASSA.
- [ ] **Passo 7: commit.** `feat(legal): política de privacidade pública em /privacidade`.

### Task 2: Termos de Uso

**Arquivos:**
- Criar: `frontend/src/legal/TermosPage.tsx`
- Testar: `frontend/src/legal/TermosPage.test.tsx`, `frontend/src/App.test.tsx`
- Modificar: `frontend/src/App.tsx`

**Interfaces:**
- Consome: `PaginaLegal`, `CONTATO_EMAIL`, `VIGENCIA` do Task 1.
- Produz: `TermosPage()` na rota `/termos`.

- [ ] **Passo 1: testes que falham.** `TermosPage.test.tsx`: `h1` "Termos de Uso", um `h2` por seção abaixo, texto contém `CONTATO_EMAIL` e "18 anos", e há um `a` para `/privacidade`. `App.test.tsx`: `/termos` abre sem sessão.
- [ ] **Passo 2: rodar** `npx vitest run src/legal src/App.test.tsx`. Esperado: FALHA.
- [ ] **Passo 3: implementar** `TermosPage.tsx` e a rota. Seções: O serviço (app pessoal, gratuito, sem garantia de disponibilidade); Quem pode usar (maiores de 18 anos); Sua conta e senha (responsabilidade do usuário); Seu conteúdo (continua sendo seu; você responde por ele); O que não é permitido (abuso, automação, tentativa de acesso a dados alheios); Não é aconselhamento financeiro; Suspensão e exclusão de conta; Limitação de responsabilidade; Mudanças; Lei aplicável (brasileira) e contato.
- [ ] **Passo 4: rodar** os testes. Esperado: PASSA.
- [ ] **Passo 5: commit.** `feat(legal): termos de uso públicos em /termos`.

### Task 3: Links e aviso de ciência

**Arquivos:**
- Modificar: `frontend/src/auth/LayoutAuth.tsx`, `CadastroPage.tsx`, `frontend/src/layout/DockLateral.tsx`
- Testar: os testes existentes dessas telas (ex.: `LayoutAuth.test.tsx`, `CadastroPage.test.tsx`, `DockLateral.test.tsx`), criando o arquivo se não existir

**Interfaces:**
- Consome: rotas `/privacidade` e `/termos`.

- [ ] **Passo 1: testes que falham.**
  - Login, cadastro, confirmar e esqueci-senha mostram dois links, "Política de Privacidade" para `/privacidade` e "Termos de Uso" para `/termos`, ambos com `target="_blank"` e `rel` contendo `noopener`.
  - Cadastro mostra perto do botão de envio a frase "Ao criar a conta, você declara ter lido a Política de Privacidade e os Termos de Uso." com os dois links; o botão do Google tem aviso equivalente.
  - Dock lateral (logado) tem um link para `/privacidade`.
- [ ] **Passo 2: rodar** `npx vitest run src/auth src/layout`. Esperado: FALHA nos novos testes.
- [ ] **Passo 3: implementar.** Rodapé em `LayoutAuth.tsx` depois do cartão (único ponto das quatro telas); frase em `CadastroPage.tsx`; link discreto no `DockLateral.tsx`, junto do comentário "Links adicionais quando expandida".
- [ ] **Passo 4: verificação completa.** `cd frontend && npx vitest run --reporter=dot && npm run lint && npm run build`. Esperado: tudo verde, sem erro de lint e sem novo aviso de build.
- [ ] **Passo 5: commit.** `feat(legal): links de privacidade e termos nas telas de auth e no menu`.

### Fechamento

- [ ] Revisão única do diff final com `code-reviewer`. `security-auditor` não é necessário: não há auth, entrada externa nem dado sensível novos.
- [ ] Push, abrir PR para o Lucas mergear.
- [ ] Depois do merge e do deploy do front (HANDOFF seção 4): `curl -sS -o /dev/null -w "%{http_code}\n" https://app.useaprumo.com.br/privacidade` deve dar 200, e abrir no navegador sem sessão e com sessão, em tema claro e escuro.
