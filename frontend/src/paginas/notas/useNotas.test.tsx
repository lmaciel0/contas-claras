import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import type { NotaRequest, NotaResponse } from '../../api/tipos'
import { servidor } from '../../teste/servidor'
import { useNotaFixada } from './useNotas'

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

const requisicao: NotaRequest = { titulo: 'Compras', conteudo: { type: 'doc', content: [] }, categoriaId: 3 }

function montar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

afterEach(() => vi.restoreAllMocks())

describe('endpoints de notas', () => {
  it('listarEnviaSoOsParametrosPreenchidos', async () => {
    const urls: string[] = []
    servidor.use(
      http.get('/api/notas', ({ request }) => {
        urls.push(new URL(request.url).search)
        return HttpResponse.json([])
      }),
    )
    await endpoints.notas.listar({ busca: 'remedios', categoriaId: 3 })
    await endpoints.notas.listar({ semCategoria: true })
    await endpoints.notas.listar({})
    expect(urls).toEqual(['?busca=remedios&categoriaId=3', '?semCategoria=true', ''])
  })

  it('criarEnviaPostComCategoriaId', async () => {
    let corpo: unknown
    servidor.use(
      http.post('/api/notas', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json(nota(), { status: 201 })
      }),
    )
    await endpoints.notas.criar(3)
    expect(corpo).toEqual({ categoriaId: 3 })
  })

  it('editarEnviaPutComConteudo', async () => {
    let corpo: unknown
    servidor.use(
      http.put('/api/notas/7', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json(nota())
      }),
    )
    await endpoints.notas.editar(7, requisicao)
    expect(corpo).toEqual(requisicao)
  })

  it('editarAceitaKeepalive', async () => {
    servidor.use(http.put('/api/notas/7', () => HttpResponse.json(nota())))
    const espiao = vi.spyOn(globalThis, 'fetch')
    await endpoints.notas.editar(7, requisicao, { keepalive: true })
    expect(espiao.mock.calls[0]?.[1]).toMatchObject({ method: 'PUT', keepalive: true })
  })

  it('fixarEnviaPatchFixada', async () => {
    let corpo: unknown
    servidor.use(
      http.patch('/api/notas/7/fixada', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json(nota({ fixada: true }))
      }),
    )
    await endpoints.notas.fixar(7, true)
    expect(corpo).toEqual({ fixada: true })
  })

  it('salvarConteudoEnviaPatchConteudo', async () => {
    let corpo: unknown
    servidor.use(
      http.patch('/api/notas/7/conteudo', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json(nota())
      }),
    )
    const conteudo = { type: 'doc', content: [{ type: 'paragraph' }] }
    await endpoints.notas.salvarConteudo(7, conteudo)
    expect(corpo).toEqual({ conteudo })
  })

  it('fixadaDevolveNotaNula', async () => {
    servidor.use(http.get('/api/notas/fixada', () => HttpResponse.json({ nota: null })))
    const { wrapper } = montar()
    const { result } = renderHook(() => useNotaFixada(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ nota: null })
  })
})
