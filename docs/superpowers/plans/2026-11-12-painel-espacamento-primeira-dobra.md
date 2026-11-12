# Painel: espaçamento e primeira dobra no celular: Plano

> **Para o executor:** agent `frontend-developer`, TDD (teste falhando primeiro), um commit por tarefa, em português com acentos (`fix(painel): ...`). Aprovado pelo Lucas em 2026-11-12.

**Objetivo:** Na tela inicial (`/`) em 360 px, tirar o buraco de 40 px entre a frase do dia e as finanças, acabar com o card dentro de card do bloco "Finanças do mês" e fazer a "Sobra do mês" caber inteira acima da dock.

**Origem:** `Aprumo-movimento-e-identidade.docx` (diagnóstico do front) e medição da tela em produção em 2026-11-12, conta de revisor, viewport 360x640. Este plano cobre só três pontos de espaçamento do painel. As etapas 1 (tokens), 2 (movimento) e 4 (identidade "prumo") do documento ficam para planos próprios.

**Branch:** `fix/painel-espacamento-primeira-dobra`, a partir da `main` atualizada. Só `frontend/` e este arquivo. Sem backend, sem migration.

**Stack:** React 19, TypeScript, Tailwind 4 com tokens `--cor-*`, vitest + testing-library + msw. Node 22 (`source ~/.nvm/nvm.sh && nvm use 22`). Comandos: `cd frontend && npx vitest run <caminho> --reporter=dot`, `npm run build`, `npm run lint`.

---

## Medições de partida (360x640, produção)

| Ponto | Hoje | Causa |
|---|---|---|
| Espaço entre "Reflexão do dia" e "Finanças do mês" | 40 px | `PainelPage.tsx:31` embrulha `<WidgetMetaInicio />` num `div.item-entra`. Sem metas o widget devolve `null`, o `div` fica com altura 0 e o `gap-5` (20 px) conta duas vezes |
| Largura útil dentro dos cards de finanças | 262 px de 360 | `FinancasDoMes` é um `.card` (16 px de padding) que contém 4 cards com mais 16 px cada |
| Altura do card da frase | 238 px | O cabeçalho quebra em duas linhas: selo + "Sabedoria diária" (220 px) não cabem ao lado dos 3 botões (116 px) em 288 px |
| Início da "Sobra do mês" | y = 452, termina em 599 | A dock começa em y ≈ 555 e cobre o card |

**Resultado esperado:** espaço de 20 px entre os blocos; largura útil de 296 px; card da frase com cerca de 205 px; "Sobra do mês" de y ≈ 382 a 529, inteira acima da dock.

---

## Restrições Globais

- **Não tirar o `backdrop-filter: blur` de `.card` nem de `.superficie`** (pedido explícito do Lucas). Não editar essas regras em `frontend/src/index.css`.
- Só tokens `--cor-*`, sem cor fixa nova. Alvos de toque e foco visível como estão.
- Não alterar `frontend/src/paginas/inicio/` (`CardSobra`, `CardsTotais`, `GraficoResultado`, `ProximasContas`): a visão geral `/financeiro` usa os mesmos componentes.
- Não mudar a ordem dos blocos da tela inicial (decisão do Lucas: frase compacta, ordem mantida).
- Nunca commitar `HANDOFF.md`, `.mcp.json` ou `.local/`. `git add <arquivos>` explícito.

---

## Foco da Revisão

1. **Usuário com meta:** o widget continua aparecendo entre a frase e as finanças e continua entrando com a animação escalonada (`--i: 2`). Teste na Tarefa 1.
2. **Erro ao carregar o resumo:** sem o card externo, a mensagem e o botão "Tentar de novo" não podem ficar soltos sobre o fundo da página. Teste na Tarefa 2.
3. **Desktop (768 px ou mais):** a grade de 35 colunas passa a ficar direto na página. Conferir no print de 1280 px (Tarefa 4).
4. **Tela de 320 px ou fonte ampliada:** o selo e os 3 botões somam 246 px e a área útil em 320 px é 248 px. Manter o `flex-wrap` do cabeçalho para quebrar em vez de cortar.
5. **Carregando:** os 4 esqueletos já são `.card`; conferir no navegador que não ficam sem contorno.

Fora de escopo, já existia: o widget de meta aparece depois que `/api/metas` responde e empurra as finanças para baixo.

---

### Tarefa 1: wrapper vazio do widget de meta

**Arquivos:**
- Modificar: `frontend/src/paginas/painel/PainelPage.tsx:31-33`
- Modificar: `frontend/src/paginas/metas/WidgetMetaInicio.tsx`
- Teste: `frontend/src/paginas/painel/PainelPage.test.tsx`

**Interface:** `WidgetMetaInicio({ className, style }: { className?: string; style?: React.CSSProperties })`. As duas props vão para a `<section>` raiz, somadas às classes atuais.

- [ ] **Passo 1: teste que falha.** Em `PainelPage.test.tsx` (o handler padrão de `/api/metas` já devolve `[]`):

```tsx
it('sem metas, não deixa bloco vazio entre a reflexão e as finanças', async () => {
  responderResumo()
  comSessao(usuarioFicticio)
  renderizar()
  await screen.findByText('Sobra do mês')
  expect(document.querySelectorAll('.item-entra:empty')).toHaveLength(0)
})

it('com meta, o widget entra escalonado entre a reflexão e as finanças', async () => {
  responderResumo()
  servidor.use(http.get('/api/metas', () => HttpResponse.json([metaFicticia])))
  comSessao(usuarioFicticio)
  renderizar()
  const widget = await screen.findByRole('region', { name: metaFicticia.titulo })
  expect(widget).toHaveClass('item-entra')
  expect(widget.style.getPropertyValue('--i')).toBe('2')
})
```

Ajustar a preparação de sessão ao padrão dos testes vizinhos do arquivo. `metaFicticia`: objeto do tipo de meta em `api/tipos`, com `concluida: false` e valores fictícios.

- [ ] **Passo 2:** `npx vitest run src/paginas/painel/PainelPage.test.tsx --reporter=dot`. Esperado: o primeiro falha com 1 elemento vazio; o segundo falha por falta da classe.
- [ ] **Passo 3:** implementar a interface acima e, em `PainelPage.tsx`, trocar o `div` embrulhador por `<WidgetMetaInicio className="item-entra" style={{ '--i': 2 } as React.CSSProperties} />`.
- [ ] **Passo 4:** rodar o arquivo de teste de novo e os testes de `src/paginas/metas`. Esperado: tudo verde.
- [ ] **Passo 5:** commit `fix(painel): remove bloco vazio que dobrava o espaço sem metas`.

### Tarefa 2: "Finanças do mês" sem card externo

**Arquivos:**
- Modificar: `frontend/src/paginas/painel/FinancasDoMes.tsx:30` e `:73`
- Teste: `frontend/src/paginas/painel/PainelPage.test.tsx`

- [ ] **Passo 1: teste que falha.**

```tsx
it('o bloco de finanças não é um card em volta dos cards', async () => {
  responderResumo()
  comSessao(usuarioFicticio)
  renderizar()
  const bloco = await screen.findByRole('region', { name: 'Finanças do mês' })
  expect(bloco).not.toHaveClass('card')
  expect(bloco).not.toHaveClass('item-entra')
})
```

No teste existente `'o resumo falhando mostra erro com Tentar de novo e mantém a saudação'`, acrescentar: `expect(screen.getByRole('alert')).toHaveClass('card')`.

- [ ] **Passo 2:** rodar o arquivo. Esperado: os dois falham pelas classes.
- [ ] **Passo 3:** na `<section>` de `FinancasDoMes`, remover `card item-entra` (o `div.item-entra` de `PainelPage` já anima o bloco; hoje a animação roda duas vezes). No `div role="alert"`, acrescentar `card`.
- [ ] **Passo 4:** rodar o arquivo. Esperado: verde.
- [ ] **Passo 5:** commit `fix(painel): tira o card externo do bloco de finanças`.

### Tarefa 3: cabeçalho da frase em uma linha

**Arquivos:**
- Modificar: `frontend/src/paginas/painel/CardReflexao.tsx:64`
- Teste: `frontend/src/paginas/painel/CardReflexao.test.tsx`

- [ ] **Passo 1: teste que falha.**

```tsx
it('esconde o subtítulo em tela estreita para o cabeçalho caber em uma linha', () => {
  relogioEm('2026-10-31T15:00:00Z')
  renderComApp(<CardReflexao />)
  expect(screen.getByText('Sabedoria diária')).toHaveClass('hidden', 'sm:inline')
})
```

- [ ] **Passo 2:** `npx vitest run src/paginas/painel/CardReflexao.test.tsx --reporter=dot`. Esperado: falha pela classe.
- [ ] **Passo 3:** acrescentar `hidden sm:inline` ao `<span>` "Sabedoria diária". Não tirar o `flex-wrap` do cabeçalho.
- [ ] **Passo 4:** rodar o arquivo. Esperado: verde, incluindo o teste antigo que procura o texto.
- [ ] **Passo 5:** commit `fix(painel): cabeçalho da reflexão em uma linha no celular`.

### Tarefa 4: verificação (sessão principal, não o agent)

- [ ] `cd frontend && npx vitest run --reporter=dot && npm run build && npm run lint`. Mostrar totais e falhas.
- [ ] Conferir no navegador com `agent-browser` (sessão `prints`, conta de revisor) em 360x640 e 1280x800, temas claro e escuro. Medir de novo os quatro pontos da tabela de partida e comparar com o resultado esperado. O `vite dev` aponta para `localhost:8080`; se não houver API local, a conferência usa um preview da Vercel, e publicar o preview depende de "ok" do Lucas.
- [ ] Revisão única do diff da branch com o agent `code-reviewer`.
- [ ] PR `fix(painel): espaçamento e primeira dobra da tela inicial no celular`, com prints de antes e depois. Merge e deploy só com pedido do Lucas.
