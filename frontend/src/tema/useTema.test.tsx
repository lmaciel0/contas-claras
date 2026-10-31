import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CHAVE_TEMA } from './tema'
import { useTema } from './useTema'

type OuvinteMudanca = (evento: MediaQueryListEvent) => void

/** O jsdom não tem `matchMedia`; este mock deixa o teste escolher o tema do sistema e disparar `change`. */
function instalarMatchMedia(escuroInicial: boolean) {
  let escuro = escuroInicial
  const ouvintes = new Set<OuvinteMudanca>()
  const consulta = {
    get matches() {
      return escuro
    },
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_tipo: string, ouvinte: OuvinteMudanca) => ouvintes.add(ouvinte),
    removeEventListener: (_tipo: string, ouvinte: OuvinteMudanca) => ouvintes.delete(ouvinte),
  }
  vi.stubGlobal('matchMedia', () => consulta)
  return {
    mudarSistema(novoEscuro: boolean) {
      escuro = novoEscuro
      act(() => {
        ouvintes.forEach((ouvinte) => ouvinte({ matches: novoEscuro } as MediaQueryListEvent))
      })
    },
  }
}

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.tema
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useTema', () => {
  it('sem escolha salva usa o tema do sistema', () => {
    instalarMatchMedia(true)
    const { result } = renderHook(() => useTema())
    expect(result.current.tema).toBe('escuro')
    expect(document.documentElement.dataset.tema).toBe('escuro')
  })

  it('escolha salva vence o sistema', () => {
    instalarMatchMedia(true)
    localStorage.setItem(CHAVE_TEMA, 'claro')
    const { result } = renderHook(() => useTema())
    expect(result.current.tema).toBe('claro')
    expect(document.documentElement.dataset.tema).toBe('claro')
  })

  it('sem escolha salva acompanha o sistema em tempo real', () => {
    const sistema = instalarMatchMedia(false)
    const { result } = renderHook(() => useTema())
    expect(result.current.tema).toBe('claro')
    sistema.mudarSistema(true)
    expect(result.current.tema).toBe('escuro')
    expect(document.documentElement.dataset.tema).toBe('escuro')
  })

  it('com escolha salva ignora mudança do sistema', () => {
    const sistema = instalarMatchMedia(false)
    localStorage.setItem(CHAVE_TEMA, 'claro')
    const { result } = renderHook(() => useTema())
    sistema.mudarSistema(true)
    expect(result.current.tema).toBe('claro')
  })

  it('alternar muda o tema, grava em localStorage e atualiza data-tema', () => {
    instalarMatchMedia(false)
    const { result } = renderHook(() => useTema())
    act(() => result.current.alternar())
    expect(result.current.tema).toBe('escuro')
    expect(localStorage.getItem(CHAVE_TEMA)).toBe('escuro')
    expect(document.documentElement.dataset.tema).toBe('escuro')
    act(() => result.current.alternar())
    expect(result.current.tema).toBe('claro')
    expect(localStorage.getItem(CHAVE_TEMA)).toBe('claro')
  })

  it('valor inválido salvo é ignorado', () => {
    instalarMatchMedia(true)
    localStorage.setItem(CHAVE_TEMA, 'roxo')
    const { result } = renderHook(() => useTema())
    expect(result.current.tema).toBe('escuro')
  })

  it('localStorage que lança erro não quebra', () => {
    instalarMatchMedia(false)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    const { result } = renderHook(() => useTema())
    expect(result.current.tema).toBe('claro')
    act(() => result.current.alternar())
    expect(result.current.tema).toBe('escuro')
    expect(setItem).toHaveBeenCalled()
    expect(document.documentElement.dataset.tema).toBe('escuro')
  })
})
