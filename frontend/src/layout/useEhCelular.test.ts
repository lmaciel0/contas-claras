import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LARGURA_CELULAR, useEhCelular } from './useEhCelular'

function definirLargura(largura: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: largura })
  window.dispatchEvent(new Event('resize'))
}

describe('useEhCelular', () => {
  it('o limite é 768 px', () => {
    expect(LARGURA_CELULAR).toBe(768)
  })

  it('é true em 767 px', () => {
    definirLargura(767)
    const { result } = renderHook(() => useEhCelular())
    expect(result.current).toBe(true)
  })

  it('é false em 768 px', () => {
    definirLargura(768)
    const { result } = renderHook(() => useEhCelular())
    expect(result.current).toBe(false)
  })

  it('reage ao resize nos dois sentidos', () => {
    definirLargura(1024)
    const { result } = renderHook(() => useEhCelular())
    expect(result.current).toBe(false)

    act(() => definirLargura(390))
    expect(result.current).toBe(true)

    act(() => definirLargura(768))
    expect(result.current).toBe(false)
  })
})
