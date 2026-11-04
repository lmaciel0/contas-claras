import { screen, within } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { CartaoResponse } from '../../api/tipos'
import { renderComApp } from '../../teste/render'
import { ResumoCartoes } from './ResumoCartoes'

function cartao(sobrescritas: Partial<CartaoResponse>): CartaoResponse {
  return {
    itemId: 1,
    nome: 'Aurora',
    diaVencimento: 10,
    fatura: '2558.05',
    limite: '3000.00',
    uso: '0.8527',
    faixa: 'AMARELO',
    titular: null,
    ...sobrescritas,
  }
}

const aurora = cartao({})
const inter = cartao({ itemId: 2, nome: 'Inter', fatura: '372.00', limite: '2000.00', uso: '0.1860', faixa: 'VERDE' })

function renderizar(cartoes: CartaoResponse[], busca = '?ano=2026&mes=10') {
  renderComApp(
    <Routes>
      <Route path="/" element={<ResumoCartoes cartoes={cartoes} busca={busca} />} />
    </Routes>,
  )
}

describe('ResumoCartoes', () => {
  it('lista_cartoes_com_fatura_limite_e_barra', () => {
    renderizar([aurora, inter])

    const regiao = screen.getByRole('region', { name: 'Cartões' })
    expect(within(regiao).getByText('Aurora')).toBeInTheDocument()
    expect(within(regiao).getByText('Inter')).toBeInTheDocument()
    expect(within(regiao).getByText('R$ 2.558,05')).toBeInTheDocument()
    expect(within(regiao).getByText('de R$ 3.000,00')).toBeInTheDocument()
    const barras = within(regiao).getAllByRole('meter')
    expect(barras.map((barra) => barra.getAttribute('aria-valuenow'))).toEqual(['85', '19'])
    expect(within(regiao).getByText('85%')).toBeInTheDocument()
    expect(within(regiao).getByText('19%')).toBeInTheDocument()
  })

  it('cartao_sem_limite_mostra_so_a_fatura', () => {
    renderizar([cartao({ limite: null, uso: null, faixa: 'SEM_LIMITE' })])

    const regiao = screen.getByRole('region', { name: 'Cartões' })
    expect(within(regiao).getByText('R$ 2.558,05')).toBeInTheDocument()
    expect(within(regiao).queryByRole('meter')).not.toBeInTheDocument()
    expect(within(regiao).queryByText(/^de R\$/)).not.toBeInTheDocument()
  })

  it('uso_acima_de_100_limita_a_barra_mas_mostra_o_percentual_real', () => {
    renderizar([cartao({ uso: '1.2500', faixa: 'VERMELHO' })])

    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByText('125%')).toBeInTheDocument()
  })

  it('link_ver_cartoes_preserva_o_mes', () => {
    renderizar([aurora], '?ano=2026&mes=10')

    expect(screen.getByRole('link', { name: 'Ver cartões' })).toHaveAttribute('href', '/cartoes?ano=2026&mes=10')
  })

  it('sem_cartoes_nao_renderiza_nada', () => {
    renderizar([])

    expect(screen.queryByRole('region', { name: 'Cartões' })).not.toBeInTheDocument()
  })
})
