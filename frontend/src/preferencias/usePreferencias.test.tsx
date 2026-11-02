import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
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
