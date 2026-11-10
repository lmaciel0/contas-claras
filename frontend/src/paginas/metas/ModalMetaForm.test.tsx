import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { MetaResponse } from '../../api/tipos'
import { ModalMetaForm } from './ModalMetaForm'

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

describe('ModalMetaForm', () => {
  it('renderiza campos vazios para criação e valida campos obrigatórios', async () => {
    const user = userEvent.setup()
    const aoSalvar = vi.fn()
    const aoFechar = vi.fn()

    render(
      <ModalMetaForm
        aberto={true}
        meta={null}
        aoSalvar={aoSalvar}
        aoFechar={aoFechar}
      />,
    )

    expect(screen.getByRole('heading', { name: /nova meta ou caixinha/i })).toBeInTheDocument()

    const inputTitulo = screen.getByLabelText(/título/i)
    const inputAlvo = screen.getByLabelText(/valor alvo/i)

    await user.type(inputTitulo, 'Carro Novo')
    await user.type(inputAlvo, '45000,00')

    const btnSalvar = screen.getByRole('button', { name: /salvar meta/i })
    await user.click(btnSalvar)

    expect(aoSalvar).toHaveBeenCalledWith(
      expect.objectContaining({
        titulo: 'Carro Novo',
        valorAlvo: '45000.00',
      }),
    )
  })

  it('permite escolher um preset visual e preenche cores correspondentes', async () => {
    const user = userEvent.setup()
    const aoSalvar = vi.fn()
    const aoFechar = vi.fn()

    render(
      <ModalMetaForm
        aberto={true}
        meta={null}
        aoSalvar={aoSalvar}
        aoFechar={aoFechar}
      />,
    )

    const botaoPresetViagem = screen.getByRole('button', { name: /viagem & férias/i })
    await user.click(botaoPresetViagem)

    const inputTitulo = screen.getByLabelText(/título/i)
    const inputAlvo = screen.getByLabelText(/valor alvo/i)
    await user.type(inputTitulo, 'Paris 2027')
    await user.type(inputAlvo, '12000,00')

    const btnSalvar = screen.getByRole('button', { name: /salvar meta/i })
    await user.click(btnSalvar)

    expect(aoSalvar).toHaveBeenCalledWith(
      expect.objectContaining({
        titulo: 'Paris 2027',
        valorAlvo: '12000.00',
        presetVisual: 'viagem',
        corGradienteInicio: '#0284c7',
        corGradienteFim: '#38bdf8',
        icone: 'plane',
      }),
    )
  })

  it('preenche dados na edição e permite exclusão da meta', async () => {
    const user = userEvent.setup()
    const aoSalvar = vi.fn()
    const aoExcluir = vi.fn()
    const aoFechar = vi.fn()

    render(
      <ModalMetaForm
        aberto={true}
        meta={metaExemplo}
        aoSalvar={aoSalvar}
        aoExcluir={aoExcluir}
        aoFechar={aoFechar}
      />,
    )

    expect(screen.getByRole('heading', { name: /editar meta/i })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Reserva de Emergência')).toBeInTheDocument()

    const btnExcluir = screen.getByRole('button', { name: /excluir meta/i })
    await user.click(btnExcluir)

    const btnConfirmar = screen.getByRole('button', { name: /confirmar exclusão/i })
    await user.click(btnConfirmar)

    expect(aoExcluir).toHaveBeenCalledWith(metaExemplo.id)
  })
})
