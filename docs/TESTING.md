# Testes

## Comandos

Backend (precisa de Docker, porque os testes de integração sobem o Postgres com Testcontainers):

```bash
cd backend && ./mvnw -q verify
```

Front-end:

```bash
cd frontend
npm test -- --run     # Vitest, uma execução
npm run lint          # oxlint
npm run build         # tsc -b && vite build
```

O CI (`.github/workflows/ci.yml`) roda exatamente esses comandos em todo push e pull request. Se um teste sem relação com a mudança falhar, rode o arquivo isolado antes de concluir qualquer coisa.

Saída enxuta: mostre só o resumo e as falhas (`./mvnw -q`, `npx vitest run --reporter=dot`).

## Regra de TDD

1. Escreva o teste que falha.
2. Rode e confirme que falha pelo motivo certo (não por erro de sintaxe ou import).
3. Implemente o mínimo para passar.
4. Rode a suíte inteira, o lint e o build antes de dizer que terminou.

## Testes que guardam o visual

- `frontend/src/estilos.test.ts` confere o contraste dos tokens de cor (AA, e 3:1 em bordas de campo e no botão de tema) nos temas claro e escuro, proíbe cor fixa em TSX de produção (`bg-white`, `text-white`, hex em `bg`/`text`) e exige `prefers-reduced-motion` nas animações. Vitest roda com `css: false`, então o teste lê o `index.css` direto do disco.
- `frontend/src/designSystemDoc.test.ts` impede que `docs/DESIGN_SYSTEM.md` divirja do `index.css`: todo token `--cor-*` precisa estar no documento, com o mesmo valor.

## Gate visual (mudança que toca tela)

Depois de implementar, antes da revisão de código, confira a tela em navegador real com o `agent-browser`:

1. Sessão fixa: `AGENT_BROWSER_SESSION=prints`.
2. Viewport do celular: `agent-browser set viewport 360 640 3`. Repita em 768 e 1280 de largura.
3. Entre com a conta de revisor (dados fictícios; a conta de revisor usa a API de produção, nunca use dados reais).
4. Esconda a barra de rolagem para o print: CSS `::-webkit-scrollbar{display:none}`.
5. Tire os prints com `agent-browser screenshot`, nos temas claro e escuro.
6. Compare com `docs/DESIGN_SYSTEM.md` e liste as falhas (corte, rolagem horizontal, contraste, alvo de toque menor que 44 px, primeira dobra no celular).

Corrigir CSS trivial (até 1 arquivo, sem tela nova) dispensa o gate.

Prints oficiais do README ficam em `docs/prints/`; os da loja, em `docs/play-store/`. Refaça só se a tela mudar.

## O que cada tipo de mudança exige

| Mudança | Mínimo |
|---|---|
| Regra de negócio ou dinheiro | teste de backend que falha primeiro, com `BigDecimal` |
| Endpoint novo | teste de integração, inclusive "outro usuário recebe 404" |
| Tela ou componente | teste de componente, 360 px, tema claro e escuro, gate visual |
| Token de cor novo | entrada em `docs/DESIGN_SYSTEM.md` (o teste de deriva cobra) |
