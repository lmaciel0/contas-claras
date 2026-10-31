import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import type { NotaRequest, NotaResponse } from '../../api/tipos'
import { servidor } from '../../teste/servidor'
import { useCategoriasNota, useExcluirCategoriaNota, useNota, useNotas, useSalvarNota } from './useNotas'

const nota = (parcial: Partial<NotaResponse> = {}): NotaResponse => ({
  id: 7,
  titulo: 'Compras',
  conteudo: { type: 'doc', content: [] },
  categoriaId: null,
  fixada: false,
  criadoEm: '2026-10-31T10:00:00Z',
  atualizadoEm: '2026-10-31T10:00:00Z',
  ...parcial,
})

function montar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

describe('cache das notas', () => {
  it('autosaveNaoInvalidaANotaAberta', async () => {
    const chamadas = { nota: 0, lista: 0 }
    servidor.use(
      http.get('/api/notas/7', () => {
        chamadas.nota += 1
        return HttpResponse.json(nota())
      }),
      http.get('/api/notas', () => {
        chamadas.lista += 1
        return HttpResponse.json([])
      }),
      http.put('/api/notas/7', () => HttpResponse.json(nota({ titulo: 'Novo' }))),
    )
    const { queryClient, wrapper } = montar()
    const { result } = renderHook(() => ({ nota: useNota(7), lista: useNotas({}), salvar: useSalvarNota() }), {
      wrapper,
    })
    await waitFor(() => expect(result.current.nota.isSuccess && result.current.lista.isSuccess).toBe(true))
    const req: NotaRequest = { titulo: 'Novo', conteudo: { type: 'doc' }, categoriaId: null }
    await act(() => result.current.salvar.mutateAsync({ id: 7, ...req }))
    await waitFor(() => expect(chamadas.lista).toBe(2))
    expect(chamadas.nota).toBe(1)
    expect(queryClient.getQueryData<NotaResponse>(['nota', 7])?.titulo).toBe('Novo')
  })

  it('excluirCategoriaInvalidaNotasECategorias', async () => {
    const chamadas = { notas: 0, categorias: 0 }
    servidor.use(
      http.get('/api/notas', () => {
        chamadas.notas += 1
        return HttpResponse.json([])
      }),
      http.get('/api/categorias-nota', () => {
        chamadas.categorias += 1
        return HttpResponse.json([])
      }),
      http.delete('/api/categorias-nota/3', () => new HttpResponse(null, { status: 204 })),
    )
    const { wrapper } = montar()
    const { result } = renderHook(
      () => ({ notas: useNotas({}), categorias: useCategoriasNota(), excluir: useExcluirCategoriaNota() }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.notas.isSuccess && result.current.categorias.isSuccess).toBe(true))
    await act(() => result.current.excluir.mutateAsync(3))
    await waitFor(() => expect(chamadas).toEqual({ notas: 2, categorias: 2 }))
  })
})
