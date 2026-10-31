import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { TarefaResponse, TarefasResponse } from '../../api/tipos'
import { comSessao } from '../../teste/auth'
import { renderComApp } from '../../teste/render'
import { servidor } from '../../teste/servidor'
import { TarefasPage } from './TarefasPage'

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
  renderComApp(<TarefasPage />, '/tarefas')
}

const secao = (nome: string) => screen.getByRole('region', { name: nome })

describe('TarefasPage', () => {
  it('agrupaEmAtrasadasHojeEProximasNaOrdem', async () => {
    responder(
      resposta({
        atrasadas: [tarefa(1, { titulo: 'Atrasada A', data: '2026-10-29' })],
        deHoje: [tarefa(2, { titulo: 'De hoje B' })],
        proximas: [tarefa(3, { titulo: 'Proxima C', data: '2026-11-05' })],
      }),
    )
    renderizar()

    await screen.findByText('Atrasada A')
    const titulos = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(titulos).toEqual(['Atrasadas', 'Hoje', 'Próximas', 'Concluídas (0)'])
    expect(within(secao('Atrasadas')).getByText('Atrasada A')).toBeInTheDocument()
    expect(within(secao('Hoje')).getByText('De hoje B')).toBeInTheDocument()
    expect(within(secao('Próximas')).getByText('Proxima C')).toBeInTheDocument()
  })

  it('secaoVaziaNaoAparece', async () => {
    responder(resposta({ deHoje: [tarefa(2, { titulo: 'De hoje B' })] }))
    renderizar()

    await screen.findByText('De hoje B')
    expect(screen.queryByRole('heading', { level: 2, name: 'Atrasadas' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Próximas' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Hoje' })).toBeInTheDocument()
  })

  it('concluidasComecaRecolhidaComContagemTotal', async () => {
    responder(
      resposta({
        deHoje: [tarefa(2, { titulo: 'De hoje B' })],
        concluidas: [
          tarefa(10, { titulo: 'Feita X', concluida: true }),
          tarefa(11, { titulo: 'Feita Y', concluida: true }),
        ],
        totalConcluidas: 73,
      }),
    )
    renderizar()

    const botao = await screen.findByRole('button', { name: /Concluídas \(73\)/ })
    expect(botao).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Feita X')).not.toBeInTheDocument()

    await userEvent.click(botao)

    expect(botao).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Feita X')).toBeInTheDocument()
    expect(screen.getByText('Feita Y')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Reabrir tarefa' })).toHaveLength(2)
  })

  it('adicionarCriaSemData', async () => {
    responder(resposta())
    const corpos: unknown[] = []
    servidor.use(
      http.post('/api/tarefas', async ({ request }) => {
        corpos.push(await request.json())
        return HttpResponse.json(tarefa(9, { titulo: 'Comprar pão', data: null }), { status: 201 })
      }),
    )
    renderizar()

    const campo = await screen.findByRole('textbox', { name: 'Adicionar uma tarefa' })
    await userEvent.type(campo, 'Comprar pão{Enter}')

    await waitFor(() => expect(corpos).toEqual([{ titulo: 'Comprar pão', data: null }]))
    await waitFor(() => expect(campo).toHaveValue(''))
  })

  it('adicionarComTituloVazioNaoEnvia', async () => {
    responder(resposta())
    let chamadas = 0
    servidor.use(
      http.post('/api/tarefas', () => {
        chamadas += 1
        return HttpResponse.json(tarefa(9), { status: 201 })
      }),
    )
    renderizar()

    const campo = await screen.findByRole('textbox', { name: 'Adicionar uma tarefa' })
    await userEvent.type(campo, '   {Enter}')
    await new Promise((r) => setTimeout(r, 50))
    expect(chamadas).toBe(0)
  })

  it('editarTituloEDataEnviaPut', async () => {
    responder(resposta({ deHoje: [tarefa(7, { titulo: 'Ligar para o banco' })] }))
    const chamadas: { corpo: unknown }[] = []
    servidor.use(
      http.put('/api/tarefas/7', async ({ request }) => {
        chamadas.push({ corpo: await request.json() })
        return HttpResponse.json(tarefa(7, { titulo: 'Ligar para a escola', data: '2026-11-03' }))
      }),
    )
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Editar tarefa Ligar para o banco' }))
    const titulo = screen.getByRole('textbox', { name: 'Título da tarefa' })
    await userEvent.clear(titulo)
    await userEvent.type(titulo, 'Ligar para a escola')
    fireEvent.change(screen.getByLabelText('Data da tarefa'), { target: { value: '2026-11-03' } })
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(chamadas).toEqual([{ corpo: { titulo: 'Ligar para a escola', data: '2026-11-03' } }]))
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Título da tarefa' })).not.toBeInTheDocument())
  })

  it('enterNoTituloSalvaAEdicao', async () => {
    responder(resposta({ deHoje: [tarefa(7, { titulo: 'Ligar' })] }))
    const corpos: unknown[] = []
    servidor.use(
      http.put('/api/tarefas/7', async ({ request }) => {
        corpos.push(await request.json())
        return HttpResponse.json(tarefa(7, { titulo: 'Ligar agora' }))
      }),
    )
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Editar tarefa Ligar' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Título da tarefa' }), ' agora{Enter}')

    await waitFor(() => expect(corpos).toEqual([{ titulo: 'Ligar agora', data: HOJE }]))
  })

  it('removerDataNaEdicaoEnviaDataNula', async () => {
    responder(resposta({ deHoje: [tarefa(7, { titulo: 'Ligar' })] }))
    const corpos: unknown[] = []
    servidor.use(
      http.put('/api/tarefas/7', async ({ request }) => {
        corpos.push(await request.json())
        return HttpResponse.json(tarefa(7, { data: null }))
      }),
    )
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Editar tarefa Ligar' }))
    fireEvent.change(screen.getByLabelText('Data da tarefa'), { target: { value: '' } })
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(corpos).toEqual([{ titulo: 'Ligar', data: null }]))
  })

  it('escCancelaEdicaoSemEnviar', async () => {
    responder(resposta({ deHoje: [tarefa(7, { titulo: 'Ligar' })] }))
    let chamadas = 0
    servidor.use(
      http.put('/api/tarefas/7', () => {
        chamadas += 1
        return HttpResponse.json(tarefa(7))
      }),
    )
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Editar tarefa Ligar' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Título da tarefa' }), ' mudou{Escape}')

    expect(screen.queryByRole('textbox', { name: 'Título da tarefa' })).not.toBeInTheDocument()
    expect(screen.getByText('Ligar')).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 50))
    expect(chamadas).toBe(0)
  })

  it('excluirPedeConfirmacaoEEnviaDelete', async () => {
    responder(resposta({ deHoje: [tarefa(7, { titulo: 'Ligar' })] }))
    let chamadas = 0
    servidor.use(
      http.delete('/api/tarefas/7', () => {
        chamadas += 1
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Excluir tarefa Ligar' }))
    expect(chamadas).toBe(0)
    const grupo = screen.getByRole('group', { name: 'Confirmar exclusão' })
    expect(within(grupo).getByText('Excluir a tarefa Ligar?')).toBeInTheDocument()

    await userEvent.click(within(grupo).getByRole('button', { name: 'Sim, excluir' }))

    await waitFor(() => expect(chamadas).toBe(1))
  })

  it('cancelarConfirmacaoNaoExclui', async () => {
    responder(resposta({ deHoje: [tarefa(7, { titulo: 'Ligar' })] }))
    let chamadas = 0
    servidor.use(
      http.delete('/api/tarefas/7', () => {
        chamadas += 1
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Excluir tarefa Ligar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('group', { name: 'Confirmar exclusão' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Excluir tarefa Ligar' })).toBeInTheDocument()
    expect(chamadas).toBe(0)
  })

  it('concluirEReabrirEnviamPatch', async () => {
    responder(
      resposta({
        deHoje: [tarefa(7, { titulo: 'Aberta' })],
        concluidas: [tarefa(8, { titulo: 'Feita', concluida: true })],
        totalConcluidas: 1,
      }),
    )
    const corpos: Record<string, unknown> = {}
    servidor.use(
      http.patch('/api/tarefas/:id/concluida', async ({ request, params }) => {
        corpos[String(params.id)] = await request.json()
        return HttpResponse.json(tarefa(Number(params.id)))
      }),
    )
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Marcar como feita' }))
    await userEvent.click(screen.getByRole('button', { name: /Concluídas \(1\)/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Reabrir tarefa' }))

    await waitFor(() => expect(corpos).toEqual({ '7': { concluida: true }, '8': { concluida: false } }))
  })

  it('tarefaSemDataMostraSemDataSoEmProximas', async () => {
    responder(
      resposta({
        deHoje: [tarefa(1, { titulo: 'De hoje' })],
        proximas: [tarefa(2, { titulo: 'Solta', data: null })],
      }),
    )
    renderizar()

    await screen.findByText('Solta')
    expect(within(secao('Próximas')).getByText('sem data')).toBeInTheDocument()
    expect(within(secao('Hoje')).queryByText('sem data')).not.toBeInTheDocument()
  })

  it('estadoVazioMostraConviteMasMantemConcluidas', async () => {
    responder(resposta())
    renderizar()

    expect(await screen.findByText(/nenhuma tarefa por aqui/i)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Adicionar uma tarefa' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Concluídas \(0\)/ })).toBeInTheDocument()
  })

  it('erroNaApiMostraMensagemETentarDeNovo', async () => {
    servidor.use(http.get('/api/tarefas', () => HttpResponse.json({ erro: 'Falha nas tarefas.' }, { status: 500 })))
    renderizar()

    const alerta = await screen.findByRole('alert')
    expect(within(alerta).getByText('Falha nas tarefas.')).toBeInTheDocument()

    responder(resposta({ deHoje: [tarefa(2, { titulo: 'Voltou' })] }))
    await userEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByText('Voltou')).toBeInTheDocument()
  })

  it('carregandoMostraStatus', () => {
    servidor.use(http.get('/api/tarefas', () => new Promise(() => {})))
    renderizar()

    expect(screen.getByText(/carregando as tarefas/i)).toBeInTheDocument()
  })
})
