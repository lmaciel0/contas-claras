# Arquitetura

Visão resumida de como o Aprumo é montado e publicado. Detalhes de decisões estão no `README.md`; o histórico de cada mudança está em `docs/superpowers/specs/` e `docs/superpowers/plans/`.

## Visão geral

```
Celular (PWA ou app TWA) / navegador
        |  HTTPS
        v
Vercel  app.useaprumo.com.br   -> front estático (React + Vite)
        |  /api/*  (rewrite externo, com cabeçalho secreto de origem)
        v
Render  api.useaprumo.com.br   -> API Spring Boot em container (Starter, Virginia)
        |  JDBC + TLS (session pooler)
        v
Supabase (PostgreSQL 17, us-east-1, schema próprio da API)
```

O navegador só fala com `app.useaprumo.com.br`. A Vercel repassa `/api/*` ao Render, então front e API ficam na mesma origem: cookie de sessão de primeira parte e sem CORS.

## Stack

| Camada | Tecnologia |
|---|---|
| API | Java 21, Spring Boot 4 (Web MVC, Security, OAuth2 Resource Server, Data JPA, Validation), Flyway, Apache POI |
| Banco | PostgreSQL 17 |
| Front | React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 8, TanStack Query 5, Recharts, Tiptap 3 (editor de notas) |
| Testes | JUnit 5, Mockito, Testcontainers; Vitest 5, Testing Library, MSW |
| Android | Trusted Web Activity gerada com Bubblewrap, sem código nativo (`android/`) |
| CI | GitHub Actions (`.github/workflows/ci.yml`) |

Versões exatas: `backend/pom.xml` e `frontend/package.json`.

## Estrutura de pastas

```
backend/    API. Pacote raiz dev.lmaciel.aprumo, um subpacote por domínio:
            auth, usuario, categoria, item, lancamento, cartao, saldo, metas,
            nota, projeto, tarefa, resumo, relatorio, importacao, exportacao,
            diagnostico, saude, demo, comum
frontend/   SPA. src/paginas (painel = Início `/`, inicio = Visão geral `/financeiro`, lancamentos, cartoes, categorias,
            relatorios, metas, notas, mais), src/componentes, src/layout,
            src/auth, src/api, src/formato, src/tema, src/preferencias,
            src/diagnostico, src/legal, src/teste
android/    twa-manifest.json e README com o passo a passo do .aab
docs/       design system, arquitetura, testes, segurança, PRD, prints,
            play-store e superpowers (specs e plans)
```

Os pacotes `projeto` e `tarefa` do backend continuam no código, mas o front deixou de expô-los (mudança "foco em finanças pessoais e notas").

## Fluxo de dados

1. A tela chama `src/api/cliente.ts`, que usa `fetch` com cookie `HttpOnly` e repete falhas de conexão por até 90 s (cobre reinício e deploy).
2. O TanStack Query guarda o resultado em cache; a tela só lê o cache.
3. A API filtra toda consulta pelo usuário autenticado e devolve dinheiro como string (`"1234.56"`).
4. Mudanças de schema entram só por migration Flyway.

## Deploy

- **API (Render):** `render.yaml` define o serviço `aprumo-api` (Docker de `backend/`, Starter, health check `/api/health`). Deploy manual (`autoDeploy: false`), só com pedido do dono.
- **Front (Vercel):** `vercel.json` define o service `web` (`frontend/`), o rewrite de `/api/*` e os headers de segurança.
- **Variáveis e segredos:** ficam nos painéis do Render e da Vercel, nunca no repositório. O modelo está em `.env.example`.
- **Android:** `android/README.md` descreve como gerar o `.aab` a partir do manifesto.
