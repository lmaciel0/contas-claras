import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useLarguraJanela } from './useLarguraJanela'

function definirLargura(largura: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: largura })
  window.dispatchEvent(new Event('resize'))
}

describe('useLarguraJanela', () => {
  it('aplica o predicado à largura atual e reage ao resize', () => {
    definirLargura(500)
    const { result } = renderHook(() => useLarguraJanela((largura) => largura < 600, false))
    expect(result.current).toBe(true)

    act(() => definirLargura(900))
    expect(result.current).toBe(false)
  })
})
