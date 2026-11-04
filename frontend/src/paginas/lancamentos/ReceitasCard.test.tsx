import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { LancamentoResponse } from '../../api/tipos'
import { lancamento } from '../../teste/lancamentos'
import { renderComApp } from '../../teste/render'
import { ReceitasCard } from './ReceitasCard'

const receita = (parcial: Partial<LancamentoResponse> & Pick<LancamentoResponse, 'id' | 'itemId' | 'itemNome'>) =>
  lancamento({ categoriaId: 1, categoriaNome: 'Receitas', tipo: 'RECEITA', ...parcial })

const salario = (status: 'PAGO' | 'PREVISTO' = 'PAGO') =>
  receita({ id: 1, itemId: 10, itemNome: 'Salário', valor: '5500.00', status, vencimento: '2026-10-01' })
const camila = (status: 'PAGO' | 'PREVISTO' = 'PAGO') =>
  receita({ id: 2, itemId: 11, itemNome: 'Camila', valor: '742.00', status })

function renderizar(lancamentos: LancamentoResponse[], aoMudarStatus = vi.fn()) {
  renderComApp(
    <ReceitasCard lancamentos={lancamentos} busca="?ano=2026&mes=10" idMudandoStatus={null} aoMudarStatus={aoMudarStatus} />,
  )
  return { aoMudarStatus, regiao: screen.getByRole('region', { name: 'Receitas' }) }
}

describe('ReceitasCard', () => {
  it('tudo_recebido_mostra_total_barra_cheia_e_linhas_recebidas', () => {
    const { regiao } = renderizar([salario(), camila()])

    expect(within(regiao).getByText('Recebido no mês')).toBeInTheDocument()
    expect(within(regiao).getByText('R$ 6.242,00', { selector: '[data-total]' })).toBeInTheDocument()
    expect(within(regiao).getByText('100% do previsto · a receber R$ 0,00')).toBeInTheDocument()
    expect(within(regiao).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    expect(within(regiao).getByRole('button', { name: /Salário.*Recebido/ })).toBeInTheDocument()
    expect(within(regiao).getByRole('button', { name: /Camila.*Recebido/ })).toBeInTheDocument()
  })

  it('com_parte_a_receber_mostra_percentual_e_alterna_o_status', async () => {
    const { regiao, aoMudarStatus } = renderizar([salario(), camila('PREVISTO')])

    expect(within(regiao).getByText('88% do previsto · a receber R$ 742,00')).toBeInTheDocument()
    expect(within(regiao).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '88')

    await userEvent.click(within(regiao).getByRole('button', { name: /Camila.*A receber/ }))
    expect(aoMudarStatus).toHaveBeenCalledWith(2, 'PAGO')

    await userEvent.click(within(regiao).getByRole('button', { name: /Salário.*Recebido/ }))
    expect(aoMudarStatus).toHaveBeenCalledWith(1, 'PREVISTO')
  })

  it('a_linha_abre_o_lancamento_mantendo_o_mes', () => {
    renderizar([salario()])

    expect(screen.getByRole('link', { name: /Salário/ })).toHaveAttribute('href', '/lancamentos/1?ano=2026&mes=10')
  })

  it('lista_vazia_avisa_e_nao_mostra_barra', () => {
    renderizar([])

    expect(screen.getByText('Nenhuma receita neste mês')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).toBeNull()
  })

  it('desliga_o_botao_do_lancamento_que_esta_mudando', () => {
    renderComApp(
      <ReceitasCard lancamentos={[salario(), camila()]} busca="" idMudandoStatus={2} aoMudarStatus={vi.fn()} />,
    )

    expect(screen.getByRole('button', { name: /Camila.*Recebido/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Salário.*Recebido/ })).toBeEnabled()
  })
})
