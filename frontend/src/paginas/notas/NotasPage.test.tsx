import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CategoriaNotaResponse, NotaResumoResponse } from '../../api/tipos'
import { renderComApp } from '../../teste/render'
import { servidor } from '../../teste/servidor'
import { categoriaNota, resumo } from './dadosTeste'
import { NotasPage } from './NotasPage'

afterEach(() => vi.useRealTimers())

/** Responde a lista (guardando a URL de cada consulta) e as categorias. */
function api(notas: NotaResumoResponse[] | (() => NotaResumoResponse[]), categorias: CategoriaNotaResponse[] = []) {
  const consultas: URL[] = []
  servidor.use(
    http.get('/api/notas', ({ request }) => {
      consultas.push(new URL(request.url))
      return HttpResponse.json(typeof notas === 'function' ? notas() : notas)
    }),
    http.get('/api/categorias-nota', () => HttpResponse.json(categorias)),
  )
  return consultas
}

function renderizar() {
  return renderComApp(
    <Routes>
      <Route path="/notas" element={<NotasPage />} />
      <Route path="/notas/:id" element={<p>Editando a nota</p>} />
    </Routes>,
    '/notas',
  )
}

describe('NotasPage', () => {
  it('listaCartoesComTituloPreviaECategoria', async () => {
    api(
      [resumo(1, { titulo: 'Compras', previa: 'Leite e pão', categoriaId: 5, atualizadoEm: '2026-10-30T14:00:00' })],
      [categoriaNota(5, { nome: 'Casa', cor: 'verde' })],
    )
    renderizar()

    const link = await screen.findByRole('link', { name: /Compras/ })
    expect(link).toHaveAttribute('href', '/notas/1')
    expect(link).toHaveTextContent('Leite e pão')
    expect(link).toHaveTextContent('30/10/2026')
    await waitFor(() => expect(link).toHaveTextContent('Casa'))
  })

  it('filtrarPorCategoriaEnviaCategoriaId', async () => {
    const user = userEvent.setup()
    const consultas = api([resumo(1)], [categoriaNota(7, { nome: 'Trabalho' })])
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Trabalho' }))

    await waitFor(() => expect(consultas.at(-1)?.searchParams.get('categoriaId')).toBe('7'))
  })

  it('semCategoriaEnviaSemCategoriaTrue', async () => {
    const user = userEvent.setup()
    const consultas = api([resumo(1)])
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Sem categoria' }))

    await waitFor(() => expect(consultas.at(-1)?.searchParams.get('semCategoria')).toBe('true'))
  })

  it('buscarEsperaPausaEEnviaBusca', async () => {
    const consultas = api([resumo(1)])
    renderizar()
    await screen.findByText('Nota 1')
    const antes = consultas.length

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar notas' }), { target: { value: 'mercado' } })
    await act(() => vi.advanceTimersByTimeAsync(299))
    expect(consultas.length).toBe(antes)

    await act(() => vi.advanceTimersByTimeAsync(1))
    vi.useRealTimers()
    await waitFor(() => expect(consultas.at(-1)?.searchParams.get('busca')).toBe('mercado'))
  })

  it('novaNotaPostENavegaParaEdicao', async () => {
    const user = userEvent.setup()
    api([])
    let corpo: unknown
    servidor.use(
      http.post('/api/notas', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json({ id: 42, titulo: '', conteudo: { type: 'doc' } }, { status: 201 })
      }),
    )
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Nova nota' }))

    expect(await screen.findByText('Editando a nota')).toBeInTheDocument()
    expect(corpo).toEqual({ categoriaId: null })
  })

  it('novaNotaNaCategoriaFiltradaEnviaCategoriaId', async () => {
    const user = userEvent.setup()
    api([], [categoriaNota(7, { nome: 'Trabalho' })])
    let corpo: unknown
    servidor.use(
      http.post('/api/notas', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json({ id: 43, titulo: '', conteudo: { type: 'doc' } }, { status: 201 })
      }),
    )
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Trabalho' }))
    await user.click(screen.getByRole('button', { name: 'Nova nota' }))

    await screen.findByText('Editando a nota')
    expect(corpo).toEqual({ categoriaId: 7 })
  })

  it('alfineteChamaPatchFixadaEAtualizaALista', async () => {
    const user = userEvent.setup()
    let fixadaId = 1
    api(() => [resumo(1, { fixada: fixadaId === 1 }), resumo(2, { fixada: fixadaId === 2 })])
    let corpo: unknown
    servidor.use(
      http.patch('/api/notas/2/fixada', async ({ request }) => {
        corpo = await request.json()
        fixadaId = 2
        return HttpResponse.json({ id: 2 })
      }),
    )
    renderizar()

    const botoes = await screen.findAllByRole('button', { name: /tela inicial/ })
    expect(botoes[0]).toHaveAccessibleName('Tirar da tela inicial')
    expect(botoes[0]).toHaveAttribute('aria-pressed', 'true')
    await user.click(botoes[1] as HTMLElement)

    await waitFor(() => expect(corpo).toEqual({ fixada: true }))
    await waitFor(() => {
      const atuais = screen.getAllByRole('button', { name: /tela inicial/ })
      expect(atuais[0]).toHaveAccessibleName('Fixar na tela inicial')
      expect(atuais[1]).toHaveAccessibleName('Tirar da tela inicial')
    })
  })

  it('estadoVazio', async () => {
    api([])
    renderizar()
    expect(await screen.findByText('Nenhuma nota ainda. Crie a primeira.')).toBeInTheDocument()
  })

  it('buscaSemResultado', async () => {
    const user = userEvent.setup()
    api((): NotaResumoResponse[] => [])
    renderizar()
    await screen.findByText('Nenhuma nota ainda. Crie a primeira.')

    await user.type(screen.getByRole('searchbox', { name: 'Buscar notas' }), 'xyz')

    expect(await screen.findByText('Nenhuma nota encontrada para esse filtro.')).toBeInTheDocument()
  })

  it('erroDeApi', async () => {
    servidor.use(
      http.get('/api/notas', () => HttpResponse.json({ erro: 'Falha no servidor.' }, { status: 500 })),
      http.get('/api/categorias-nota', () => HttpResponse.json([])),
    )
    renderizar()
    expect(await within(await screen.findByRole('alert')).findByText('Falha no servidor.')).toBeInTheDocument()
  })
})
