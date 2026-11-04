import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PontoSerie } from '../../api/tipos'
import { TooltipResultado } from './TooltipResultado'
import { serieDoResultado } from './valores'

const semNbsp = (texto: string | null) => (texto ?? '').replace(/ /g, ' ')

const novembro: PontoSerie = {
  mes: 11,
  receitas: '1000.00',
  receitasPrevistas: '400.00',
  despesas: '800.00',
  despesasPrevistas: '200.00',
}

describe('TooltipResultado', () => {
  it('mostra_mes_receitas_despesas_e_resultado_com_pago_e_previsto', () => {
    const [ponto] = serieDoResultado([novembro])
    render(<TooltipResultado ponto={ponto ?? null} />)

    expect(screen.getByText('Novembro')).toBeInTheDocument()
    const receitas = screen.getByText('Receitas').closest('[data-linha]')
    const despesas = screen.getByText('Despesas').closest('[data-linha]')
    const resultado = screen.getByText('Resultado').closest('div')
    expect(semNbsp(receitas?.textContent ?? null)).toContain('R$ 1.000,00')
    expect(semNbsp(receitas?.textContent ?? null)).toContain('pago R$ 600,00')
    expect(semNbsp(receitas?.textContent ?? null)).toContain('previsto R$ 400,00')
    expect(semNbsp(despesas?.textContent ?? null)).toContain('R$ 800,00')
    expect(semNbsp(despesas?.textContent ?? null)).toContain('pago R$ 600,00')
    expect(semNbsp(despesas?.textContent ?? null)).toContain('previsto R$ 200,00')
    expect(semNbsp(resultado?.textContent ?? null)).toContain('R$ 200,00')
  })

  it('resultado_negativo_leva_sinal_menos_e_cor_negativa', () => {
    const [ponto] = serieDoResultado([{ ...novembro, receitas: '100.00', receitasPrevistas: '0.00' }])
    render(<TooltipResultado ponto={ponto ?? null} />)

    const valor = screen.getByText(/^− R\$/)
    expect(semNbsp(valor.textContent)).toBe('− R$ 700,00')
    expect(valor).toHaveClass('text-[var(--cor-negativo-texto)]')
  })

  it('resultado_positivo_usa_a_cor_positiva', () => {
    const [ponto] = serieDoResultado([novembro])
    render(<TooltipResultado ponto={ponto ?? null} />)

    expect(screen.getByTestId('tooltip-resultado-valor')).toHaveClass('text-[var(--cor-positivo-texto)]')
  })

  it('sem_ponto_devolve_null', () => {
    const { container } = render(<TooltipResultado ponto={null} />)

    expect(container).toBeEmptyDOMElement()
  })
})
