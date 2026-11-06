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

  it('rodapé expandido: todas as linhas têm ícone svg aria-hidden como primeiro filho e min-h-11', () => {
    renderizar()
    const linhas = [
      screen.getByRole('button', { name: 'Preferências' }),
      screen.getByRole('link', { name: 'Alterar senha' }),
      screen.getByRole('link', { name: 'Excluir conta' }),
      screen.getByRole('link', { name: 'Política de Privacidade' }),
      screen.getByRole('button', { name: 'Sair' }),
    ]
    for (const linha of linhas) {
      expect(linha).toHaveClass('min-h-11', 'gap-3', 'px-3')
      const icone = linha.firstElementChild
      expect(icone?.tagName.toLowerCase()).toBe('svg')
      expect(icone).toHaveAttribute('aria-hidden', 'true')
      expect(icone).toHaveAttribute('width', '20')
      expect(icone).toHaveAttribute('height', '20')
    }
  })

  it('rodapé recolhido segue só com ícones: sem links de conta e botões size-11', () => {
    renderizar()
    fireEvent.click(screen.getByRole('button', { name: /recolher menu/i }))
    expect(screen.queryByRole('link', { name: 'Alterar senha' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Excluir conta' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Política de Privacidade' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Preferências' })).toHaveClass('size-11')
    expect(screen.getByRole('button', { name: 'Sair' })).toHaveClass('size-11')
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
