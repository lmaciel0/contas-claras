import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SeletorCor } from './SeletorCor'

describe('SeletorCor', () => {
  it('renderiza os botoes de cores rapidas e o botao outros', () => {
    render(<SeletorCor valor="#3b82f6" aoMudar={vi.fn()} />)

    expect(screen.getByText('Cor da categoria')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /outros/i })).toBeInTheDocument()
    // Deve haver botoes de cor com aria-label correspondente
    const botoes = screen.getAllByRole('radio')
    expect(botoes.length).toBeGreaterThan(0)
  })

  it('marca a cor selecionada como checked', () => {
    render(<SeletorCor valor="#3b82f6" aoMudar={vi.fn()} />)

    const selecionado = screen.getByRole('radio', { name: /azul/i })
    expect(selecionado).toHaveAttribute('aria-checked', 'true')
  })

  it('chama aoMudar ao clicar em uma cor', async () => {
    const user = userEvent.setup()
    const aoMudar = vi.fn()
    render(<SeletorCor valor="#3b82f6" aoMudar={aoMudar} />)

    const botaoVerde = screen.getByRole('radio', { name: /verde/i })
    await user.click(botaoVerde)

    expect(aoMudar).toHaveBeenCalledWith('#10b981')
  })

  it('abre campo de cor personalizada ao clicar em outros', async () => {
    const user = userEvent.setup()
    const aoMudar = vi.fn()
    render(<SeletorCor valor="#3b82f6" aoMudar={aoMudar} />)

    const botaoOutros = screen.getByRole('button', { name: /outros/i })
    await user.click(botaoOutros)

    const inputCor = screen.getByLabelText(/personalizada/i)
    expect(inputCor).toBeInTheDocument()
  })
})
