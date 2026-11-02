import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SeletorIcone } from './SeletorIcone'

describe('SeletorIcone', () => {
  it('renderiza os botoes de icones rapidos e o botao outros', () => {
    render(<SeletorIcone valor="restaurante" aoMudar={vi.fn()} />)

    expect(screen.getByText('Ícone')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /outros/i })).toBeInTheDocument()
    const botoes = screen.getAllByRole('radio')
    expect(botoes.length).toBeGreaterThan(0)
  })

  it('marca o icone selecionado com aria-checked true', () => {
    render(<SeletorIcone valor="restaurante" aoMudar={vi.fn()} />)

    const selecionado = screen.getByRole('radio', { name: /restaurante/i })
    expect(selecionado).toHaveAttribute('aria-checked', 'true')
  })

  it('chama aoMudar ao selecionar um icone', async () => {
    const user = userEvent.setup()
    const aoMudar = vi.fn()
    render(<SeletorIcone valor="restaurante" aoMudar={aoMudar} />)

    const botaoTransporte = screen.getByRole('radio', { name: /transporte/i })
    await user.click(botaoTransporte)

    expect(aoMudar).toHaveBeenCalledWith('transporte')
  })

  it('abre catalogo expandido com campo de busca ao clicar em outros', async () => {
    const user = userEvent.setup()
    const aoMudar = vi.fn()
    render(<SeletorIcone valor="restaurante" aoMudar={aoMudar} />)

    const botaoOutros = screen.getByRole('button', { name: /outros/i })
    await user.click(botaoOutros)

    expect(screen.getByPlaceholderText(/buscar ícone/i)).toBeInTheDocument()
  })
})
