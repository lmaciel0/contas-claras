import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { TarefaResponse, TarefasResponse } from '../../api/tipos'
import { AuthProvider } from '../../auth/AuthProvider'
import { RotaProtegida } from '../../auth/RotaProtegida'
import { comSessao } from '../../teste/auth'
import { renderComApp } from '../../teste/render'
import { servidor } from '../../teste/servidor'
import { PainelPage } from './PainelPage'
import { TarefasDeHoje } from './TarefasDeHoje'

const HOJE = '2026-10-31'

const tarefa = (id: number, parcial: Partial<TarefaResponse> = {}): TarefaResponse => ({
  id,
  titulo: `Tarefa ${id}`,
  data: HOJE,
  concluida: false,
  concluidaEm: null,
  ...parcial,
})

const resposta = (parcial: Partial<TarefasResponse> = {}): TarefasResponse => ({
  hoje: HOJE,
  atrasadas: [],
  deHoje: [],
  proximas: [],
  concluidasHoje: [],
  concluidas: [],
  totalConcluidas: 0,
  ...parcial,
})

function responder(corpo: TarefasResponse) {
  servidor.use(http.get('/api/tarefas', () => HttpResponse.json(corpo)))
}

function renderizar() {
  comSessao()
  renderComApp(<TarefasDeHoje />)
}

describe('TarefasDeHoje', () => {
  it('mostraAtrasadasEDeHojeSeguidasDasConcluidasHoje', async () => {
    responder(
      resposta({
        atrasadas: [tarefa(1, { titulo: 'Atrasada A', data: '2026-10-29' })],
        deHoje: [tarefa(2, { titulo: 'De hoje B' })],
        concluidasHoje: [tarefa(3, { titulo: 'Feita C', concluida: true })],
      }),
    )
    renderizar()

    const itens = await screen.findAllByRole('listitem')
    expect(itens.map((li) => li.textContent)).toEqual([
      expect.stringContaining('Atrasada A'),
      expect.stringContaining('De hoje B'),
      expect.stringContaining('Feita C'),
    ])
  })

  it('contadorMostraXDeYFeitas', async () => {
    responder(
      resposta({
        atrasadas: [tarefa(1, { data: '2026-10-29' })],
        deHoje: [tarefa(2)],
        concluidasHoje: [tarefa(3, { concluida: true }), tarefa(4, { concluida: true })],
      }),
    )
    renderizar()

    expect(await screen.findByText('2 de 4 feitas')).toBeInTheDocument()
  })

  it('limitaACincoItensEMostraMaisN', async () => {
    responder(resposta({ deHoje: Array.from({ length: 8 }, (_, i) => tarefa(i + 1)) }))
    renderizar()

    expect(await screen.findAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByRole('link', { name: '+3' })).toHaveAttribute('href', '/tarefas')
  })

  it('cincoItensExatosNaoMostramMais', async () => {
    responder(resposta({ deHoje: Array.from({ length: 5 }, (_, i) => tarefa(i + 1)) }))
    renderizar()

    expect(await screen.findAllByRole('listitem')).toHaveLength(5)
    expect(screen.queryByRole('link', { name: /^\+/ })).not.toBeInTheDocument()
  })

  it('clicarNoCirculoEnviaPatchConcluida', async () => {
    responder(resposta({ deHoje: [tarefa(7, { titulo: 'Ligar para o banco' })] }))
    const corpos: unknown[] = []
    servidor.use(
      http.patch('/api/tarefas/7/concluida', async ({ request }) => {
        corpos.push(await request.json())
        return HttpResponse.json(tarefa(7, { concluida: true }))
      }),
    )
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Marcar como feita' }))

    await waitFor(() => expect(corpos).toEqual([{ concluida: true }]))
  })

  it('adicionarComEnterCriaComDataDeHoje', async () => {
    responder(resposta())
    const corpos: unknown[] = []
    servidor.use(
      http.post('/api/tarefas', async ({ request }) => {
        corpos.push(await request.json())
        return HttpResponse.json(tarefa(9, { titulo: 'Comprar pão' }), { status: 201 })
      }),
    )
    renderizar()

    const campo = await screen.findByRole('textbox', { name: 'Nova tarefa' })
    await userEvent.type(campo, 'Comprar pão{Enter}')

    await waitFor(() => expect(corpos).toEqual([{ titulo: 'Comprar pão', data: HOJE }]))
    await waitFor(() => expect(campo).toHaveValue(''))
  })

  it('adicionarComOBotaoCriaETambemLimpaOCampo', async () => {
    responder(resposta())
    const corpos: unknown[] = []
    servidor.use(
      http.post('/api/tarefas', async ({ request }) => {
        corpos.push(await request.json())
        return HttpResponse.json(tarefa(9), { status: 201 })
      }),
    )
    renderizar()

    const campo = await screen.findByRole('textbox', { name: 'Nova tarefa' })
    await userEvent.type(campo, 'Pagar luz')
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }))

    await waitFor(() => expect(corpos).toEqual([{ titulo: 'Pagar luz', data: HOJE }]))
    await waitFor(() => expect(campo).toHaveValue(''))
  })

  it('tituloVazioNaoEnvia', async () => {
    responder(resposta())
    let chamadas = 0
    servidor.use(
      http.post('/api/tarefas', () => {
        chamadas += 1
        return HttpResponse.json(tarefa(9), { status: 201 })
      }),
    )
    renderizar()

    const campo = await screen.findByRole('textbox', { name: 'Nova tarefa' })
    await userEvent.type(campo, '   {Enter}')
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }))

    // Dá tempo de uma requisição indevida chegar ao servidor.
    await new Promise((r) => setTimeout(r, 50))
    expect(chamadas).toBe(0)
  })

  it('estadoVazioMostraConvite', async () => {
    responder(resposta())
    renderizar()

    expect(await screen.findByText(/nada para hoje/i)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Nova tarefa' })).toBeInTheDocument()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('linkVerTodasApontaParaTarefas', async () => {
    responder(resposta())
    renderizar()

    expect(await screen.findByRole('link', { name: 'Ver todas' })).toHaveAttribute('href', '/tarefas')
    expect(screen.getByRole('heading', { level: 2, name: 'Hoje' })).toBeInTheDocument()
  })

  it('erroNaApiMostraMensagemNoCardENaoQuebraOPainel', async () => {
    comSessao()
    servidor.use(http.get('/api/tarefas', () => HttpResponse.json({ erro: 'Falha nas tarefas.' }, { status: 500 })))
    renderComApp(
      <AuthProvider>
        <Routes>
          <Route element={<RotaProtegida />}>
            <Route path="/" element={<PainelPage />} />
          </Route>
        </Routes>
      </AuthProvider>,
    )

    const alerta = await screen.findByRole('alert')
    expect(within(alerta).getByText('Falha nas tarefas.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: /^(Bom dia|Boa tarde|Boa noite)/ })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 2, name: 'Finanças do mês' })).toBeInTheDocument()
  })
})
