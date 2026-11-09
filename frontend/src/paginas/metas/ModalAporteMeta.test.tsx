import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { MetaResponse } from '../../api/tipos'
import { ModalAporteMeta } from './ModalAporteMeta'

const metaExemplo: MetaResponse = {
  id: 1,
  titulo: 'Reserva de Emergência',
  valorAlvo: '10000.00',
  valorGuardado: '4000.00',
  prazo: '2027-12-31',
  presetVisual: 'reserva',
  icone: 'shield',
  corGradienteInicio: '#047857',
  corGradienteFim: '#10b981',
  fotoUrl: null,
  ordem: 0,
  percentualConcluido: '0.4000',
  valorRestante: '6000.00',
  valorMensalSugerido: '428.57',
  mesesRestantes: 14,
  concluida: false,
}

describe('ModalAporteMeta', () => {
  it('renderiza corretamente no modo GUARDAR e permite envio', async () => {
    const user = userEvent.setup()
    const aoConfirmar = vi.fn()
    const aoFechar = vi.fn()

    render(
      <ModalAporteMeta
        aberto={true}
        meta={metaExemplo}
        tipo="GUARDAR"
        aoConfirmar={aoConfirmar}
        aoFechar={aoFechar}
      />,
    )

    expect(screen.getByRole('heading', { name: /guardar dinheiro/i })).toBeInTheDocument()
    expect(screen.getByText(/Reserva de Emergência/i)).toBeInTheDocument()

    const input = screen.getByLabelText(/valor/i)
    await user.type(input, '150,00')

    const btnConfirmar = screen.getByRole('button', { name: /confirmar aporte/i })
    await user.click(btnConfirmar)

    expect(aoConfirmar).toHaveBeenCalledWith('150.00')
  })

  it('renderiza no modo RESGATAR e valida valor máximo', async () => {
    const user = userEvent.setup()
    const aoConfirmar = vi.fn()
    const aoFechar = vi.fn()

    render(
      <ModalAporteMeta
        aberto={true}
        meta={metaExemplo}
        tipo="RESGATAR"
        aoConfirmar={aoConfirmar}
        aoFechar={aoFechar}
      />,
    )

    expect(screen.getByRole('heading', { name: /resgatar dinheiro/i })).toBeInTheDocument()
    expect(screen.getByText(/saldo disponível:/i)).toBeInTheDocument()
    expect(screen.getByText(/4\.000,00/)).toBeInTheDocument()

    const input = screen.getByLabelText(/valor/i)
    await user.type(input, '5000,00')

    const btnConfirmar = screen.getByRole('button', { name: /confirmar resgate/i })
    await user.click(btnConfirmar)

    expect(aoConfirmar).not.toHaveBeenCalled()
    expect(screen.getByText(/valor excede o saldo guardado/i)).toBeInTheDocument()
  })

  it('permite usar pílulas rápidas de valor', async () => {
    const user = userEvent.setup()
    const aoConfirmar = vi.fn()
    const aoFechar = vi.fn()

    render(
      <ModalAporteMeta
        aberto={true}
        meta={metaExemplo}
        tipo="GUARDAR"
        aoConfirmar={aoConfirmar}
        aoFechar={aoFechar}
      />,
    )

    const pilula = screen.getByRole('button', { name: /\+ R\$\s*100/i })
    await user.click(pilula)

    const btnConfirmar = screen.getByRole('button', { name: /confirmar aporte/i })
    await user.click(btnConfirmar)

    expect(aoConfirmar).toHaveBeenCalledWith('100.00')
  })
})
