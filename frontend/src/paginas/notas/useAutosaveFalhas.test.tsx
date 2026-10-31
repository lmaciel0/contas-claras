import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAutosave } from './useAutosave'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function montar(salvar: (v: string) => Promise<unknown>, aoSair?: (v: string) => void) {
  return renderHook(({ valor }) => useAutosave({ valor, salvar, aoSair }), { initialProps: { valor: 'a' } })
}

describe('useAutosave: falha, descarga e saida', () => {
  it('falhaMostraErroEMantemOValor', async () => {
    const salvar = vi.fn().mockRejectedValue(new Error('falhou'))
    const { result, rerender } = montar(salvar)
    rerender({ valor: 'b' })
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(result.current.estado).toBe('erro')
    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(salvar).toHaveBeenCalledTimes(1)
  })

  it('proximaMudancaTentaDeNovo', async () => {
    const salvar = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(undefined)
    const { result, rerender } = montar(salvar)
    rerender({ valor: 'b' })
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(result.current.estado).toBe('erro')
    rerender({ valor: 'c' })
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(salvar).toHaveBeenLastCalledWith('c')
    expect(result.current.estado).toBe('salvo')
  })

  it('descarregarGravaNaHora', async () => {
    const salvar = vi.fn().mockResolvedValue(undefined)
    const { result, rerender } = montar(salvar)
    rerender({ valor: 'b' })
    await act(() => result.current.descarregar())
    expect(salvar).toHaveBeenCalledWith('b')
    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(salvar).toHaveBeenCalledTimes(1)
  })

  it('desmontarComPendenteGrava', async () => {
    const salvar = vi.fn().mockResolvedValue(undefined)
    const { rerender, unmount } = montar(salvar)
    rerender({ valor: 'b' })
    unmount()
    expect(salvar).toHaveBeenCalledWith('b')
  })

  it('pagehideComPendenteChamaAoSair', async () => {
    const aoSair = vi.fn()
    const { rerender } = montar(vi.fn().mockResolvedValue(undefined), aoSair)
    rerender({ valor: 'b' })
    window.dispatchEvent(new Event('pagehide'))
    expect(aoSair).toHaveBeenCalledWith('b')
  })

  it('semMudancaNaoChamaAoSair', async () => {
    const aoSair = vi.fn()
    montar(vi.fn().mockResolvedValue(undefined), aoSair)
    window.dispatchEvent(new Event('pagehide'))
    expect(aoSair).not.toHaveBeenCalled()
  })
})
