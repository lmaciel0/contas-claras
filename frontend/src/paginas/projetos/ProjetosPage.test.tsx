import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { servidor } from '../../teste/servidor'
import { ProjetosPage } from './ProjetosPage'
import type { Projeto } from './tipos'

const mockProjeto: Projeto = {
  id: 1,
  titulo: 'Projeto Alpha',
  descricao: 'Primeiro projeto',
  categoria: 'Engenharia',
  estagio: 'A_FAZER',
  prioridade: 'ALTA',
  cor: 'azul',
  ordem: 0,
  prazo: '2026-12-01',
  porcentagemProgresso: 0,
  totalSubtarefas: 0,
  subtarefasConcluidas: 0,
  subtarefas: [],
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

describe('ProjetosPage', () => {
  it('nao_mostra_subtitulo_no_cabecalho', async () => {
    servidor.use(http.get('/api/projetos', () => HttpResponse.json([mockProjeto])))
    const { wrapper } = montar()

    render(<ProjetosPage />, { wrapper })

    await screen.findByRole('heading', { name: 'Projetos' })
    expect(screen.queryByText(/Acompanhe o andamento/)).not.toBeInTheDocument()
  })

  it('renderiza cabeçalho, abas e 4 colunas kanban', async () => {
    servidor.use(http.get('/api/projetos', () => HttpResponse.json([mockProjeto])))
    const { wrapper } = montar()

    render(<ProjetosPage />, { wrapper })

    expect(await screen.findByRole('heading', { name: 'Projetos' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /quadro/i })).toBeInTheDocument()
    expect(screen.getByText(/linha do tempo/i)).toBeInTheDocument()

    // 4 colunas fixas
    expect(await screen.findByRole('heading', { name: 'A Fazer' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Em Andamento' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Em Revisão' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Concluído' })).toBeInTheDocument()

    expect(await screen.findByText('Projeto Alpha')).toBeInTheDocument()
  })

  it('abre o modal ao clicar no botão + Novo projeto', async () => {
    servidor.use(http.get('/api/projetos', () => HttpResponse.json([])))
    const { wrapper } = montar()

    render(<ProjetosPage />, { wrapper })

    const botaoNovo = await screen.findByRole('button', { name: /\+ novo projeto/i })
    fireEvent.click(botaoNovo)

    expect(await screen.findByText('Novo Projeto')).toBeInTheDocument()
  })

  it('permite filtrar por busca de texto', async () => {
    let urlRequisicao = ''
    servidor.use(
      http.get('/api/projetos', ({ request }) => {
        urlRequisicao = request.url
        return HttpResponse.json([mockProjeto])
      }),
    )
    const { wrapper } = montar()

    render(<ProjetosPage />, { wrapper })

    const inputBusca = await screen.findByPlaceholderText(/buscar projetos/i)
    fireEvent.change(inputBusca, { target: { value: 'Alpha' } })

    await waitFor(() => {
      expect(urlRequisicao).toContain('busca=Alpha')
    })
  })

  it('permite alternar para a visão lista e renderiza os projetos em formato de tabela', async () => {
    servidor.use(http.get('/api/projetos', () => HttpResponse.json([mockProjeto])))
    const { wrapper } = montar()

    render(<ProjetosPage />, { wrapper })

    expect(await screen.findByRole('heading', { name: 'Projetos' })).toBeInTheDocument()

    const tabLista = screen.getByRole('tab', { name: /lista/i })
    fireEvent.click(tabLista)

    expect(tabLista).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByRole('heading', { name: 'A Fazer' })).toBeInTheDocument()
    expect(screen.getByText('Projeto Alpha')).toBeInTheDocument()
  })

  it('permite alternar para a visão linha do tempo e renderiza a timeline', async () => {
    servidor.use(http.get('/api/projetos', () => HttpResponse.json([mockProjeto])))
    const { wrapper } = montar()

    render(<ProjetosPage />, { wrapper })

    expect(await screen.findByRole('heading', { name: 'Projetos' })).toBeInTheDocument()

    const tabTimeline = screen.getByRole('tab', { name: /linha do tempo/i })
    fireEvent.click(tabTimeline)

    expect(tabTimeline).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('region', { name: /linha do tempo de projetos/i })).toBeInTheDocument()
    expect(screen.getAllByText('Projeto Alpha').length).toBeGreaterThanOrEqual(1)
  })
})
