import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CHAVE_TEMA } from './tema'
import { useTema } from './useTema'

/** O jsdom não tem `matchMedia`; este mock define o tema do sistema e conta as vezes que o hook o consulta ou escuta. */
function instalarSistema(escuro: boolean) {
  const addEventListener = vi.fn()
  const consulta = { matches: escuro, media: '(prefers-color-scheme: dark)', addEventListener, removeEventListener: vi.fn() }
  const matchMedia = vi.fn(() => consulta)
  vi.stubGlobal('matchMedia', matchMedia)
  return { matchMedia, addEventListener }
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
  it('sem escolha salva abre no claro, mesmo com o sistema escuro', () => {
    instalarSistema(true)
    const { result } = renderHook(() => useTema())
    expect(result.current.tema).toBe('claro')
    expect(document.documentElement.dataset.tema).toBe('claro')
  })

  it('escolha salva escuro vence o sistema claro', () => {
    instalarSistema(false)
    localStorage.setItem(CHAVE_TEMA, 'escuro')
    const { result } = renderHook(() => useTema())
    expect(result.current.tema).toBe('escuro')
    expect(document.documentElement.dataset.tema).toBe('escuro')
  })

  it('escolha salva claro vence o sistema escuro', () => {
    instalarSistema(true)
    localStorage.setItem(CHAVE_TEMA, 'claro')
    const { result } = renderHook(() => useTema())
    expect(result.current.tema).toBe('claro')
  })

  it('não consulta nem acompanha o sistema', () => {
    const { matchMedia, addEventListener } = instalarSistema(true)
    renderHook(() => useTema())
    expect(matchMedia).not.toHaveBeenCalled()
    expect(addEventListener).not.toHaveBeenCalled()
  })

  it('alternar muda o tema, grava em localStorage e atualiza data-tema', () => {
    instalarSistema(false)
    const { result } = renderHook(() => useTema())
    act(() => result.current.alternar())
    expect(result.current.tema).toBe('escuro')
    expect(localStorage.getItem(CHAVE_TEMA)).toBe('escuro')
    expect(document.documentElement.dataset.tema).toBe('escuro')
    act(() => result.current.alternar())
    expect(result.current.tema).toBe('claro')
    expect(localStorage.getItem(CHAVE_TEMA)).toBe('claro')
  })

  it('a cor da barra do navegador acompanha o tema escolhido', () => {
    instalarSistema(false)
    document.head.innerHTML = '<meta name="theme-color" content="#27187E" />'
    const { result } = renderHook(() => useTema())
    const cor = () => document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content
    expect(cor()).toBe('#27187E')
    act(() => result.current.alternar())
    expect(cor()).toBe('#0f0b2b')
    act(() => result.current.alternar())
    expect(cor()).toBe('#27187E')
    document.head.innerHTML = ''
  })

  it('valor inválido salvo é ignorado', () => {
    instalarSistema(true)
    localStorage.setItem(CHAVE_TEMA, 'roxo')
    const { result } = renderHook(() => useTema())
    expect(result.current.tema).toBe('claro')
  })

  it('localStorage que lança erro não quebra', () => {
    instalarSistema(false)
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
