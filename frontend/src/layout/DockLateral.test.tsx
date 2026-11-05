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

  it('tem link discreto para a politica de privacidade e fecha o menu ao navegar', () => {
    const aoNavegar = vi.fn()
    renderizar({ aoNavegar })
    const link = screen.getByRole('link', { name: 'Política de Privacidade' })
    expect(link).toHaveAttribute('href', '/privacidade')
    expect(link).not.toHaveAttribute('target')
    expect(link).toHaveClass('min-h-11')
    fireEvent.click(link)
    expect(aoNavegar).toHaveBeenCalledTimes(1)
  })

  it('tem link discreto "Excluir conta" abaixo de "Alterar senha" e fecha o menu ao navegar', () => {
    const aoNavegar = vi.fn()
    renderizar({ aoNavegar })
    const alterar = screen.getByRole('link', { name: 'Alterar senha' })
    const excluir = screen.getByRole('link', { name: 'Excluir conta' })
    expect(excluir).toHaveAttribute('href', '/conta/excluir')
    expect(excluir).toHaveClass('min-h-11', 'text-xs')
    expect(alterar.compareDocumentPosition(excluir) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    fireEvent.click(excluir)
    expect(aoNavegar).toHaveBeenCalledTimes(1)
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
