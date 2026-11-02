import { renderHook, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CHAVE_ULTIMA_ATIVIDADE, useTimeoutInatividade } from './useTimeoutInatividade'

describe('useTimeoutInatividade', () => {
  const TIMEOUT_PADRAO = 30 * 60 * 1000

  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  it('nao faz nada quando inativo (usuario deslogado)', () => {
    const aoExpirar = vi.fn()
    renderHook(() => useTimeoutInatividade({ ativo: false, aoExpirar }))

    act(() => {
      vi.advanceTimersByTime(TIMEOUT_PADRAO + 5000)
    })

    expect(aoExpirar).not.toHaveBeenCalled()
    expect(localStorage.getItem(CHAVE_ULTIMA_ATIVIDADE)).toBeNull()
  })

  it('grava timestamp ao inicializar ativo e expira apos 30 minutos sem atividade', () => {
    const aoExpirar = vi.fn()
    const agora = 1700000000000
    vi.setSystemTime(agora)

    renderHook(() => useTimeoutInatividade({ ativo: true, aoExpirar }))

    expect(localStorage.getItem(CHAVE_ULTIMA_ATIVIDADE)).toBe(String(agora))

    // Passa 29 minutos: nao expira
    act(() => {
      vi.advanceTimersByTime(29 * 60 * 1000)
    })
    expect(aoExpirar).not.toHaveBeenCalled()

    // Passa mais 1 minuto e 15 segundos: expira
    act(() => {
      vi.advanceTimersByTime(1 * 60 * 1000 + 15000)
    })
    expect(aoExpirar).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem(CHAVE_ULTIMA_ATIVIDADE)).toBeNull()
  })

  it('interacao do usuario posterga a expiracao', () => {
    const aoExpirar = vi.fn()
    const agora = 1700000000000
    vi.setSystemTime(agora)

    renderHook(() => useTimeoutInatividade({ ativo: true, aoExpirar }))

    // Passa 20 minutos
    act(() => {
      vi.advanceTimersByTime(20 * 60 * 1000)
      window.dispatchEvent(new Event('pointerdown'))
    })

    // Passa mais 20 minutos (total 40 min desde inicio, mas apenas 20 min desde ultimo clique)
    act(() => {
      vi.advanceTimersByTime(20 * 60 * 1000)
    })
    expect(aoExpirar).not.toHaveBeenCalled()

    // Passa mais 11 minutos (total 31 min desde ultimo clique)
    act(() => {
      vi.advanceTimersByTime(11 * 60 * 1000)
    })
    expect(aoExpirar).toHaveBeenCalledTimes(1)
  })

  it('ao retomar visibilidade apos suspensao (notebook fechado), expira imediatamente', () => {
    const aoExpirar = vi.fn()
    const agora = 1700000000000
    vi.setSystemTime(agora)

    renderHook(() => useTimeoutInatividade({ ativo: true, aoExpirar }))

    // Notebook suspenso por 8 horas (timers JS nao rodaram enquanto desligado)
    vi.setSystemTime(agora + 8 * 60 * 60 * 1000)

    // Evento de volta da visibilidade da aba
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(aoExpirar).toHaveBeenCalledTimes(1)
  })
})
