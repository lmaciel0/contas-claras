import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAutosave } from './useAutosave'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function montar(salvar: (v: string) => Promise<unknown>, aoSair?: (v: string) => void) {
  return renderHook(({ valor }) => useAutosave({ valor, salvar, aoSair }), { initialProps: { valor: 'a' } })
}

describe('useAutosave', () => {
  it('primeiroValorNaoGrava', async () => {
    const salvar = vi.fn().mockResolvedValue(undefined)
    const { result } = montar(salvar)
    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(salvar).not.toHaveBeenCalled()
    expect(result.current.estado).toBe('salvo')
  })

  it('grava1SegundoDepoisDaUltimaMudanca', async () => {
    const salvar = vi.fn().mockResolvedValue(undefined)
    const { rerender } = montar(salvar)
    rerender({ valor: 'b' })
    await act(() => vi.advanceTimersByTimeAsync(600))
    rerender({ valor: 'c' })
    await act(() => vi.advanceTimersByTimeAsync(600))
    rerender({ valor: 'd' })
    await act(() => vi.advanceTimersByTimeAsync(999))
    expect(salvar).not.toHaveBeenCalled()
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(salvar).toHaveBeenCalledTimes(1)
    expect(salvar).toHaveBeenCalledWith('d')
  })

  it('estadoPassaPorPendenteSalvandoSalvo', async () => {
    let resolver: () => void = () => {}
    const salvar = vi.fn(() => new Promise<void>((r) => (resolver = r)))
    const { result, rerender } = montar(salvar)
    rerender({ valor: 'b' })
    expect(result.current.estado).toBe('pendente')
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(result.current.estado).toBe('salvando')
    await act(async () => resolver())
    expect(result.current.estado).toBe('salvo')
  })

  it('mudancaDuranteGravacaoGeraUmaGravacaoDepoisComOUltimoValor', async () => {
    const resolvers: (() => void)[] = []
    const salvar = vi.fn(() => new Promise<void>((r) => resolvers.push(r)))
    const { rerender } = montar(salvar)
    rerender({ valor: 'b' })
    await act(() => vi.advanceTimersByTimeAsync(1000))
    rerender({ valor: 'c' })
    await act(() => vi.advanceTimersByTimeAsync(2000))
    expect(salvar).toHaveBeenCalledTimes(1)
    await act(async () => resolvers[0]?.())
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(salvar).toHaveBeenCalledTimes(2)
    expect(salvar).toHaveBeenLastCalledWith('c')
    await act(async () => resolvers[1]?.())
    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(salvar).toHaveBeenCalledTimes(2)
  })
})
