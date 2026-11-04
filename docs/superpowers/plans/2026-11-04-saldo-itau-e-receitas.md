# Saldo do Itaú e card de receitas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar às receitas do Orçamento um card próprio e mostrar no topo da página o saldo do Itaú, calculado dos lançamentos pagos.

**Architecture:** Tarefa 1 é só frontend (card consolidado de receitas, sem dado novo). Tarefa 2 adiciona `GET /api/saldo?ano&mes` no backend, calculando o acumulado de lançamentos PAGO desde um mês de início configurável. Tarefa 3 liga a faixa do saldo na página.

**Tech Stack:** Java 21 / Spring Boot / JPA / Testcontainers (backend); React 19, react-query 5, Tailwind 4, vitest + MSW (frontend).

**Spec:** `docs/superpowers/specs/2026-11-04-saldo-itau-e-receitas-design.md`

## Global Constraints

- Mês de início do saldo: `2026-11`, propriedade `app.saldo.inicio` (valor padrão no `application.yml`, lida com `@Value`, como as outras `app.*`).
- Saldo do mês M = soma dos lançamentos PAGO de categorias RECEITA menos os PAGO de categorias DESPESA, de `app.saldo.inicio` até M, inclusive. PREVISTO nunca entra. Itens `cartao=true` entram como despesa comum. `valor` é sempre positivo.
- Antes do mês de início, só a faixa some; o card de Receitas aparece normalmente.
- Rótulos de receita: "Recebido" e "A receber". Despesas seguem "Pago" e "Previsto".
- Faixa: "Dinheiro no Itaú hoje" no mês corrente; em outro mês, "Saldo no Itaú ao fim de {mês}".
- Dinheiro trafega como string decimal (`"6242.00"`); formatar com `formatarMoeda` (`src/formato/moeda.ts`).
- Não tocar em `InicioPage` nem em `FinancasDoMes.tsx` (PR #35). Código Java só pelo agent `java-spring`; front-end só pelo `frontend-developer`.
- Acessibilidade: contraste 4,5:1, foco visível, `cursor-pointer` em clicáveis, `prefers-reduced-motion`, sem emoji como ícone.
- Paths: backend `backend/src/main/java/dev/lmaciel/aprumo` (abrev. `B`), testes `backend/src/test/java/dev/lmaciel/aprumo` (`T`), frontend `frontend/src` (`F`).

## Review Focus

- Dezembro sem lançamentos pagos mostra o saldo acumulado de novembro (a sobra anda para a frente). Teste na Tarefa 2.
- Outubro de 2026 (antes do início) devolve `ativo=false` mesmo havendo lançamentos pagos. Teste na Tarefa 2.
- Fatura de cartão PREVISTA não altera o saldo; PAGA subtrai. Teste na Tarefa 2.
- Mês sem nenhuma receita: card mostra "Nenhuma receita neste mês" e não mostra barra (sem divisão por zero). Teste na Tarefa 1.
- Marcar receita como Recebido/A receber atualiza a faixa na hora (invalidação da chave `['saldo']`). Teste na Tarefa 3.

---

### Task 1: Card de receitas

**Files:**
- Create: `F/paginas/lancamentos/receitas.ts`, `F/paginas/lancamentos/receitas.test.ts`
- Create: `F/paginas/lancamentos/ReceitasCard.tsx`, `F/paginas/lancamentos/ReceitasCard.test.tsx`
- Modify: `F/paginas/lancamentos/LancamentosPage.tsx` (separar receitas das despesas antes de `agrupar`), `F/paginas/lancamentos/LancamentosPage.test.tsx`

**Interfaces:**
- Produces: `totaisDeReceitas(lancamentos: LancamentoResponse[]): { recebidoCentavos: number; totalCentavos: number; percentual: number }` em `receitas.ts` (usa `paraCentavos` de `F/paginas/inicio/valores.ts`; `percentual` é inteiro 0–100, 0 quando `totalCentavos` é 0).
- Produces: `ReceitasCard(props: { lancamentos: LancamentoResponse[]; busca: string; idMudandoStatus: number | null; aoMudarStatus: (id: number, status: StatusLancamento) => void })`, mesmas props de `GrupoCategoria` sem `nome`.

- [ ] **Step 1: Testes de `totaisDeReceitas` (`receitas.test.ts`)**
  - Salário `'5500.00'` PAGO + Camila `'742.00'` PAGO → `{ recebidoCentavos: 624200, totalCentavos: 624200, percentual: 100 }`.
  - Salário PAGO + Camila PREVISTO → `{ recebidoCentavos: 550000, totalCentavos: 624200, percentual: 88 }`.
  - Lista vazia → `{ recebidoCentavos: 0, totalCentavos: 0, percentual: 0 }`.
- [ ] **Step 2: Rodar e ver falhar:** `cd frontend && npx vitest run src/paginas/lancamentos/receitas.test.ts` — Expected: FAIL (módulo não existe).
- [ ] **Step 3: Implementar `totaisDeReceitas`** em `receitas.ts`; `percentual = Math.round(recebido / total * 100)`.
- [ ] **Step 4: Rodar:** mesmo comando — Expected: PASS.
- [ ] **Step 5: Testes de `ReceitasCard` (`ReceitasCard.test.tsx`, via `renderComApp`)**
  - Com Salário e Camila PAGO: região `getByRole('region', { name: 'Receitas' })` contém "Recebido no mês", `R$ 6.242,00` com `[data-total]`, texto "100% do previsto · a receber R$ 0,00", `role="progressbar"` com `aria-valuenow=100`, e dois botões `/Salário.*Recebido/` e `/Camila.*Recebido/`.
  - Com Camila PREVISTO: texto "88% do previsto · a receber R$ 742,00", botão `/Camila.*A receber/`; clicar nele chama `aoMudarStatus(idDaCamila, 'PAGO')`; clicar em Salário chama `aoMudarStatus(idDoSalario, 'PREVISTO')`.
  - Lista vazia: mostra "Nenhuma receita neste mês" e `queryByRole('progressbar')` é `null`.
- [ ] **Step 6: Rodar e ver falhar** (`npx vitest run src/paginas/lancamentos/ReceitasCard.test.tsx`).
- [ ] **Step 7: Implementar `ReceitasCard`** em `ReceitasCard.tsx`: `<section aria-label="Receitas" className="card md:col-span-2">`; bloco superior com fundo pontilhado (`radial-gradient` com `--cor-positivo` esmaecido), rótulo, total em `--cor-positivo-texto` com `data-total` e classe `valor`; barra com `role="progressbar"`; linhas como em `GrupoCategoria` (mesmo `<Link>` para `/lancamentos/${id}` + `busca`, mesmo botão-selo, mesmas classes de tamanho, mesma regra de `idMudandoStatus`), com textos "✓ Recebido"/"A receber" e `aria-label` `${itemNome}: ${rotulo}. Tocar para marcar como ${outro}`. Verde só em receitas.
- [ ] **Step 8: Rodar** Step 6 — Expected: PASS.
- [ ] **Step 9: Teste de página (`LancamentosPage.test.tsx`)**: com Salário (categoria "Receitas", tipo RECEITA) e Moradia (DESPESA), `findByRole('region', { name: 'Receitas' })` existe, `region 'Moradia'` continua com seu total, e não existe `region 'Salário'` separada. Sem lançamento RECEITA, o card "Receitas" aparece com a mensagem vazia (quando há alguma despesa).
- [ ] **Step 10: Implementar em `LancamentosPage.tsx`**: `const receitas = lancamentos.filter(l => l.tipo === 'RECEITA')`; `agrupar` só nos demais; renderizar `<ReceitasCard>` primeiro na grade. Manter os estados de carregando, erro e vazio como estão.
- [ ] **Step 11: Rodar tudo do front:** `cd frontend && npx vitest run 2>&1 | tail -15` e `npx tsc --noEmit` — Expected: tudo PASS, sem erro de tipo.
- [ ] **Step 12: Commit** `feat(orcamento): card de receitas com total recebido em destaque`.

### Task 2: Cálculo do saldo no backend

**Files:**
- Modify: `backend/src/main/resources/application.yml` (adicionar `app.saldo.inicio: 2026-11`)
- Modify: `B/lancamento/LancamentoRepository.java` (nova query)
- Create: `B/lancamento/TotalTipo.java`, `B/saldo/SaldoService.java`, `B/saldo/SaldoController.java`, `B/saldo/dto/SaldoMes.java`
- Test: `T/saldo/SaldoServiceTest.java`, `T/saldo/SaldoControllerTest.java` (ambos `extends IntegracaoTest`, mesmo estilo de `T/resumo/ResumoServiceTest.java`)

**Interfaces:**
- Produces: `record TotalTipo(TipoCategoria tipo, BigDecimal total)` em `B/lancamento/`.
- Produces: `List<TotalTipo> LancamentoRepository.totaisPagosPorTipo(@Param("usuarioId") long usuarioId, @Param("de") int de, @Param("ate") int ate)`; JPQL no mesmo estilo de `totaisDoAno`, `l.status = dev.lmaciel.aprumo.lancamento.StatusLancamento.PAGO`, período por `(l.ano * 12 + l.mes - 1) between :de and :ate`, `group by c.tipo`. Considera todos os itens, inclusive cartão e arquivados.
- Produces: `record SaldoMes(boolean ativo, BigDecimal saldo, BigDecimal recebidoNoMes)` em `B/saldo/dto/`; com `ativo=false`, os dois valores são `0.00`.
- Produces: `SaldoService(LancamentoRepository lancamentos, @Value("${app.saldo.inicio}") String inicio)` com `@Transactional(readOnly = true) SaldoMes saldo(int ano, int mes, UsuarioLogado usuario)`; converte `inicio` com `YearMonth.parse` e usa `MesAno.indice()`.
- Produces: `GET /api/saldo?ano&mes` em `SaldoController` (`@RequestMapping("/api/saldo")`), mesma validação e `UsuarioLogado.de(jwt)` do `ResumoController`. Não precisa de matcher no `SecurityConfig`.

- [ ] **Step 1: Escrever `SaldoServiceTest`** (valores do spec; usuário `DONO`, receitas na categoria "Receitas", despesas em "Doméstica", cartão em "Cartões de crédito" com `update item set cartao = true`):
  - `antesDoInicioFicaInativo`: Salário PAGO `5000.00` em 2026-10 → `saldo(2026, 10)` = `ativo false`, `saldo 0.00`, `recebidoNoMes 0.00`.
  - `mesDeInicioSomaPagosEIgnoraPrevistos`: nov/2026 Salário PAGO `5500.00`, Cagece PAGO `177.56`, Financiamento PREVISTO `1690.00` → `ativo true`, `saldo 5322.44`, `recebidoNoMes 5500.00`.
  - `sobraAndaSoParaFrente`: além do cenário anterior, Salário PAGO `100.00` em dez/2026 → `saldo(2026, 12)` = `5422.44` com `recebidoNoMes 100.00`; `saldo(2026, 11)` continua `5322.44`.
  - `mesSemLancamentosMantemOAcumulado`: só o cenário de novembro → `saldo(2026, 12)` = `5322.44`, `recebidoNoMes 0.00`.
  - `faturaPagaSubtraiEPrevistaNao`: nov/2026 Salário PAGO `5500.00`, fatura American Express PAGO `3498.09`, fatura Inter PREVISTO `582.73` → `saldo 2001.91`.
  - `outroUsuarioNaoEntra`: lançamento pago de outro usuário em nov/2026 não altera o saldo do `DONO`.
  Comparar com `isEqualByComparingTo`.
- [ ] **Step 2: Escrever `SaldoControllerTest`**: `GET /api/saldo?ano=2026&mes=11` com cookie → 200, `$.ativo` `true`, `$.saldo` `"5500.00"`, `$.recebidoNoMes` `"5500.00"` (Salário PAGO `5500.00`); sem cookie → 401; `mes=13` → 400.
- [ ] **Step 3: Rodar e ver falhar:** `cd backend && mvn -q test -Dtest='Saldo*Test' 2>&1 | tail -20` (use `./mvnw` se existir) — Expected: erro de compilação / FAIL.
- [ ] **Step 4: Implementar** na ordem: propriedade no `application.yml`, `TotalTipo`, query no repositório, `SaldoMes`, `SaldoService` (saldo = RECEITA − DESPESA em `[inicio, mes]`; `recebidoNoMes` = RECEITA em `[mes, mes]`; `ativo = indice(mes) >= indice(inicio)`; ausência de tipo no resultado vale `0.00`), `SaldoController`.
- [ ] **Step 5: Rodar o mesmo comando** — Expected: PASS. Depois a suíte completa: `mvn -q test 2>&1 | tail -20` — Expected: sem falhas.
- [ ] **Step 6: Commit** `feat(saldo): endpoint do saldo do Itaú a partir dos lançamentos pagos`.

### Task 3: Faixa do saldo no Orçamento

**Files:**
- Modify: `F/api/tipos.ts` (`SaldoResponse`), `F/api/endpoints.ts` (`saldo`), `F/paginas/lancamentos/invalidar.ts`, `F/teste/servidor.ts`, `F/paginas/lancamentos/LancamentosPage.tsx`, `F/paginas/lancamentos/LancamentosPage.test.tsx`
- Create: `F/paginas/lancamentos/FaixaSaldo.tsx`, `F/paginas/lancamentos/FaixaSaldo.test.tsx`

**Interfaces:**
- Consumes: `GET /api/saldo?ano&mes` da Tarefa 2.
- Produces: `interface SaldoResponse { ativo: boolean; saldo: string; recebidoNoMes: string }` em `tipos.ts`; `endpoints.saldo: (ano: number, mes: number) => api<SaldoResponse>(`/api/saldo?${consulta(ano, mes)}`)` (chave de topo, como `resumo`).
- Produces: `FaixaSaldo(props: { ano: number; mes: number })` busca com `useQuery({ queryKey: ['saldo', ano, mes], queryFn: () => endpoints.saldo(ano, mes), placeholderData: keepPreviousData })`.

- [ ] **Step 1: Testes de `FaixaSaldo` (`FaixaSaldo.test.tsx`, MSW via `servidor.use`)**
  - `{ ativo: false, saldo: '0.00', recebidoNoMes: '0.00' }` → não renderiza nada (`queryByRole('region', { name: /saldo/i })` é `null`).
  - `{ ativo: true, saldo: '5322.44', recebidoNoMes: '5500.00' }` no mês corrente (relógio fixo em 2026-11-15 com `vi.setSystemTime`) → mostra "Dinheiro no Itaú hoje", `R$ 5.322,44`, "Recebido no mês" e `R$ 5.500,00`.
  - Mesmo retorno com `ano=2026, mes=12` → mostra "Saldo no Itaú ao fim de" seguido do nome do mês (usar o formatador de mês que já existe em `F/formato/mes.ts`) e não mostra "hoje".
  - Enquanto carrega, mostra um esqueleto com `role="status"` da mesma altura da faixa (sem salto de layout). Se a consulta falha, não mostra a faixa (a página continua usável).
- [ ] **Step 2: Rodar e ver falhar:** `cd frontend && npx vitest run src/paginas/lancamentos/FaixaSaldo.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implementar** tipos, endpoint e `FaixaSaldo.tsx`: `<section aria-label="Saldo no Itaú" className="...">` em degradê `--cor-principal` → `--cor-principal-fim`, texto `--cor-sobre-principal`, valores com classe `valor`, rótulo à esquerda e "Recebido no mês" à direita (empilha no celular). Mês corrente por `mesAtual()` de `F/formato/mes.ts`.
- [ ] **Step 4: Rodar** Step 2 — Expected: PASS.
- [ ] **Step 5: Teste de página**: `LancamentosPage` com handler de saldo ativo mostra a faixa acima dos cards; ao marcar Camila como Recebido (PATCH), o handler de `/api/saldo` é chamado de novo (invalidação de `['saldo']`) e o novo valor aparece.
- [ ] **Step 6: Implementar** em `invalidar.ts` a invalidação de `['saldo']` dentro de `invalidarLancamentos`; adicionar handler base de `GET /api/saldo` em `F/teste/servidor.ts` devolvendo `{ ativo: false, saldo: '0.00', recebidoNoMes: '0.00' }`; renderizar `<FaixaSaldo ano mes />` em `LancamentosPage.tsx` entre o cabeçalho e a grade.
- [ ] **Step 7: Rodar tudo:** `cd frontend && npx vitest run 2>&1 | tail -15 && npx tsc --noEmit && npm run build 2>&1 | tail -5` — Expected: tudo PASS, build limpo.
- [ ] **Step 8: Verificação visual** (agent-browser, API em modo demo + Vite): Orçamento em novembro de 2026 em 1440px e 375px, tema claro e escuro; conferir contraste, foco e que o card de receitas e a faixa batem com os mockups B aprovados.
- [ ] **Step 9: Commit** `feat(orcamento): faixa com o saldo do Itaú no topo`.

## Fechamento

`code-reviewer` uma vez no diff final da branch (mais `security-auditor`, porque há endpoint novo com entrada HTTP). Depois `superpowers:verification-before-completion` e `superpowers:finishing-a-development-branch`: push da branch e PR; merge só com autorização do dono.
