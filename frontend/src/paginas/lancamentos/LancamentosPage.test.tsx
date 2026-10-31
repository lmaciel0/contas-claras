import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { LancamentoResponse, StatusLancamento } from '../../api/tipos'
import { renderComApp } from '../../teste/render'
import { lancamento, responderLancamentos } from '../../teste/lancamentos'
import { servidor } from '../../teste/servidor'
import { LancamentosPage } from './LancamentosPage'

// Ordem da API: por ordem da categoria e nome do item. Valores fictícios.
const doMes = (): LancamentoResponse[] => [
  lancamento({
    id: 1,
    itemId: 20,
    itemNome: 'Luz',
    valor: '180.40',
    vencimento: '2026-10-10',
  }),
  lancamento({
    id: 2,
    itemId: 21,
    itemNome: 'Condomínio',
    valor: '1000.00',
    status: 'PAGO',
    vencimento: '2026-10-31',
  }),
  lancamento({
    id: 3,
    itemId: 30,
    itemNome: 'Cinema',
    categoriaId: 3,
    categoriaNome: 'Lazer',
    valor: '50.00',
  }),
  lancamento({
    id: 4,
    itemId: 10,
    itemNome: 'Salário',
    categoriaId: 1,
    categoriaNome: 'Receitas',
    tipo: 'RECEITA',
    valor: '5000.00',
    status: 'PAGO',
    vencimento: '2026-10-05',
  }),
]

function renderizar(rota = '/lancamentos?ano=2026&mes=10') {
  return renderComApp(
    <Routes>
      <Route path="/lancamentos" element={<LancamentosPage />} />
    </Routes>,
    rota,
  )
}

describe('LancamentosPage', () => {
  it('lista_agrupa_por_categoria_com_total', async () => {
    const consultas = responderLancamentos(doMes)
    renderizar()

    const receitas = await screen.findByRole('region', { name: 'Receitas' })
    const moradia = screen.getByRole('region', { name: 'Moradia' })
    const lazer = screen.getByRole('region', { name: 'Lazer' })

    // Receitas primeiro; o resto na ordem da API.
    const grupos = screen.getAllByRole('region').map((grupo) => grupo.getAttribute('aria-label') ?? grupo.textContent)
    expect(grupos.slice(0, 3)).toEqual(['Receitas', 'Moradia', 'Lazer'])
    expect(consultas).toEqual(['?ano=2026&mes=10'])

    expect(within(receitas).getByText('R$ 5.000,00', { selector: '[data-total]' })).toBeInTheDocument()
    expect(within(moradia).getByText('R$ 1.180,40', { selector: '[data-total]' })).toBeInTheDocument()
    expect(within(lazer).getByText('R$ 50,00', { selector: '[data-total]' })).toBeInTheDocument()

    const [luz, condominio] = within(moradia).getAllByRole('listitem')
    expect(luz).toHaveTextContent('Luz')
    expect(luz).toHaveTextContent('10/10')
    expect(luz).toHaveTextContent('R$ 180,40')
    expect(within(luz!).getByRole('button', { name: /Previsto/ })).toBeInTheDocument()
    expect(condominio).toHaveTextContent('31/10')
    expect(within(condominio!).getByRole('button', { name: /Pago/ })).toBeInTheDocument()
  })

  it('tocar_na_linha_leva_para_o_lancamento_mantendo_o_mes', async () => {
    responderLancamentos(doMes)
    renderizar()

    const luz = await screen.findByRole('link', { name: /Luz/ })

    expect(luz).toHaveAttribute('href', '/lancamentos/1?ano=2026&mes=10')
  })

  it('clicar_no_chip_alterna_status_via_patch', async () => {
    let status: StatusLancamento = 'PREVISTO'
    responderLancamentos(() => [lancamento({ id: 1, itemId: 20, itemNome: 'Luz', valor: '180.40', status })])
    const enviados: Array<{ id: string; corpo: unknown }> = []
    servidor.use(
      http.patch('/api/lancamentos/:id/status', async ({ request, params }) => {
        enviados.push({ id: String(params.id), corpo: await request.json() })
        status = 'PAGO'
        return HttpResponse.json(lancamento({ id: 1, itemId: 20, itemNome: 'Luz', status }))
      }),
    )
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: /Luz.*Previsto/ }))

    await waitFor(() => expect(screen.getByRole('button', { name: /Luz.*Pago/ })).toHaveTextContent('Pago'))
    expect(enviados).toEqual([{ id: '1', corpo: { status: 'PAGO' } }])
  })

  it('chip_pago_volta_para_previsto', async () => {
    let status: StatusLancamento = 'PAGO'
    responderLancamentos(() => [lancamento({ id: 1, itemId: 20, itemNome: 'Luz', status })])
    const enviados: unknown[] = []
    servidor.use(
      http.patch('/api/lancamentos/:id/status', async ({ request }) => {
        enviados.push(await request.json())
        status = 'PREVISTO'
        return HttpResponse.json(lancamento({ id: 1, itemId: 20, itemNome: 'Luz', status }))
      }),
    )
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: /Luz.*Pago/ }))

    await waitFor(() => expect(screen.getByRole('button', { name: /Luz.*Previsto/ })).toBeInTheDocument())
    expect(enviados).toEqual([{ status: 'PREVISTO' }])
  })

  it('invalida_o_resumo_e_o_relatorio_depois_de_mudar_o_status', async () => {
    responderLancamentos(() => [lancamento({ id: 1, itemId: 20, itemNome: 'Luz' })])
    servidor.use(
      http.patch('/api/lancamentos/:id/status', () =>
        HttpResponse.json(lancamento({ id: 1, itemId: 20, itemNome: 'Luz', status: 'PAGO' })),
      ),
    )
    const { queryClient } = renderizar()
    queryClient.setQueryData(['resumo', 2026, 10], { sobra: '0.00' })
    queryClient.setQueryData(['relatorio', 2026], { categorias: [] })

    await userEvent.click(await screen.findByRole('button', { name: /Luz.*Previsto/ }))

    await waitFor(() => expect(queryClient.getQueryState(['resumo', 2026, 10])?.isInvalidated).toBe(true))
    expect(queryClient.getQueryState(['relatorio', 2026])?.isInvalidated).toBe(true)
  })

  it('mes_sem_lancamentos_avisa_e_nao_quebra', async () => {
    responderLancamentos(() => [])
    renderizar()

    expect(await screen.findByText('Nenhum lançamento neste mês.')).toBeInTheDocument()
  })

  it('mostra_erro_da_api_com_botao_de_tentar_de_novo', async () => {
    servidor.use(http.get('/api/lancamentos', () => HttpResponse.json({ erro: 'Falhou.' }, { status: 500 })))
    renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Falhou.')
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })
})
