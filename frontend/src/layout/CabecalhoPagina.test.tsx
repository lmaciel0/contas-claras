import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router'
import type { ReactNode } from 'react'
import { vi, describe, expect, it } from 'vitest'
import { renderComApp } from '../teste/render'
import { CabecalhoPagina } from './CabecalhoPagina'

function Url() {
  const { pathname, search } = useLocation()
  return <p data-testid="url">{pathname + search}</p>
}

function renderizar(cabecalho: ReactNode, rota = '/financeiro?ano=2026&mes=10') {
  renderComApp(
    <Routes>
      <Route
        path="*"
        element={
          <>
            {cabecalho}
            <Url />
          </>
        }
      />
    </Routes>,
    rota,
  )
}

describe('CabecalhoPagina', () => {
  it('mostra_o_titulo_seletor_e_lancar_com_o_mes_na_url', () => {
    renderizar(<CabecalhoPagina titulo="Orçamento" />)

    const titulo = screen.getByRole('heading', { level: 1, name: 'Orçamento' })
    expect(titulo).toBeInTheDocument()
    expect(screen.getByText('Outubro 2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mês anterior' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mês seguinte' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '+ Lançar' })).toHaveAttribute(
      'href',
      '/lancamentos/novo?ano=2026&mes=10',
    )
  })

  it('trocar_o_mes_muda_ano_e_mes_na_url_e_no_link', async () => {
    renderizar(<CabecalhoPagina titulo="Orçamento" />)

    await userEvent.click(screen.getByRole('button', { name: 'Mês seguinte' }))

    expect(screen.getByTestId('url')).toHaveTextContent('/financeiro?ano=2026&mes=11')
    expect(screen.getByText('Novembro 2026')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '+ Lançar' })).toHaveAttribute(
      'href',
      '/lancamentos/novo?ano=2026&mes=11',
    )
  })

  it('aoLancar_intercepta_o_clique', async () => {
    const aoLancar = vi.fn()
    renderizar(<CabecalhoPagina titulo="Cartões" aoLancar={aoLancar} />)

    await userEvent.click(screen.getByRole('link', { name: '+ Lançar' }))

    expect(aoLancar).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('url')).toHaveTextContent('/financeiro?ano=2026&mes=10')
  })

  it('sem_aoLancar_o_link_navega_para_o_formulario', async () => {
    renderizar(<CabecalhoPagina titulo="Orçamento" />)

    await userEvent.click(screen.getByRole('link', { name: '+ Lançar' }))

    expect(screen.getByTestId('url')).toHaveTextContent('/lancamentos/novo?ano=2026&mes=10')
  })

  it('acaoExtra_aparece_na_mesma_linha', () => {
    renderizar(<CabecalhoPagina titulo="Cartões" acaoExtra={<button type="button">+ Novo cartão</button>} />)

    const acoes = screen.getByTestId('acoes-do-cabecalho')
    expect(within(acoes).getByRole('button', { name: '+ Novo cartão' })).toBeInTheDocument()
    expect(within(acoes).getByRole('link', { name: '+ Lançar' })).toBeInTheDocument()
    expect(within(acoes).getByRole('button', { name: 'Mês seguinte' })).toBeInTheDocument()
  })

  it('titulo_fica_so_para_leitor_de_tela_abaixo_de_md', () => {
    renderizar(<CabecalhoPagina titulo="Orçamento" />)

    const bloco = screen.getByRole('heading', { level: 1 }).parentElement
    expect(bloco).toHaveClass('sr-only', 'md:not-sr-only')
  })

  it('tituloVisivelNoCelular_mantem_o_titulo_visivel_abaixo_de_md', () => {
    renderizar(<CabecalhoPagina titulo="Cartões" tituloVisivelNoCelular />)

    const bloco = screen.getByRole('heading', { level: 1 }).parentElement
    expect(bloco).not.toHaveClass('sr-only')
    expect(bloco).not.toHaveClass('md:not-sr-only')
  })

  it('alvos_de_toque_de_44px', () => {
    renderizar(<CabecalhoPagina titulo="Orçamento" />)

    expect(screen.getByRole('link', { name: '+ Lançar' })).toHaveClass('min-h-11')
    expect(screen.getByRole('button', { name: 'Mês anterior' })).toHaveClass('min-h-11', 'min-w-11')
    expect(screen.getByRole('button', { name: 'Mês seguinte' })).toHaveClass('min-h-11', 'min-w-11')
  })

  it('seletor_de_mes_usa_a_superficie_flutuante', () => {
    renderizar(<CabecalhoPagina titulo="Orçamento" />)

    const seletor = screen.getByRole('button', { name: 'Mês anterior' }).parentElement
    expect(seletor).toHaveClass('superficie', 'rounded-full')
    expect(seletor).not.toHaveClass('shadow-sm')
    expect(seletor?.className).not.toContain('bg-[var(--cor-card)]')
  })
})
