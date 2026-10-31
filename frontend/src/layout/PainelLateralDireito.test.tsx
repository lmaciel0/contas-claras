import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { TarefaResponse, TarefasResponse } from '../api/tipos'
import { comSessao } from '../teste/auth'
import { renderComApp } from '../teste/render'
import { servidor } from '../teste/servidor'
import { PainelLateralDireito } from './PainelLateralDireito'

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
  return renderComApp(<PainelLateralDireito />)
}

describe('PainelLateralDireito', () => {
  it('renderiza seções de calendário, tarefas de hoje e próximas tarefas', async () => {
    responder(
      resposta({
        deHoje: [tarefa(1, { titulo: 'Revisar relatório' })],
        proximas: [tarefa(2, { titulo: 'Planejamento semanal', data: '2026-11-02' })],
      }),
    )

    renderizar()

    // Seção Calendário
    expect(await screen.findByRole('region', { name: /calendário/i })).toBeInTheDocument()
    expect(screen.getByText(/outubro,? 2026/i)).toBeInTheDocument()

    // Seção Minhas Tarefas de Hoje
    const secaoHoje = screen.getByRole('region', { name: /minhas tarefas de hoje/i })
    expect(await within(secaoHoje).findByText('Revisar relatório')).toBeInTheDocument()

    // Seção Próximas Tarefas
    const secaoProximas = screen.getByRole('region', { name: /próximas tarefas/i })
    expect(await within(secaoProximas).findByText('Planejamento semanal')).toBeInTheDocument()
  })

  it('permite alternar conclusão de tarefa de hoje', async () => {
    let chamadaPatch = false
    servidor.use(
      http.get('/api/tarefas', () =>
        HttpResponse.json(
          resposta({
            deHoje: [tarefa(1, { titulo: 'Comprar café', concluida: false })],
          }),
        ),
      ),
      http.patch('/api/tarefas/1/concluida', async ({ request }) => {
        chamadaPatch = true
        const body = (await request.json()) as { concluida: boolean }
        return HttpResponse.json(tarefa(1, { titulo: 'Comprar café', concluida: body.concluida }))
      }),
    )

    const usuario = userEvent.setup()
    renderizar()

    const botaoAlternar = await screen.findByRole('button', { name: /concluir tarefa comprar café/i })
    await usuario.click(botaoAlternar)

    expect(chamadaPatch).toBe(true)
  })

  it('permite navegar entre meses no mini calendário', async () => {
    responder(resposta())
    const usuario = userEvent.setup()
    renderizar()

    expect(await screen.findByText(/outubro,? 2026/i)).toBeInTheDocument()

    const botaoProximo = screen.getByRole('button', { name: /próximo mês no calendário/i })
    await usuario.click(botaoProximo)

    expect(screen.getByText(/novembro,? 2026/i)).toBeInTheDocument()

    const botaoAnterior = screen.getByRole('button', { name: /mês anterior no calendário/i })
    await usuario.click(botaoAnterior)

    expect(screen.getByText(/outubro,? 2026/i)).toBeInTheDocument()
  })
})
