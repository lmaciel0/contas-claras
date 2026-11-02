import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router'
import { DockLateral } from './DockLateral'
import { PreferenciasProvider } from '../preferencias/PreferenciasContext'

function renderizar(
  props: {
    nomeUsuario?: string
    aoSair?: () => void
    aoNavegar?: () => void
    aoAbrirPreferencias?: () => void
  } = {}
) {
  const aoSair = props.aoSair ?? vi.fn()
  const aoAbrirPreferencias = props.aoAbrirPreferencias ?? vi.fn()

  return render(
    <PreferenciasProvider>
      <MemoryRouter>
        <DockLateral
          nomeUsuario={props.nomeUsuario ?? 'Damir'}
          aoSair={aoSair}
          aoNavegar={props.aoNavegar}
          aoAbrirPreferencias={aoAbrirPreferencias}
        />
      </MemoryRouter>
    </PreferenciasProvider>
  )
}

describe('DockLateral', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renderiza os links de navegação principais', () => {
    renderizar()
    expect(screen.getByRole('link', { name: /início/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /tarefas/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /visão geral/i })).toBeInTheDocument()
  })

  it('permite alternar entre modo expandido e modo recolhido', () => {
    renderizar()
    // Inicialmente expandida
    const botaoToggle = screen.getByRole('button', { name: /recolher menu/i })
    expect(botaoToggle).toBeInTheDocument()

    // Alterna para recolhida
    fireEvent.click(botaoToggle)
    expect(screen.getByRole('button', { name: /expandir menu/i })).toBeInTheDocument()
  })

  it('chama aoAbrirPreferencias ao clicar no botão de preferências', () => {
    const aoAbrir = vi.fn()
    renderizar({ aoAbrirPreferencias: aoAbrir })
    const botaoPrefs = screen.getByRole('button', { name: /preferências/i })
    fireEvent.click(botaoPrefs)
    expect(aoAbrir).toHaveBeenCalledTimes(1)
  })

  it('chama aoSair ao clicar no botão de sair', () => {
    const aoSair = vi.fn()
    renderizar({ aoSair })
    const botaoSair = screen.getByRole('button', { name: /sair/i })
    fireEvent.click(botaoSair)
    expect(aoSair).toHaveBeenCalledTimes(1)
  })
})
