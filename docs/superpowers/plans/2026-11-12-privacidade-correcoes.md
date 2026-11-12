# Correções da Política de Privacidade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Neste projeto todo código de front-end é escrito pelo agent `frontend-developer` (regra do CLAUDE.md global).

**Goal:** Alinhar a Política de Privacidade ao que o app realmente faz e parar de enviar o IP do usuário ao Unsplash nos cards de Metas.

**Architecture:** Duas frentes independentes, só no front-end. A (texto): três acréscimos na página `/privacidade` e nova data de vigência. B (fotos): as 5 fotos dos presets de Metas passam de URL do Unsplash para arquivos em `frontend/public/metas/`, servidos pelo próprio Aprumo. A CSP não muda.

**Tech Stack:** React, TypeScript, Vitest + Testing Library, Vite (`public/` servido na raiz).

**Spec:** sem documento de design (mudança pequena). Origem: auditoria de cookies/privacidade desta sessão (2026-11-12), decisões do dono: hospedar as 5 fotos localmente; manter o campo de foto por URL livre; citar na política que o site da foto recebe o IP.

## Global Constraints

- Branch nova a partir de `main`: `fix/privacidade-lacunas`. Commit e push só quando o dono pedir.
- Texto em português do Brasil, com acentos. Sem travessão no texto de produto.
- Não mexer em `vercel.json`: a CSP `img-src 'self' data: https:` já cobre `/metas/*.jpg` e precisa continuar aceitando `https:` por causa do campo de foto por URL livre.
- A página de privacidade mantém exatamente 10 seções `h2`, na mesma ordem (o teste `tem_um_h2_para_cada_secao_na_ordem` já exige isso).
- A frase "Não usamos cookies de rastreamento, de análise de uso nem de publicidade." e o cookie `cc_session` continuam como estão.
- `VIGENCIA` em `frontend/src/legal/responsavel.ts` é uma constante só, usada também pelos Termos. Atualizar para `12/11/2026` muda a data exibida nos dois documentos. Escolha tomada para manter uma fonte única.
- Fotos: JPEG, 800 px de largura, nome igual ao id do preset. Licença Unsplash permite hospedar; registrar a origem em `frontend/public/metas/CREDITOS.txt`.

## Review Focus

- Preset com `fotoPadrao` apontando para arquivo que não existe em `public/` (card sem foto, sem erro visível). Teste de existência dos arquivos na Task 2.
- Qualquer `fotoPadrao` que volte a ser `http(s)://` no futuro (regressão da privacidade). Teste na Task 2.
- Texto novo que contradiz o existente ("não usamos cookies" vs "o Google pode gravar cookies"). Teste na Task 1 confere que a frase de ressalva ficou na seção 5.
- Preset `personalizado` com `fotoPadrao: ''` continua sem `<img>`. Já coberto pelo código (`fotoExibicao &&`); o teste da Task 2 aceita `''`.
- Campo `fotoUrl` livre continua aceitando URL externa: por isso a política precisa da frase de IP. Teste na Task 1.

## Ressalva fora do escopo (decidir depois)

Ao ler o código para este plano apareceu uma divergência de contrato em Metas: o front envia/lê `titulo`, `prazo`, `fotoUrl`, `corGradienteInicio/Fim`, e o backend (`MetaRequest`/`MetaResponse`) usa `nome`, `mesAlvo`/`anoAlvo`, `imagemUrl`, `corGradiente`. Se isso for real, criar/editar meta falha e a foto por URL nunca é salva. Não é corrigido aqui. Antes de executar a Task 2, o implementador confirma se `/metas` abre com dados reais; se não abrir, o gate visual da Task 2 usa a tela com dados mockados nos testes e registra a limitação no resumo.

---

### Task 1: Texto da política e vigência

**Files:**
- Modify: `frontend/src/legal/PrivacidadePage.tsx` (seção 4, por volta da linha 94-98; seção 5, linhas 101-116)
- Modify: `frontend/src/legal/responsavel.ts` (constante `VIGENCIA`)
- Test: `frontend/src/legal/PrivacidadePage.test.tsx`

**Interfaces:**
- Consumes: `PaginaLegal`, `LinkLegal` (inalterados); `VIGENCIA: string` de `./responsavel`.
- Produces: nada que outra task use.

- [ ] **Step 1: Escrever os testes que falham** em `PrivacidadePage.test.tsx`, dentro do `describe` existente, usando `container.textContent` normalizado com `.replace(/\s+/g, ' ')` como no teste do relato de erros:

```tsx
it('avisa_que_o_google_pode_gravar_cookies_proprios_no_login', ...)
// texto contém 'accounts.google.com' e 'cookies próprios'
// e esse trecho está dentro da seção 'Cookies e armazenamento local':
// screen.getByRole('heading', { name: /Cookies e armazenamento local/ }).closest('section')?.textContent

it('lista_sessionStorage_e_cache_offline_na_secao_de_cookies', ...)
// mesma seção contém 'aprumo:recarga-por-chunk' e 'página de aviso offline'

it('avisa_que_o_site_da_foto_da_meta_recebe_o_ip', ...)
// seção 'Com quem compartilhamos' contém 'endereço de uma foto' e 'recebe o seu IP'

it('nao_cita_o_unsplash_porque_as_fotos_dos_presets_sao_nossas', ...)
// container.textContent não contém 'Unsplash'
```

Também ajustar o teste `tem_o_titulo_e_a_vigencia` apenas se ele falhar (ele já usa a constante `VIGENCIA`).

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && npx vitest run src/legal/PrivacidadePage.test.tsx`
Expected: os 3 primeiros testes novos FAIL (texto ausente); o do Unsplash PASS.

- [ ] **Step 3: Implementar o texto em `PrivacidadePage.tsx`**

Seção 5: acrescentar 3 itens `<li>` à lista existente, depois do item do `localStorage`, com este texto exato:
- `<strong>Login com Google:</strong> na tela de entrada, o Aprumo carrega um script do Google (accounts.google.com). O Google pode gravar cookies próprios no seu navegador, sob a política dele, e o Aprumo não controla esses cookies.`
- `<strong>Armazenamento da sessão (sessionStorage):</strong> uma marca temporária (aprumo:recarga-por-chunk) que evita recarregar a página em loop depois de uma atualização do app. Some quando você fecha a aba.`
- `<strong>Cache do modo offline:</strong> o navegador guarda a página de aviso offline e o ícone do app. Não contém dado pessoal.`

Antes de fechar o texto do `sessionStorage`, ler `frontend/src/recarregarNoErroDeChunk.ts` e ajustar a frase se o comportamento real for diferente.

Seção 4: novo `<p>` depois do parágrafo "Como alguns desses prestadores...": `Se você informar o endereço de uma foto ao criar uma meta, o site que hospeda essa foto recebe o seu IP quando ela é carregada. Esse site não é um prestador do Aprumo.`

- [ ] **Step 4: Atualizar `VIGENCIA` para `'12/11/2026'`** em `frontend/src/legal/responsavel.ts`.

- [ ] **Step 5: Rodar e ver passar**

Run: `cd frontend && npx vitest run src/legal`
Expected: PASS em `PrivacidadePage`, `TermosPage` e `ExclusaoDeContaPage`.

---

### Task 2: Fotos dos presets de Metas hospedadas no Aprumo

**Files:**
- Create: `frontend/public/metas/reserva.jpg`, `viagem.jpg`, `carro.jpg`, `casa.jpg`, `estudos.jpg`
- Create: `frontend/public/metas/CREDITOS.txt`
- Modify: `frontend/src/paginas/metas/presetsVisuais.ts` (campo `fotoPadrao` dos 5 presets com foto)
- Test: `frontend/src/paginas/metas/presetsVisuais.test.ts` (novo)

**Interfaces:**
- Consumes: `PRESETS_VISUAIS: Record<IdPresetVisual, PresetVisualMeta>` e `LISTA_PRESETS` de `presetsVisuais.ts`.
- Produces: `fotoPadrao` passa a ser `''` ou `'/metas/<id>.jpg'`. `CardMeta.tsx` já usa `meta.fotoUrl || preset.fotoPadrao` e não muda.

- [ ] **Step 1: Escrever o teste que falha** em `presetsVisuais.test.ts` (ambiente node do Vitest permite `node:fs`):

```ts
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PRESETS_VISUAIS } from './presetsVisuais'

describe('presetsVisuais', () => {
  it('nenhuma_fotoPadrao_aponta_para_site_externo', () => {
    for (const preset of Object.values(PRESETS_VISUAIS)) {
      expect(preset.fotoPadrao).not.toMatch(/^https?:\/\//)
    }
  })

  it('toda_fotoPadrao_preenchida_existe_em_public', () => {
    for (const preset of Object.values(PRESETS_VISUAIS)) {
      if (preset.fotoPadrao === '') continue
      expect(preset.fotoPadrao).toBe(`/metas/${preset.id}.jpg`)
      expect(existsSync(join(process.cwd(), 'public', preset.fotoPadrao))).toBe(true)
    }
  })

  it('so_o_preset_personalizado_fica_sem_foto', () => {
    const semFoto = Object.values(PRESETS_VISUAIS).filter((p) => p.fotoPadrao === '').map((p) => p.id)
    expect(semFoto).toEqual(['personalizado'])
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && npx vitest run src/paginas/metas/presetsVisuais.test.ts`
Expected: FAIL nos dois primeiros testes (URLs ainda do Unsplash).

- [ ] **Step 3: Baixar as 5 fotos** com `curl -L` a partir das URLs atuais de `presetsVisuais.ts` (mesmos parâmetros `w=800&q=80`, `fm=jpg`), um arquivo por preset, em `frontend/public/metas/<id>.jpg`. Arquivo baixado é dado não confiável: conferir com `file frontend/public/metas/*.jpg` (esperado `JPEG image data`) e tamanho com `ls -l` (esperado abaixo de 300 KB cada; se passar, refazer com `q=70`). Se algum download falhar, parar e avisar em vez de inventar a imagem.

- [ ] **Step 4: Escrever `frontend/public/metas/CREDITOS.txt`** com uma linha por arquivo: nome do arquivo, ID da foto do Unsplash (trecho `photo-...` da URL original) e a frase "Fonte: Unsplash, licença Unsplash (uso livre, atribuição não obrigatória)".

- [ ] **Step 5: Trocar `fotoPadrao` em `presetsVisuais.ts`** dos presets `reserva`, `viagem`, `carro`, `casa` e `estudos` para `'/metas/<id>.jpg'`. `personalizado` continua `''`.

- [ ] **Step 6: Rodar e ver passar, mais regressão de Metas**

Run: `cd frontend && npx vitest run src/paginas/metas`
Expected: PASS em todos os arquivos de Metas (incluindo o novo).

- [ ] **Step 7: Confirmar que nada mais cita o Unsplash**

Run: `grep -rIn "unsplash" frontend/src frontend/public frontend/index.html vercel.json`
Expected: só aparece em `frontend/public/metas/CREDITOS.txt`.

---

### Task 3: Verificação final

- [ ] **Step 1: Suíte completa, lint e build do front-end**

Run: `cd frontend && npx vitest run` e depois `npx oxlint` e `npm run build`
Expected: todos os testes PASS, lint sem erro, build conclui. Mostrar só o resumo e as falhas.

- [ ] **Step 2: Gate visual** (mudança toca tela, `docs/DESIGN_SYSTEM.md` existe): `agent-browser`, sessão `prints`, viewports 360, 768 e 1280, tema claro e escuro, tela `/metas` e `/privacidade`; receita em `docs/TESTING.md`. Passar os prints ao agent `ui-ux-designer`. Conferir que as 5 fotos aparecem nos cards (ou registrar a limitação descrita na Ressalva) e que a seção 5 da política continua legível em 360 px. No DevTools/Network, confirmar que não há request para `images.unsplash.com`.

- [ ] **Step 3: Revisão**: agent `code-reviewer` uma vez no diff final da branch. `security-auditor` não é necessário (sem autenticação, dados sensíveis ou entrada nova).

- [ ] **Step 4: Fechamento**: `superpowers:verification-before-completion`, depois `superpowers:finishing-a-development-branch`; rodar `rtk gain` e informar a economia.
