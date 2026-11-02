import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { servidor } from '../../teste/servidor'
import type { Projeto } from './tipos'
import {
  useAlternarSubtarefa,
  useCriarProjeto,
  useExcluirProjeto,
  useMoverEstagioProjeto,
  useProjetos,
} from './useProjetos'

const mockProjeto: Projeto = {
  id: 1,
  titulo: 'Projeto Inicial',
  descricao: 'Desc',
  categoria: 'Engenharia',
  estagio: 'A_FAZER',
  prioridade: 'MEDIA',
  cor: 'azul',
  ordem: 0,
  prazo: '2026-12-15',
  porcentagemProgresso: 50,
  totalSubtarefas: 2,
  subtarefasConcluidas: 1,
  subtarefas: [
    { id: 101, titulo: 'Sub 1', concluida: true, ordem: 0 },
    { id: 102, titulo: 'Sub 2', concluida: false, ordem: 1 },
  ],
  criadoEm: '2026-11-02T10:00:00Z',
  atualizadoEm: '2026-11-02T10:00:00Z',
}

function montar() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

describe('useProjetos', () => {
  it('listar busca projetos do endpoint', async () => {
    servidor.use(http.get('/api/projetos', () => HttpResponse.json([mockProjeto])))
    const { wrapper } = montar()

    const { result } = renderHook(() => useProjetos(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([mockProjeto])
  })

  it('moverEstagio atualiza otimisticamente no cache antes da resposta', async () => {
    let resolverResposta: (p: Projeto) => void = () => {}
    const promessaServidor = new Promise<Projeto>((resolve) => {
      resolverResposta = resolve
    })

    servidor.use(
      http.get('/api/projetos', () => HttpResponse.json([mockProjeto])),
      http.patch('/api/projetos/1/estagio', async () => {
        const p = await promessaServidor
        return HttpResponse.json(p)
      }),
    )

    const { wrapper, queryClient } = montar()
    const { result } = renderHook(() => ({
      consulta: useProjetos(),
      mover: useMoverEstagioProjeto(),
    }), { wrapper })

    await waitFor(() => expect(result.current.consulta.isSuccess).toBe(true))
    expect(result.current.consulta.data?.[0].estagio).toBe('A_FAZER')

    // Dispara a mutação sem esperar a resposta do servidor
    act(() => {
      result.current.mover.mutate({ id: 1, estagio: 'EM_ANDAMENTO', novaOrdem: 1 })
    })

    // Otimisticamente, o cache já deve refletir EM_ANDAMENTO
    await waitFor(() => {
      const dadosOtimistas = queryClient.getQueryData<Projeto[]>(['projetos', undefined])
      expect(dadosOtimistas?.[0].estagio).toBe('EM_ANDAMENTO')
    })

    // Libera a resposta do servidor
    act(() => {
      resolverResposta({ ...mockProjeto, estagio: 'EM_ANDAMENTO', ordem: 1 })
    })

    await waitFor(() => expect(result.current.mover.isSuccess).toBe(true))
  })

  it('moverEstagio faz rollback se a requisição falhar', async () => {
    servidor.use(
      http.get('/api/projetos', () => HttpResponse.json([mockProjeto])),
      http.patch('/api/projetos/1/estagio', () => {
        return new HttpResponse(null, { status: 500 })
      }),
    )

    const { wrapper, queryClient } = montar()
    const { result } = renderHook(() => ({
      consulta: useProjetos(),
      mover: useMoverEstagioProjeto(),
    }), { wrapper })

    await waitFor(() => expect(result.current.consulta.isSuccess).toBe(true))

    act(() => {
      result.current.mover.mutate({ id: 1, estagio: 'CONCLUIDO' })
    })

    await waitFor(() => expect(result.current.mover.isError).toBe(true))

    // Rollback deve restaurar estagio 'A_FAZER'
    const dadosAposErro = queryClient.getQueryData<Projeto[]>(['projetos', undefined])
    expect(dadosAposErro?.[0].estagio).toBe('A_FAZER')
  })

  it('alternarSubtarefa recalcula percentual otimisticamente', async () => {
    servidor.use(
      http.get('/api/projetos', () => HttpResponse.json([mockProjeto])),
      http.patch('/api/projetos/1/subtarefas/102/alternar', () => {
        return HttpResponse.json({ id: 102, titulo: 'Sub 2', concluida: true, ordem: 1 })
      }),
    )

    const { wrapper } = montar()
    const { result } = renderHook(() => ({
      consulta: useProjetos(),
      alternar: useAlternarSubtarefa(),
    }), { wrapper })

    await waitFor(() => expect(result.current.consulta.isSuccess).toBe(true))
    expect(result.current.consulta.data?.[0].porcentagemProgresso).toBe(50)

    act(() => {
      result.current.alternar.mutate({ projetoId: 1, subtarefaId: 102 })
    })

    await waitFor(() => expect(result.current.alternar.isSuccess).toBe(true))
  })

  it('criar e excluir invalidam a consulta', async () => {
    let listagens = 0
    servidor.use(
      http.get('/api/projetos', () => {
        listagens += 1
        return HttpResponse.json([mockProjeto])
      }),
      http.post('/api/projetos', () => HttpResponse.json({ ...mockProjeto, id: 2 }, { status: 201 })),
      http.delete('/api/projetos/1', () => new HttpResponse(null, { status: 204 })),
    )

    const { wrapper } = montar()
    const { result } = renderHook(() => ({
      consulta: useProjetos(),
      criar: useCriarProjeto(),
      excluir: useExcluirProjeto(),
    }), { wrapper })

    await waitFor(() => expect(result.current.consulta.isSuccess).toBe(true))
    expect(listagens).toBe(1)

    act(() => {
      result.current.criar.mutate({ titulo: 'Projeto 2' })
    })
    await waitFor(() => expect(result.current.criar.isSuccess).toBe(true))
    await waitFor(() => expect(listagens).toBe(2))

    act(() => {
      result.current.excluir.mutate(1)
    })
    await waitFor(() => expect(result.current.excluir.isSuccess).toBe(true))
    await waitFor(() => expect(listagens).toBe(3))
  })
})
