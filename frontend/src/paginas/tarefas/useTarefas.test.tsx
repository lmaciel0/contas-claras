import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import type { TarefaResponse, TarefasResponse } from '../../api/tipos'
import { servidor } from '../../teste/servidor'
import { useConcluirTarefa, useCriarTarefa, useEditarTarefa, useExcluirTarefa, useTarefas } from './useTarefas'

const tarefa = (parcial: Partial<TarefaResponse> = {}): TarefaResponse => ({
  id: 1,
  titulo: 'Pagar o boleto',
  data: '2026-10-31',
  concluida: false,
  concluidaEm: null,
  ...parcial,
})

const resposta: TarefasResponse = {
  hoje: '2026-10-31',
  atrasadas: [],
  deHoje: [tarefa()],
  proximas: [],
  concluidasHoje: [],
  concluidas: [],
  totalConcluidas: 0,
}

function montar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

describe('hooks de tarefas', () => {
  it('listarChamaGetApiTarefas', async () => {
    servidor.use(http.get('/api/tarefas', () => HttpResponse.json(resposta)))
    const { wrapper } = montar()

    const { result } = renderHook(() => useTarefas(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(resposta)
  })

  it('criarEnviaPostComTituloEData', async () => {
    let corpo: unknown
    servidor.use(
      http.post('/api/tarefas', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json(tarefa({ id: 7, titulo: 'Ligar para o banco' }), { status: 201 })
      }),
    )
    const { wrapper } = montar()
    const { result } = renderHook(() => useCriarTarefa(), { wrapper })

    result.current.mutate({ titulo: 'Ligar para o banco', data: '2026-11-02' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(corpo).toEqual({ titulo: 'Ligar para o banco', data: '2026-11-02' })
  })

  it('concluirEnviaPatchComConcluida', async () => {
    let corpo: unknown
    let url = ''
    servidor.use(
      http.patch('/api/tarefas/:id/concluida', async ({ request, params }) => {
        corpo = await request.json()
        url = String(params.id)
        return HttpResponse.json(tarefa({ id: 4, concluida: true, concluidaEm: '2026-10-31T12:00:00Z' }))
      }),
    )
    const { wrapper } = montar()
    const { result } = renderHook(() => useConcluirTarefa(), { wrapper })

    result.current.mutate({ id: 4, concluida: true })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(url).toBe('4')
    expect(corpo).toEqual({ concluida: true })
  })

  it('editarEnviaPutComDataNula', async () => {
    let corpo: unknown
    let url = ''
    servidor.use(
      http.put('/api/tarefas/:id', async ({ request, params }) => {
        corpo = await request.json()
        url = String(params.id)
        return HttpResponse.json(tarefa({ id: 9, titulo: 'Novo título', data: null }))
      }),
    )
    const { wrapper } = montar()
    const { result } = renderHook(() => useEditarTarefa(), { wrapper })

    result.current.mutate({ id: 9, titulo: 'Novo título', data: null })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(url).toBe('9')
    expect(corpo).toEqual({ titulo: 'Novo título', data: null })
  })

  it('excluirEnviaDelete', async () => {
    let url = ''
    servidor.use(
      http.delete('/api/tarefas/:id', ({ params }) => {
        url = String(params.id)
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { wrapper } = montar()
    const { result } = renderHook(() => useExcluirTarefa(), { wrapper })

    result.current.mutate(5)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(url).toBe('5')
  })

  it('mutacaoInvalidaAConsultaTarefas', async () => {
    let gets = 0
    servidor.use(
      http.get('/api/tarefas', () => {
        gets += 1
        return HttpResponse.json(resposta)
      }),
      http.post('/api/tarefas', () => HttpResponse.json(tarefa({ id: 2 }), { status: 201 })),
    )
    const { wrapper } = montar()
    const { result } = renderHook(() => ({ lista: useTarefas(), criar: useCriarTarefa() }), { wrapper })
    await waitFor(() => expect(result.current.lista.isSuccess).toBe(true))
    expect(gets).toBe(1)

    result.current.criar.mutate({ titulo: 'Outra', data: null })

    await waitFor(() => expect(gets).toBe(2))
  })
})
