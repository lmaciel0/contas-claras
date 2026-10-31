import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { renderComApp } from '../teste/render'
import { FaixaFinanceira } from './FaixaFinanceira'

function Url() {
  const { pathname, search } = useLocation()
  return <p data-testid="url">{pathname + search}</p>
}

function renderizar(rota = '/financeiro?ano=2026&mes=10') {
  renderComApp(
    <Routes>
      <Route
        path="*"
        element={
          <>
            <FaixaFinanceira />
            <Url />
          </>
        }
      />
    </Routes>,
    rota,
  )
}

describe('FaixaFinanceira', () => {
  it('mostra_o_seletor_de_mes_e_o_link_lancar_com_o_mes_na_url', () => {
    renderizar()

    expect(screen.getByText('Outubro 2026')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '+ Lançar' })).toHaveAttribute(
      'href',
      '/lancamentos/novo?ano=2026&mes=10',
    )
  })

  it('trocar_o_mes_muda_ano_e_mes_na_url_e_no_link', async () => {
    renderizar()

    await userEvent.click(screen.getByRole('button', { name: 'Mês seguinte' }))

    expect(screen.getByTestId('url')).toHaveTextContent('/financeiro?ano=2026&mes=11')
    expect(screen.getByText('Novembro 2026')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '+ Lançar' })).toHaveAttribute(
      'href',
      '/lancamentos/novo?ano=2026&mes=11',
    )
  })

  it('o_link_lancar_e_o_seletor_tem_alvo_de_toque_de_pelo_menos_44px', () => {
    renderizar()

    expect(screen.getByRole('link', { name: '+ Lançar' })).toHaveClass('min-h-11')
    expect(screen.getByRole('button', { name: 'Mês anterior' })).toHaveClass('min-h-11', 'min-w-11')
    expect(screen.getByRole('button', { name: 'Mês seguinte' })).toHaveClass('min-h-11', 'min-w-11')
  })
})
