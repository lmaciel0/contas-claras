# Aprumo: Modo Escuro Obsidian, Dock Flutuante e Central de Preferências Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernizar a experiência visual do Aprumo substituindo o modo escuro roxo por uma paleta neutra *obsidian/slate* com acentos azuis, adicionando uma Central de Preferências acessível com persistência e transformando o menu lateral em uma Dock flutuante retrátil.

**Architecture:** A aplicação utilizará um contexto central reativo `PreferenciasContext` que persiste as escolhas do usuário em `localStorage` e reflete imediatamente no DOM via atributos `data-tema` e `data-preset` no `<html>`. O shell principal (`AppShell`) e o cabeçalho (`HeaderPrincipal`) serão adaptados para responder às preferências de layout (`centralizado` vs `largura-total`, barra fixa vs rolante) e acomodar a nova `DockLateral` flutuante com transição suave entre estado expandido (`w-60`) e compacto (`w-18`).

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Lucide/Inline SVG Icons, Vitest, Testing Library, HTML5 WAI-ARIA Dialog/Tooltip standards.

**Spec:** [docs/superpowers/specs/2026-11-02-aprumo-tema-dock-preferencias-design.md](file:///home/lmaciel0/Área%20de%20trabalho/repositorios/contas-claras/docs/superpowers/specs/2026-11-02-aprumo-tema-dock-preferencias-design.md)

## Global Constraints

- Modo escuro base deve ser neutro profundo (`--cor-fundo: #0b0d13`, `--cor-card: #131622`, `--cor-linha: #202538`, `--cor-texto: #f1f3f9`).
- Cor de destaque principal no modo escuro padrão deve manter o azul moderno (`--cor-principal: #3b82f6`).
- Todos os pares de texto e fundo no tema escuro devem cumprir contraste WCAG AA (>= 4,5:1 para texto normal e >= 3:1 para controles).
- Suporte a 4 presets de destaque: `azul` (padrão), `lima`, `esmeralda` e `indigo`.
- O modal de Preferências deve ser acessível com `role="dialog"`, `aria-modal="true"`, foco preso e suporte à tecla `Escape`.
- Zero regressão nos 561 testes de frontend existentes.

## Review Focus

1. **JSON corrompido em `localStorage`**: Se o valor em `aprumo-preferencias` for um JSON inválido ou vazio, o sistema deve restaurar silenciosamente os valores padrão sem lançar exceção (testado em `preferenciasStorage.test.ts`).
2. **Mudança dinâmica de tema do sistema operacional**: Quando o usuário seleciona o modo `'sistema'`, a aplicação deve escutar `matchMedia('(prefers-color-scheme: dark)')` e alternar `data-tema` em tempo real sem recarregar a página (testado em `usePreferencias.test.tsx`).
3. **Foco e acessibilidade dos tooltips na Dock compacta**: Quando recolhida, os botões com ícones devem expor acessivelmente o rótulo via `aria-label` e tooltip visível para leitores de tela e navegação por teclado (testado em `DockLateral.test.tsx`).
4. **Comportamento em dispositivos móveis (< 1280px)**: O menu gaveta mobile sempre abre na versão completa e legível, mesmo que a dock desktop tenha sido salva como recolhida (testado em `AppShell.test.tsx`).
5. **Restauração do foco ao fechar o modal**: Ao fechar o modal de preferências por `Escape` ou clique fora, o foco do teclado deve retornar ao elemento que o abriu (testado em `PreferenciasModal.test.tsx`).

---

### Task 1: Tokens do Tema Escuro Obsidian e Presets no CSS

**Files:**
- Modify: `frontend/src/index.css:56-92`
- Modify: `frontend/src/tema/tema.ts:28`
- Test: `frontend/src/estilos.test.ts`

**Interfaces:**
- Produces: Variáveis CSS do `:root[data-tema='escuro']` com base neutra `#0b0d13` e destaque `#3b82f6`; regras `html[data-preset='...']` para os presets `azul`, `lima`, `esmeralda`, `indigo`.
- Consumes: Nenhuma dependência externa.

- [ ] **Step 1: Atualizar testes de estilos e contraste para a nova paleta**

Em `frontend/src/estilos.test.ts`, atualizar as asserções de cor do tema escuro para verificar a cor de fundo `#0b0d13` (em vez de `#0f0b2b`), card `#131622` e contraste dos textos e chips:

```ts
it('tema escuro usa fundo neutro obsidian e card acetinado', () => {
  const css = readFileSync('frontend/src/index.css', 'utf-8')
  expect(css).toMatch(/--cor-fundo:\s*#0b0d13/)
  expect(css).toMatch(/--cor-card:\s*#131622/)
  expect(css).toMatch(/--cor-principal:\s*#3b82f6/)
})
```

- [ ] **Step 2: Executar teste para verificar falha**

Run: `npm --prefix frontend test frontend/src/estilos.test.ts`
Expected: FAIL indicando que `#0b0d13` e `#3b82f6` ainda não estão em `index.css`.

- [ ] **Step 3: Implementar novos tokens em `index.css` e atualizar `COR_BARRA` em `tema.ts`**

Substituir o bloco `:root[data-tema='escuro']` em `frontend/src/index.css`:
```css
:root[data-tema='escuro'] {
  --cor-fundo: #0b0d13;
  --cor-card: #131622;
  --cor-linha: #202538;
  --cor-texto: #f1f3f9;
  --cor-mutado: #8e95b0;
  --cor-principal: #3b82f6;
  --cor-principal-clara: #1d4ed8;
  --cor-principal-fim: #2563eb;
  --cor-positivo: #34d399;
  --cor-positivo-texto: #6ee7b7;
  --cor-negativo: #f87171;
  --cor-negativo-texto: #fca5a5;
  --cor-erro-fundo: #2a151b;
  --cor-ok-fundo: #0f291e;
  --cor-aviso-fundo: #2b230d;
  --cor-aviso-texto: #fde047;
  --cor-sobre-principal: #ffffff;
  --cor-sobre-principal-suave: #bfdbfe;
  --cor-sobre-negativo: #ffffff;
  --cor-auth-borda: #202538;
  --cor-auth-fundo-fim: #0f121a;
  --cor-auth-campo-borda: #3b82f6;
  --cor-grafico-receitas: #3b82f6;
  --cor-grafico-despesas: #60a5fa;
  --cor-grafico-receitas-previstas: #2563eb;
  --cor-grafico-despesas-previstas: #1e3a8a;
  --cor-nota-vermelho: #ff8a8a;
  --cor-nota-laranja: #fb9a4b;
  --cor-nota-amarelo: #f2c94c;
  --cor-nota-verde: #5fd68f;
  --cor-nota-azul: #60a5fa;
  --cor-nota-roxo: #a78bfa;
  --cor-nota-rosa: #f472b6;
  --cor-nota-cinza: #9ca3af;
}

/* Presets de cor de destaque */
html[data-preset='lima'] {
  --cor-principal: #84cc16;
  --cor-principal-clara: #4d7c0f;
  --cor-principal-fim: #65a30d;
}
html[data-tema='escuro'][data-preset='lima'] {
  --cor-principal: #a3e635;
  --cor-principal-clara: #4d7c0f;
  --cor-principal-fim: #84cc16;
  --cor-sobre-principal: #0b0d13;
}

html[data-preset='esmeralda'] {
  --cor-principal: #059669;
  --cor-principal-clara: #047857;
  --cor-principal-fim: #10b981;
}
html[data-tema='escuro'][data-preset='esmeralda'] {
  --cor-principal: #10b981;
  --cor-principal-clara: #047857;
  --cor-principal-fim: #34d399;
}

html[data-preset='indigo'] {
  --cor-principal: #4f46e5;
  --cor-principal-clara: #3730a3;
  --cor-principal-fim: #6366f1;
}
html[data-tema='escuro'][data-preset='indigo'] {
  --cor-principal: #6366f1;
  --cor-principal-clara: #3730a3;
  --cor-principal-fim: #818cf8;
}
```

E em `frontend/src/tema/tema.ts`:
```ts
export const COR_BARRA: Record<Tema, string> = { claro: '#27187E', escuro: '#0b0d13' }
```

- [ ] **Step 4: Executar testes de estilo para validar conformidade**

Run: `npm --prefix frontend test frontend/src/estilos.test.ts`
Expected: PASS com todas as asserções de contraste WCAG AA aprovadas.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/index.css frontend/src/tema/tema.ts frontend/src/estilos.test.ts
git commit -m "feat(tema): reformular tema escuro obsidian e adicionar presets de cor"
```

---

### Task 2: Armazenamento e Tipos de Preferências (`preferenciasStorage`)

**Files:**
- Create: `frontend/src/preferencias/preferenciasTipos.ts`
- Create: `frontend/src/preferencias/preferenciasStorage.ts`
- Create: `frontend/src/preferencias/preferenciasStorage.test.ts`

**Interfaces:**
- Produces:
  - `type ModoTema = 'claro' | 'escuro' | 'sistema'`
  - `type PresetCor = 'azul' | 'lima' | 'esmeralda' | 'indigo'`
  - `type LayoutLargura = 'centralizado' | 'largura-total'`
  - `interface PreferenciasUsuario { modoTema: ModoTema; presetCor: PresetCor; layoutLargura: LayoutLargura; barraFixa: boolean; dockRecolhida: boolean }`
  - `PREFERENCIAS_PADRAO: PreferenciasUsuario`
  - `CHAVE_PREFERENCIAS: string`
  - `lerPreferenciasSalvas(): PreferenciasUsuario`
  - `gravarPreferencias(prefs: PreferenciasUsuario): void`

- [ ] **Step 1: Escrever teste de unidade para `preferenciasStorage`**

Em `frontend/src/preferencias/preferenciasStorage.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  lerPreferenciasSalvas,
  gravarPreferencias,
  PREFERENCIAS_PADRAO,
  CHAVE_PREFERENCIAS,
} from './preferenciasStorage'

describe('preferenciasStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('retorna os valores padrão quando nada foi gravado', () => {
    expect(lerPreferenciasSalvas()).toEqual(PREFERENCIAS_PADRAO)
  })

  it('grava e recupera as preferências salvas corretamente', () => {
    const custom = {
      modoTema: 'escuro' as const,
      presetCor: 'lima' as const,
      layoutLargura: 'largura-total' as const,
      barraFixa: false,
      dockRecolhida: true,
    }
    gravarPreferencias(custom)
    expect(lerPreferenciasSalvas()).toEqual(custom)
  })

  it('recupera valores padrão quando o JSON armazenado é inválido', () => {
    localStorage.setItem(CHAVE_PREFERENCIAS, '{ jsonInvalido ...')
    expect(lerPreferenciasSalvas()).toEqual(PREFERENCIAS_PADRAO)
  })

  it('migra tema antigo salvo em aprumo-tema se não houver preferências', () => {
    localStorage.setItem('aprumo-tema', 'escuro')
    const lido = lerPreferenciasSalvas()
    expect(lido.modoTema).toBe('escuro')
    expect(lido.presetCor).toBe('azul')
  })
})
```

- [ ] **Step 2: Executar teste para verificar falha**

Run: `npm --prefix frontend test frontend/src/preferencias/preferenciasStorage.test.ts`
Expected: FAIL ("Cannot find module './preferenciasStorage'").

- [ ] **Step 3: Criar arquivos de tipos e implementação do storage**

Criar `frontend/src/preferencias/preferenciasTipos.ts`:
```ts
export type ModoTema = 'claro' | 'escuro' | 'sistema'
export type PresetCor = 'azul' | 'lima' | 'esmeralda' | 'indigo'
export type LayoutLargura = 'centralizado' | 'largura-total'

export interface PreferenciasUsuario {
  modoTema: ModoTema
  presetCor: PresetCor
  layoutLargura: LayoutLargura
  barraFixa: boolean
  dockRecolhida: boolean
}
```

Criar `frontend/src/preferencias/preferenciasStorage.ts`:
```ts
import type { PreferenciasUsuario } from './preferenciasTipos'

export const CHAVE_PREFERENCIAS = 'aprumo-preferencias'

export const PREFERENCIAS_PADRAO: PreferenciasUsuario = {
  modoTema: 'sistema',
  presetCor: 'azul',
  layoutLargura: 'centralizado',
  barraFixa: true,
  dockRecolhida: false,
}

export function lerPreferenciasSalvas(): PreferenciasUsuario {
  try {
    const salvo = localStorage.getItem(CHAVE_PREFERENCIAS)
    if (salvo) {
      const parsed = JSON.parse(salvo)
      return {
        modoTema: ['claro', 'escuro', 'sistema'].includes(parsed.modoTema)
          ? parsed.modoTema
          : PREFERENCIAS_PADRAO.modoTema,
        presetCor: ['azul', 'lima', 'esmeralda', 'indigo'].includes(parsed.presetCor)
          ? parsed.presetCor
          : PREFERENCIAS_PADRAO.presetCor,
        layoutLargura: ['centralizado', 'largura-total'].includes(parsed.layoutLargura)
          ? parsed.layoutLargura
          : PREFERENCIAS_PADRAO.layoutLargura,
        barraFixa: typeof parsed.barraFixa === 'boolean' ? parsed.barraFixa : PREFERENCIAS_PADRAO.barraFixa,
        dockRecolhida: typeof parsed.dockRecolhida === 'boolean' ? parsed.dockRecolhida : PREFERENCIAS_PADRAO.dockRecolhida,
      }
    }

    const temaAntigo = localStorage.getItem('aprumo-tema')
    if (temaAntigo === 'claro' || temaAntigo === 'escuro') {
      return { ...PREFERENCIAS_PADRAO, modoTema: temaAntigo }
    }

    return PREFERENCIAS_PADRAO
  } catch {
    return PREFERENCIAS_PADRAO
  }
}

export function gravarPreferencias(prefs: PreferenciasUsuario): void {
  try {
    localStorage.setItem(CHAVE_PREFERENCIAS, JSON.stringify(prefs))
  } catch {
    // modo privativo ou cota esgotada
  }
}
```

- [ ] **Step 4: Executar testes de unidade de storage**

Run: `npm --prefix frontend test frontend/src/preferencias/preferenciasStorage.test.ts`
Expected: PASS com 4/4 testes passando.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/preferencias/
git commit -m "feat(preferencias): adicionar tipos e camada de armazenamento resiliente"
```

---

### Task 3: Hook e Provedor Reativo de Preferências (`PreferenciasContext` & `usePreferencias`)

**Files:**
- Create: `frontend/src/preferencias/PreferenciasContext.tsx`
- Create: `frontend/src/preferencias/usePreferencias.ts`
- Create: `frontend/src/preferencias/usePreferencias.test.tsx`
- Modify: `frontend/src/App.tsx` (envolver com `PreferenciasProvider`)

**Interfaces:**
- Consumes: `preferenciasStorage.ts`.
- Produces:
  - `<PreferenciasProvider>`
  - `usePreferencias(): { preferencias, setModoTema, setPresetCor, setLayoutLargura, setBarraFixa, setDockRecolhida, restaurarPadroes }`
  - Aplica automaticamente `document.documentElement.dataset.tema` e `document.documentElement.dataset.preset`.

- [ ] **Step 1: Escrever testes para o hook e provider de preferências**

Criar `frontend/src/preferencias/usePreferencias.test.tsx`:
```tsx
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PreferenciasProvider } from './PreferenciasContext'
import { usePreferencias } from './usePreferencias'

describe('usePreferencias', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-tema')
    document.documentElement.removeAttribute('data-preset')
  })

  it('inicializa e aplica atributos no documentElement', () => {
    const { result } = renderHook(() => usePreferencias(), { wrapper: PreferenciasProvider })
    expect(result.current.preferencias.presetCor).toBe('azul')
    expect(document.documentElement.dataset.preset).toBe('azul')
  })

  it('permite alterar preset de cor e atualiza DOM', () => {
    const { result } = renderHook(() => usePreferencias(), { wrapper: PreferenciasProvider })
    act(() => {
      result.current.setPresetCor('lima')
    })
    expect(result.current.preferencias.presetCor).toBe('lima')
    expect(document.documentElement.dataset.preset).toBe('lima')
  })

  it('permite alternar dock recolhida', () => {
    const { result } = renderHook(() => usePreferencias(), { wrapper: PreferenciasProvider })
    expect(result.current.preferencias.dockRecolhida).toBe(false)
    act(() => {
      result.current.setDockRecolhida(true)
    })
    expect(result.current.preferencias.dockRecolhida).toBe(true)
  })

  it('restaura padrões com restaurarPadroes()', () => {
    const { result } = renderHook(() => usePreferencias(), { wrapper: PreferenciasProvider })
    act(() => {
      result.current.setPresetCor('esmeralda')
      result.current.setDockRecolhida(true)
    })
    act(() => {
      result.current.restaurarPadroes()
    })
    expect(result.current.preferencias.presetCor).toBe('azul')
    expect(result.current.preferencias.dockRecolhida).toBe(false)
  })
})
```

- [ ] **Step 2: Executar teste para verificar falha**

Run: `npm --prefix frontend test frontend/src/preferencias/usePreferencias.test.tsx`
Expected: FAIL ("Cannot find module './PreferenciasContext'").

- [ ] **Step 3: Implementar `PreferenciasContext.tsx` e `usePreferencias.ts`**

Criar `frontend/src/preferencias/PreferenciasContext.tsx`:
```tsx
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  lerPreferenciasSalvas,
  gravarPreferencias,
  PREFERENCIAS_PADRAO,
} from './preferenciasStorage'
import type {
  PreferenciasUsuario,
  ModoTema,
  PresetCor,
  LayoutLargura,
} from './preferenciasTipos'
import { COR_BARRA, aplicarTema } from '../tema/tema'

export interface PreferenciasContextValor {
  preferencias: PreferenciasUsuario
  setModoTema: (modo: ModoTema) => void
  setPresetCor: (preset: PresetCor) => void
  setLayoutLargura: (largura: LayoutLargura) => void
  setBarraFixa: (fixa: boolean) => void
  setDockRecolhida: (recolhida: boolean | ((antiga: boolean) => boolean)) => void
  restaurarPadroes: () => void
}

export const PreferenciasContext = createContext<PreferenciasContextValor | null>(null)

export function PreferenciasProvider({ children }: { children: ReactNode }) {
  const [preferencias, setPreferencias] = useState<PreferenciasUsuario>(() => lerPreferenciasSalvas())

  // Sincroniza tema real e escuta tema do sistema quando modo === 'sistema'
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const aplicar = () => {
      let temaEfetivo: 'claro' | 'escuro' = 'claro'
      if (preferencias.modoTema === 'sistema') {
        temaEfetivo = mediaQuery.matches ? 'escuro' : 'claro'
      } else {
        temaEfetivo = preferencias.modoTema
      }
      aplicarTema(temaEfetivo)
    }

    aplicar()
    mediaQuery.addEventListener('change', aplicar)
    return () => mediaQuery.removeEventListener('change', aplicar)
  }, [preferencias.modoTema])

  // Sincroniza preset de cor no html
  useEffect(() => {
    document.documentElement.dataset.preset = preferencias.presetCor
  }, [preferencias.presetCor])

  // Persiste no localStorage
  useEffect(() => {
    gravarPreferencias(preferencias)
  }, [preferencias])

  const setModoTema = useCallback((modoTema: ModoTema) => {
    setPreferencias((p) => ({ ...p, modoTema }))
  }, [])

  const setPresetCor = useCallback((presetCor: PresetCor) => {
    setPreferencias((p) => ({ ...p, presetCor }))
  }, [])

  const setLayoutLargura = useCallback((layoutLargura: LayoutLargura) => {
    setPreferencias((p) => ({ ...p, layoutLargura }))
  }, [])

  const setBarraFixa = useCallback((barraFixa: boolean) => {
    setPreferencias((p) => ({ ...p, barraFixa }))
  }, [])

  const setDockRecolhida = useCallback((recolhida: boolean | ((antiga: boolean) => boolean)) => {
    setPreferencias((p) => ({
      ...p,
      dockRecolhida: typeof recolhida === 'function' ? recolhida(p.dockRecolhida) : recolhida,
    }))
  }, [])

  const restaurarPadroes = useCallback(() => {
    setPreferencias(PREFERENCIAS_PADRAO)
  }, [])

  const valor = useMemo<PreferenciasContextValor>(
    () => ({
      preferencias,
      setModoTema,
      setPresetCor,
      setLayoutLargura,
      setBarraFixa,
      setDockRecolhida,
      restaurarPadroes,
    }),
    [preferencias, setModoTema, setPresetCor, setLayoutLargura, setBarraFixa, setDockRecolhida, restaurarPadroes]
  )

  return <PreferenciasContext.Provider value={valor}>{children}</PreferenciasContext.Provider>
}
```

Criar `frontend/src/preferencias/usePreferencias.ts`:
```ts
import { useContext } from 'react'
import { PreferenciasContext, type PreferenciasContextValor } from './PreferenciasContext'

export function usePreferencias(): PreferenciasContextValor {
  const contexto = useContext(PreferenciasContext)
  if (!contexto) {
    throw new Error('usePreferencias deve ser usado dentro de um PreferenciasProvider')
  }
  return contexto
}
```

E envolver o `<PreferenciasProvider>` na raiz de `frontend/src/App.tsx`.

- [ ] **Step 4: Executar testes de usePreferencias**

Run: `npm --prefix frontend test frontend/src/preferencias/usePreferencias.test.tsx`
Expected: PASS com todos os testes passando.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/preferencias/ frontend/src/App.tsx
git commit -m "feat(preferencias): implementar PreferenciasProvider e hook reativo com sincronizacao"
```

---

### Task 4: Modal de Preferências Acessível (`PreferenciasModal`)

**Files:**
- Create: `frontend/src/preferencias/PreferenciasModal.tsx`
- Create: `frontend/src/preferencias/PreferenciasModal.test.tsx`

**Interfaces:**
- Consumes: `usePreferencias()`.
- Produces: `<PreferenciasModal aberta={boolean} aoFechar={() => void} />`.
- Segue o design da Imagem 3:
  - Preset de cor (indicador de cor + nome)
  - Modo do tema: botões segmentados `[ Claro ] [ Escuro ] [ Sistema ]`
  - Layout da página: `[ Centralizado ] [ Largura total ]`
  - Comportamento da barra: `[ Fixa ] [ Rolar ]`
  - Botão "Restaurar padrões"
  - Fechamento com `Escape` e clique no backdrop escurecido.

- [ ] **Step 1: Escrever testes de acessibilidade e interação para `PreferenciasModal`**

Criar `frontend/src/preferencias/PreferenciasModal.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PreferenciasModal } from './PreferenciasModal'
import { PreferenciasProvider } from './PreferenciasContext'

describe('PreferenciasModal', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('não renderiza conteúdo quando aberta é false', () => {
    render(
      <PreferenciasProvider>
        <PreferenciasModal aberta={false} aoFechar={() => {}} />
      </PreferenciasProvider>
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renderiza título, opções e controles quando aberta', () => {
    render(
      <PreferenciasProvider>
        <PreferenciasModal aberta={true} aoFechar={() => {}} />
      </PreferenciasProvider>
    )
    expect(screen.getByRole('dialog', { name: /preferências/i })).toBeInTheDocument()
    expect(screen.getByText(/personalize as preferências de layout/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^escuro$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /largura total/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /restaurar padrões/i })).toBeInTheDocument()
  })

  it('chama aoFechar ao pressionar Escape', () => {
    const fechar = vi.fn()
    render(
      <PreferenciasProvider>
        <PreferenciasModal aberta={true} aoFechar={fechar} />
      </PreferenciasProvider>
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(fechar).toHaveBeenCalledTimes(1)
  })

  it('permite selecionar modo escuro e layout largura total', () => {
    render(
      <PreferenciasProvider>
        <PreferenciasModal aberta={true} aoFechar={() => {}} />
      </PreferenciasProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: /^escuro$/i }))
    expect(document.documentElement.dataset.tema).toBe('escuro')

    fireEvent.click(screen.getByRole('button', { name: /largura total/i }))
    // validado via contexto
  })
})
```

- [ ] **Step 2: Executar teste para verificar falha**

Run: `npm --prefix frontend test frontend/src/preferencias/PreferenciasModal.test.tsx`
Expected: FAIL ("Cannot find module './PreferenciasModal'").

- [ ] **Step 3: Implementar componente `PreferenciasModal.tsx`**

Implementar o modal moderno em `frontend/src/preferencias/PreferenciasModal.tsx`, com cantos arredondados, botões segmentados com fundo contrastante no item selecionado e suporte total a acessibilidade WAI-ARIA.

- [ ] **Step 4: Executar testes de unidade do modal**

Run: `npm --prefix frontend test frontend/src/preferencias/PreferenciasModal.test.tsx`
Expected: PASS com 100% dos testes passando.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/preferencias/PreferenciasModal.tsx frontend/src/preferencias/PreferenciasModal.test.tsx
git commit -m "feat(preferencias): criar modal de preferências com opções de tema, preset e layout"
```

---

### Task 5: Componente de Dock Flutuante Retrátil (`DockLateral`)

**Files:**
- Create: `frontend/src/layout/DockLateral.tsx`
- Create: `frontend/src/layout/DockLateral.test.tsx`

**Interfaces:**
- Consumes: `usePreferencias()`, `useMesSelecionado()`, `itensMenu.ts`.
- Produces: `<DockLateral nomeUsuario={string} aoSair={() => void} aoNavegar?: () => void aoAbrirPreferencias: () => void />`.
- Características:
  - Estilo flutuante (`m-3 rounded-2xl border border-[var(--cor-linha)] bg-[var(--cor-card)] shadow-lg`).
  - Botão de colapsar/expandir no topo (`aria-expanded`, chevron animado).
  - Modo expandido (`w-60`): exibe ícones, grupos de menu com títulos e rótulos.
  - Modo compacto (`w-18`): ícones centralizados em pílulas confortáveis; botão ativo com destaque vibrante; tooltip flutuante ao pairar ou focar via teclado.
  - Botão de preferências (engrenagem) no rodapé da dock abrindo o modal.

- [ ] **Step 1: Escrever testes para `DockLateral`**

Criar `frontend/src/layout/DockLateral.test.tsx` testando renderização expandida, recolhimento, exibição de tooltips acessíveis e acionamento do callback de preferências.

- [ ] **Step 2: Executar teste para verificar falha**

Run: `npm --prefix frontend test frontend/src/layout/DockLateral.test.tsx`
Expected: FAIL ("Cannot find module './DockLateral'").

- [ ] **Step 3: Implementar `DockLateral.tsx`**

Implementar o componente com layout flex vertical, suporte a tooltip via atributo HTML `title` e badge flutuante para estado recolhido, e botão de alternância recolhida/expandida com transição suave.

- [ ] **Step 4: Executar testes de `DockLateral`**

Run: `npm --prefix frontend test frontend/src/layout/DockLateral.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/layout/DockLateral.tsx frontend/src/layout/DockLateral.test.tsx
git commit -m "feat(layout): criar DockLateral flutuante com suporte a modo compacto retratil"
```

---

### Task 6: Integração no Layout Shell e Cabeçalho Principal

**Files:**
- Modify: `frontend/src/layout/AppShell.tsx`
- Modify: `frontend/src/layout/HeaderPrincipal.tsx`
- Modify: `frontend/src/layout/AppShell.test.tsx`
- Modify: `frontend/src/layout/HeaderPrincipal.test.tsx`

**Interfaces:**
- Consumes: `usePreferencias()`, `DockLateral`, `PreferenciasModal`.
- Produces: Shell responsivo onde:
  - O desktop usa a nova `DockLateral` com largura reativa (`w-60` vs `w-18`).
  - O `<main>` aplica `max-w-6xl mx-auto` se `layoutLargura === 'centralizado'` ou `w-full px-4 md:px-8` se `layoutLargura === 'largura-total'`.
  - O cabeçalho é `sticky top-0` se `barraFixa` for true, ou `relative` se false.
  - O menu de perfil no cabeçalho inclui a ação "Preferências" que abre o modal.
  - O mobile drawer usa a dock em modo expandido com fechar automático ao navegar.

- [ ] **Step 1: Atualizar testes do AppShell e HeaderPrincipal**

Atualizar `AppShell.test.tsx` e `HeaderPrincipal.test.tsx` para cobrir abertura do modal de preferências, layout largura total e alternância da dock.

- [ ] **Step 2: Executar testes para verificar falha**

Run: `npm --prefix frontend test frontend/src/layout/AppShell.test.tsx frontend/src/layout/HeaderPrincipal.test.tsx`
Expected: FAIL indicando métodos ou seletores ausentes.

- [ ] **Step 3: Implementar integração em `AppShell.tsx` e `HeaderPrincipal.tsx`**

Integrar os novos componentes, hooks de preferência e gerenciar o estado `modalPreferenciasAberta`.

- [ ] **Step 4: Executar testes do layout**

Run: `npm --prefix frontend test frontend/src/layout/AppShell.test.tsx frontend/src/layout/HeaderPrincipal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/layout/AppShell.tsx frontend/src/layout/HeaderPrincipal.tsx frontend/src/layout/AppShell.test.tsx frontend/src/layout/HeaderPrincipal.test.tsx
git commit -m "feat(shell): integrar DockLateral reativa, modal de preferencias e opcoes de layout"
```

---

### Task 7: Verificação Completa de Regressão e Validação Final

**Files:**
- Todos os arquivos do projeto

- [ ] **Step 1: Rodar a suíte completa de testes do frontend**

Run: `npm --prefix frontend test`
Expected: PASS em todos os testes unitários e de integração (561+ testes).

- [ ] **Step 2: Rodar build e validação de tipos TypeScript**

Run: `npm --prefix frontend run build`
Expected: Build concluído com sucesso sem erros de tipagem.

- [ ] **Step 3: Rodar verificação de testes do backend**

Run: `./mvnw test`
Expected: PASS em todos os 423 testes do backend.

- [ ] **Step 4: Commit de finalização (se necessário)**

```bash
git commit --allow-empty -m "chore(ui): homologar novo tema escuro, dock flutuante e preferencias"
```
