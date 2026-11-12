# Orquestração de modelos, design system e índice de agents: plano de implementação

> **Para agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa a tarefa. Os passos usam checkbox (`- [ ]`).

**Goal:** Fixar um modelo por papel nos agents, proteger os segredos do projeto por permissão, dar ao agent de front-end uma fonte de verdade visual (`docs/DESIGN_SYSTEM.md`) mais as skills certas, e acrescentar ao fluxo um gate visual para telas novas ou alteradas. Depois, transformar o conjunto de documentos em um kit universal (skill `/iniciar-projeto`) que o Lucas chama ao abrir qualquer projeto novo, não só o Aprumo.

**Architecture:** Três frentes independentes. (A) Configuração global em `~/.claude` (agents, `settings.json`, uma skill, `CLAUDE.md`), sem versionamento. (B) Documentação do projeto em `docs/` e `AGENTS.md`, gerada a partir do código real, em uma branch com PR. (C) Um teste de "deriva" que impede o `DESIGN_SYSTEM.md` de divergir do `index.css`.

**Tech Stack:** Markdown, JSON, frontmatter de agents do Claude Code, Python 3 (script da skill), Vitest 5 + TypeScript (teste de deriva), `agent-browser` (gate visual).

**Spec:** não há spec separado. As decisões vêm da conversa de 2026-11-12 e estão em "Global Constraints" abaixo.

## Global Constraints

- Nada de `npx claude-code-templates`. O aitmpl é só fonte de leitura: o que for aproveitado é copiado à mão, depois de lido por inteiro.
- Modelos: `sonnet` nos implementadores (`java-spring`, `frontend-developer`, `typescript-pro`, `python-pro`, `test-engineer`), no `code-reviewer`, no `backend-architect` e no `ui-ux-designer`; `opus` só no `security-auditor`. Tarefa difícil (migração, auth, cálculo de dinheiro) usa `Agent(model: "opus")` pontual, sem editar arquivo. `haiku` só por `Agent(model: "haiku")` pontual, para build/teste filtrado e busca.
- Hooks do aitmpl (`secret-scanner`, `dangerous-command-blocker`, `file-protection`, `env-file-protection`) ficam **fora**.
- Todo código de front-end (inclusive o teste da Tarefa 5) é escrito pelo agent `frontend-developer`, nunca por mim na sessão principal.
- Docs do repo em português do Brasil, sem emoji. Nunca ler nem imprimir `.local/segredos.env`.
- Commit e push só quando o Lucas pedir. `HANDOFF.md`, `.mcp.json` e `.local/` nunca entram em commit.
- Universalidade: o `~/.claude/CLAUDE.md`, os agents, o `deny` e a skill `/iniciar-projeto` valem para todo projeto. Os templates da skill não podem conter nada do Aprumo (nomes, cores, módulos, URLs). A skill nunca sobrescreve arquivo existente, nunca faz commit e nunca lê `.local/`.
- Branch das tarefas 5 a 7: `docs/design-system-e-indice-de-agents`, criada a partir da `main` atualizada.

## Review Focus

1. O `deny` de `Read(./.local/**)` não impede `Bash(cat .local/segredos.env)`. Comportamento esperado: a limitação fica registrada em `docs/SECURITY.md`, sem prometer cobertura que não existe.
2. O agent enxugado perde alguma regra de que o fluxo dependia (frontmatter inválido, `Skill` fora de `tools`). Esperado: um agent de teste responde que leu `docs/DESIGN_SYSTEM.md` e lista as duas skills.
3. Um token `--cor-*` novo no `index.css` sem entrada no documento. Esperado: o teste de deriva falha apontando o nome do token.
4. Um valor de cor no documento diferente do `index.css`. Esperado: o teste falha mostrando os dois valores.
5. Fatos inventados no `PRD.md`. Esperado: só entra o que está no `README.md`, no `HANDOFF.md` ou nos specs de `docs/superpowers/specs/`; o resto vira "a validar pelo Lucas".
6. Rodar `/iniciar-projeto` numa pasta que já tem `AGENTS.md` ou `docs/`. Esperado: nada é sobrescrito, a skill lista o que já existe e cria só o que falta.

---

## Fase A: configuração global (fora do repo, sem commit)

### Task 1: Modelo fixo em cada agent

**Files:**
- Modify: `~/.claude/agents/security-auditor.md`, `typescript-pro.md`, `python-pro.md`, `test-engineer.md`, `backend-architect.md`, `ui-ux-designer.md` (só o frontmatter)

**Interfaces:**
- Produces: todo agent da tabela de "Global Constraints" com `model:` explícito no frontmatter.

- [ ] **Step 1: Registrar o estado atual.** Run: `grep -H '^model:' ~/.claude/agents/*.md`. Expected: só `code-reviewer`, `frontend-developer` e `java-spring` com `model: sonnet`.
- [ ] **Step 2: Adicionar `model: opus` ao `security-auditor` e `model: sonnet` aos outros cinco.** Uma linha `model:` dentro do frontmatter, logo depois de `tools:`. Não alterar mais nada nos arquivos.
- [ ] **Step 3: Verificar.** Run: `grep -H '^model:' ~/.claude/agents/*.md`. Expected: 9 linhas, 8 `sonnet` e 1 `opus` (`security-auditor`).

### Task 2: Bloqueio de leitura de segredos por permissão

**Files:**
- Modify: `~/.claude/settings.json` (chave `permissions`)

**Interfaces:**
- Produces: `permissions.deny` com `Read(./.local/**)`, `Read(./.env)`, `Read(./.env.*)`, `Read(./.mcp.json)`, mantendo o `allow` existente.

- [ ] **Step 1: Adicionar `deny` ao objeto `permissions`**, sem tocar em `allow`, `env`, `model`, `statusLine`, `enabledPlugins` nem `deniedMcpServers`. Validar: `python3 -c "import json;json.load(open('/home/lmaciel0/.claude/settings.json'))"` sem erro.
- [ ] **Step 2: Provar o bloqueio com um arquivo inofensivo.** Criar `.local/teste-deny.txt` com a palavra `ok` (a pasta já é ignorada pelo git) e tentar `Read` nele numa sessão nova. Expected: negado pela permissão. Apagar o arquivo depois. Nunca testar com `segredos.env`.

### Task 3: Skill `ui-design-system` (cópia auditada)

**Files:**
- Create: `~/.claude/skills/ui-design-system/SKILL.md`
- Create: `~/.claude/skills/ui-design-system/scripts/design_token_generator.py`

**Interfaces:**
- Produces: skill `ui-design-system`, citável em `skills:` de agents.

Auditoria já feita em 2026-11-12: o script importa só `json`, `typing`, `colorsys` e `sys`, sem rede, `eval`, `exec` nem `subprocess`; o `SKILL.md` tem 1060 bytes. Origem: `davila7/claude-code-templates`, pasta `cli-tool/components/skills/creative-design/ui-design-system`.

- [ ] **Step 1: Baixar os dois arquivos** com `gh api repos/davila7/claude-code-templates/contents/<caminho> --jq .content | base64 -d` para as pastas acima.
- [ ] **Step 2: Reler o script antes de aceitar.** Run: `grep -nE 'subprocess|os\.system|eval\(|exec\(|requests|urllib|socket|http' ~/.claude/skills/ui-design-system/scripts/design_token_generator.py`. Expected: nenhuma linha.
- [ ] **Step 3: Rodar uma vez.** Run: `python3 -I ~/.claude/skills/ui-design-system/scripts/design_token_generator.py "#27187e" modern json | python3 -c "import json,sys;d=json.load(sys.stdin);print(sorted(d))"`. Expected: lista com `colors`, `typography`, `spacing`, `shadows`, `breakpoints`. Rodar também com cor inválida (`xyz`) e só anotar o comportamento (traceback ou mensagem); não corrigir o script.

### Task 4: Enxugar o agent `frontend-developer`

**Files:**
- Modify: `~/.claude/agents/frontend-developer.md` (reescrever; guardar cópia em `~/.claude/agents/frontend-developer.md.bak` até a Tarefa 8 passar)

**Interfaces:**
- Consumes: skill `ui-design-system` (Tarefa 3) e `docs/DESIGN_SYSTEM.md` (Tarefa 5).
- Produces: agent com frontmatter `model: sonnet`, `tools: Read, Write, Edit, Bash, Glob, Grep, Skill`, `skills: [ui-ux-pro-max, ui-design-system]`.

- [ ] **Step 1: Levantar a stack real.** Run: `cd frontend && grep -E '"(react|vite|tailwindcss|vitest|msw|@tanstack/react-query|react-router|lucide-react|recharts|typescript)"' package.json`. Usar só o que aparecer.
- [ ] **Step 2: Reescrever o arquivo em até ~70 linhas**, sem o protocolo de `context-manager`, sem Vue, Angular, Next.js, Storybook, pnpm, Zustand nem a meta de cobertura de 85%. Conteúdo obrigatório:
  1. stack real do Passo 1 e a convenção de nomes em português (`--cor-*`, `--raio-card`, pastas em `src/componentes` e `src/paginas`);
  2. antes de qualquer tela, ler `docs/DESIGN_SYSTEM.md`; tela nova, landing ou redesign ainda chama `anthropic-skills:design-taste-frontend` pela ferramenta `Skill`, e correção pequena não chama;
  3. regras de 360 px, contraste mínimo de 4,5:1 e alvo de toque de 44 px;
  4. TDD e os comandos de `frontend/`: `npm test -- --run`, `npm run lint`, `npm run build`;
  5. nenhuma dependência nova sem pedir ao Lucas;
  6. devolver resumo de até 15 linhas: arquivos alterados, resultado dos testes e pendências.
- [ ] **Step 3: Verificar o frontmatter.** Run: `sed -n '1,8p' ~/.claude/agents/frontend-developer.md`. Expected: as quatro chaves acima, com as duas skills.

---

## Fase B: documentação do projeto (branch `docs/design-system-e-indice-de-agents`)

### Task 5: `docs/DESIGN_SYSTEM.md` com teste de deriva

Executada pelo agent `frontend-developer`.

**Files:**
- Create: `docs/DESIGN_SYSTEM.md`
- Test: `frontend/src/designSystemDoc.test.ts`

**Interfaces:**
- Produces: `docs/DESIGN_SYSTEM.md` com as seções, nesta ordem: Identidade; Cores (uma tabela com **todos** os tokens `--cor-*` de `:root`, com o valor hexadecimal, o uso e a variante do tema escuro quando existir); Presets (`lima`, `esmeralda`, `indigo`); Tipografia (Inter Variable); Raio, superfícies e sombras; Espaçamento e primeira dobra no celular (resumo de `docs/superpowers/plans/2026-11-12-painel-espacamento-primeira-dobra.md`); Componentes existentes (os de `frontend/src/componentes` e os padrões recorrentes por módulo); Regras de 360 px; Acessibilidade; Referências visuais; O que NÃO fazer.

- [ ] **Step 1: Escrever o teste que falha**, `designSystemDoc.test.ts`, no mesmo estilo de `estilos.test.ts` (leitura direta com `readFileSync(resolve(process.cwd(), ...))`, `css: false` esvazia o `?raw`). Casos:
  - `documenta todo token --cor-* de :root`: para cada `--cor-nome: #hex;` do `:root` base, o nome aparece no documento; a mensagem de falha lista os tokens ausentes.
  - `usa o mesmo valor do index.css`: para cada token com valor hexadecimal, o documento contém o nome e o mesmo hex na mesma linha (comparar em minúsculas).
  - `tem as seções obrigatórias`: existem os 11 títulos `## ` listados em Interfaces.
- [ ] **Step 2: Rodar e ver falhar pelo motivo certo.** Run: `cd frontend && npm test -- --run src/designSystemDoc.test.ts`. Expected: FAIL por arquivo ausente (`ENOENT`), não por erro de sintaxe.
- [ ] **Step 3: Escrever `docs/DESIGN_SYSTEM.md` a partir do `index.css` e dos componentes reais.** Nenhuma cor inventada. A seção "Referências visuais" recebe as referências que o Lucas passar; se ele não passar nenhuma até aqui, o texto é "Nenhuma referência definida ainda. Perguntar ao Lucas antes de redesenhar uma tela." A seção "O que NÃO fazer" nasce das armadilhas já registradas no `HANDOFF.md` e das regras de 360 px, nada genérico.
- [ ] **Step 4: Rodar o teste, o lint e o build.** Run: `cd frontend && npm test -- --run && npm run lint && npm run build`. Expected: tudo verde.
- [ ] **Step 5: Commit.**

```bash
git add docs/DESIGN_SYSTEM.md frontend/src/designSystemDoc.test.ts
git commit -m "docs(front): design system extraído dos tokens reais, com teste de deriva"
```

### Task 6: `ARCHITECTURE.md`, `TESTING.md`, `SECURITY.md`, `PRD.md`

**Files:**
- Create: `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/SECURITY.md`, `docs/PRD.md`

**Interfaces:**
- Produces: quatro documentos de até ~90 linhas cada, só com fatos verificáveis no repo.

- [ ] **Step 1: `ARCHITECTURE.md`.** Fontes: `backend/pom.xml` (Java 21, Spring Boot, PostgreSQL), `frontend/package.json`, `render.yaml`, `vercel.json`, `android/`, `docs/superpowers/specs/`. Seções: visão geral (diagrama em texto: celular/PWA/TWA, front, API, banco), stack, estrutura de pastas, fluxo de dados e deploy.
- [ ] **Step 2: `TESTING.md`.** Fontes: `.github/workflows/ci.yml`, `HANDOFF.md`. Seções: comandos de backend (`./mvnw -q verify`) e de front (`npm test -- --run`, `npm run lint`, `npm run build`), regra de TDD, testes de contraste em `estilos.test.ts`, e o gate visual (receita do `agent-browser` do `HANDOFF.md`: sessão `prints`, `set viewport 360 640 3`, conta de revisor).
- [ ] **Step 3: `SECURITY.md`.** Fontes: `AuthService`, o relato de erros (`POST /api/diagnostico/erros`), `.gitignore`, `HANDOFF.md`. Seções: autenticação e sessão por inatividade, onde ficam os segredos (`.local/`, nunca comitar), o que o `deny` de `~/.claude/settings.json` cobre **e o que não cobre** (Review Focus 1), e o checklist de quando chamar o `security-auditor`.
- [ ] **Step 4: `PRD.md`.** Fontes: `README.md`, `HANDOFF.md` seção 1, `docs/superpowers/specs/`. Seções: visão, problema, público, módulos atuais, métricas. Todo ponto sem fonte no repo recebe a marca "a validar pelo Lucas" (Review Focus 5).
- [ ] **Step 5: Verificar.** Run: `wc -l docs/ARCHITECTURE.md docs/TESTING.md docs/SECURITY.md docs/PRD.md` e `grep -c 'a validar' docs/PRD.md`. Expected: cada arquivo com no máximo ~90 linhas; o `PRD.md` com pelo menos uma marca ou uma nota dizendo que não houve ponto sem fonte.
- [ ] **Step 6: Commit.**

```bash
git add docs/ARCHITECTURE.md docs/TESTING.md docs/SECURITY.md docs/PRD.md
git commit -m "docs: arquitetura, testes, segurança e PRD a partir do código real"
```

### Task 7: `AGENTS.md` como índice

**Files:**
- Modify: `AGENTS.md` (hoje com 3 linhas)

**Interfaces:**
- Consumes: os cinco documentos de `docs/`.
- Produces: `AGENTS.md` de até ~30 linhas: mantém as duas regras atuais (ler o `HANDOFF.md` primeiro; responder em português do Brasil e não ler nem imprimir `.local/segredos.env`) e acrescenta a tabela "se for mexer em X, leia Y".

- [ ] **Step 1: Escrever a tabela.** Linhas: tela ou estilo → `docs/DESIGN_SYSTEM.md`; estrutura, API ou deploy → `docs/ARCHITECTURE.md`; testes ou CI → `docs/TESTING.md`; auth, dados sensíveis ou entrada externa → `docs/SECURITY.md`; escopo de produto → `docs/PRD.md`.
- [ ] **Step 2: Verificar que o `GEMINI.md` continua coerente.** Run: `cat GEMINI.md`. Expected: ele aponta para o `AGENTS.md` ou para o `HANDOFF.md` sem contradizer a tabela; se contradisser, ajustar a menor linha possível.
- [ ] **Step 3: Revisão final do diff da branch** pelo agent `code-reviewer`, uma vez (`git diff main...HEAD`), e rodar `npm test -- --run`, `npm run lint`, `npm run build` em `frontend/` mostrando a saída real.
- [ ] **Step 4: Commit.**

```bash
git add AGENTS.md
git commit -m "docs: AGENTS.md vira índice de documentos por tipo de mudança"
```

---

## Fase C: fluxo

### Task 8: Gate visual e tabela de modelos no `~/.claude/CLAUDE.md`

**Files:**
- Modify: `~/.claude/CLAUDE.md`

**Interfaces:**
- Consumes: Tarefas 1, 4 e 5.
- Produces: o `CLAUDE.md` com (a) uma tabela curta de modelos por papel, (b) o gate visual dentro da etapa 3 para mudança de tela, (c) a regra de ler o documento certo por tipo de mudança, (d) as menções a `Haiku` pontual.

- [ ] **Step 1: Acrescentar o gate visual** à etapa 3, só para mudança que toque tela: depois do `frontend-developer`, rodar o `agent-browser` (sessão `prints`, viewports 360, 768 e 1280, tema claro e escuro, receita em `docs/TESTING.md`) e passar os prints ao agent `ui-ux-designer`, que compara com `docs/DESIGN_SYSTEM.md` e devolve uma lista de falhas; o `frontend-developer` corrige antes do `code-reviewer`. Correção trivial de CSS (até 1 arquivo, sem tela nova) fica isenta.
- [ ] **Step 2: Acrescentar a tabela de modelos** (as linhas de "Global Constraints") e a frase de que Opus pontual vale para tarefa difícil e Haiku pontual para build/teste e busca.
- [ ] **Step 3: Acrescentar a regra de leitura** por tipo de mudança, remetendo à tabela do `AGENTS.md` em vez de repeti-la. Acrescentar também: "projeto sem `AGENTS.md` ou sem `docs/` do kit: sugerir `/iniciar-projeto` antes de qualquer feature; o gate visual só roda se `docs/DESIGN_SYSTEM.md` existir".
- [ ] **Step 4: Teste de fumaça do agent.** Disparar o `frontend-developer` com a instrução "não escreva código; diga quais skills tem e qual documento leria antes de uma tela nova". Expected: cita `ui-ux-pro-max`, `ui-design-system` e `docs/DESIGN_SYSTEM.md` (Review Focus 2). Só então apagar `frontend-developer.md.bak`.
- [ ] **Step 5: Verificar o tamanho.** Run: `wc -l ~/.claude/CLAUDE.md`. Expected: crescimento de no máximo ~25 linhas sobre o atual.

---

## Fase D: kit universal

### Task 9: Skill `/iniciar-projeto`

Executada depois das Tarefas 5 a 7, porque os templates nascem dos documentos reais do Aprumo, com tudo que é específico removido. Ao criar a skill, seguir `superpowers:writing-skills`.

**Files:**
- Create: `~/.claude/skills/iniciar-projeto/SKILL.md`
- Create: `~/.claude/skills/iniciar-projeto/templates/AGENTS.md`, `PRD.md`, `ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `TESTING.md`, `SECURITY.md`
- Create: `~/.claude/skills/iniciar-projeto/templates/designSystemDoc.test.ts` (só para projeto web com tokens CSS)

**Interfaces:**
- Consumes: os documentos das Tarefas 5 a 7 como modelo de estrutura, e a tabela de `AGENTS.md` da Tarefa 7.
- Produces: skill invocável por `/iniciar-projeto`, que no projeto atual:
  1. detecta a stack (`pom.xml`, `package.json`, `pyproject.toml`) e lê `README.md` se houver; pasta vazia: faz no máximo 4 perguntas (nome, o que é, stack, público);
  2. cria só o que não existe: `AGENTS.md` (índice + as duas regras de sempre), `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/SECURITY.md`, `docs/superpowers/specs/` e `docs/superpowers/plans/`; projeto com front-end também ganha `docs/DESIGN_SYSTEM.md`;
  3. preenche cada documento com fatos achados no código e marca o resto como "a validar pelo Lucas";
  4. garante `.local/` e `.mcp.json` no `.gitignore`;
  5. para front-end, pergunta ao Lucas as referências visuais (apps e uma frase sobre o que ele gosta em cada um) e, se houver tokens CSS, oferece o teste de deriva;
  6. no fim, lista o que criou e o que já existia, sem fazer commit.

- [ ] **Step 1: Escrever o `SKILL.md`** com frontmatter `name: iniciar-projeto` e `description` que diga quando disparar ("abrir projeto novo, projeto sem AGENTS.md ou docs/, 'iniciar projeto'") e o corpo com os 6 itens acima como passos numerados.
- [ ] **Step 2: Extrair os templates.** Para cada documento do Aprumo, copiar a estrutura de seções e trocar todo conteúdo específico por instrução curta entre colchetes ("[liste as cores do projeto]"). Verificar: `grep -rniE 'aprumo|contas-claras|27187e|useaprumo|render|vercel' ~/.claude/skills/iniciar-projeto/templates`. Expected: nenhuma linha.
- [ ] **Step 3: Teste em pasta vazia.** Criar uma pasta nova no scratchpad, rodar `/iniciar-projeto` numa sessão lá e conferir que `AGENTS.md` e os cinco documentos de `docs/` existem, sem texto do Aprumo. Expected: arquivos criados e `git status` sem commit feito pela skill.
- [ ] **Step 4: Teste de idempotência (Review Focus 6).** Rodar de novo na mesma pasta. Expected: nenhum arquivo muda (`git diff --stat` vazio ou checksum igual) e a skill lista o que já existia.
- [ ] **Step 5: Teste no próprio Aprumo.** Rodar `/iniciar-projeto` no repo. Expected: relata tudo como já existente e não altera nada.

---

## Ordem e dependências

As Fases A, C e D não tocam o repo do Aprumo, exceto a Tarefa 9 (Passo 5), que só lê. Ordem: Tarefas 1, 2 e 3 em qualquer ordem; Tarefa 5 antes da 4 só no Passo 4 da Tarefa 8; Tarefas 5, 6 e 7 em sequência na mesma branch; Tarefa 8; Tarefa 9 por último.
