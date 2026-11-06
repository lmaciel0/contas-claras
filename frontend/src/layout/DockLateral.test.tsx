import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router'
import { DockLateral } from './DockLateral'
import { PreferenciasProvider } from '../preferencias/PreferenciasContext'
import { servidor } from '../teste/servidor'

function renderizar(
  props: {
    nomeUsuario?: string
    aoSair?: () => void
    aoNavegar?: () => void
    aoAbrirPreferencias?: () => void
    forcarExpandida?: boolean
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
          forcarExpandida={props.forcarExpandida}
        />
      </MemoryRouter>
    </PreferenciasProvider>
  )
}

describe('DockLateral', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('com forcarExpandida nao repete o logo nem o botao de recolher (o cabecalho do menu ja tem)', () => {
    renderizar({ forcarExpandida: true })
    expect(screen.queryByRole('link', { name: 'Aprumo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /recolher menu|expandir menu/i })).not.toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Menu principal' })).toBeInTheDocument()
  })

  it('sem forcarExpandida mostra o logo e, recolhida, o "A"', () => {
    renderizar()
    expect(screen.getByRole('link', { name: 'Aprumo' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /recolher menu/i }))
    expect(screen.queryByRole('link', { name: 'Aprumo' })).not.toBeInTheDocument()
    expect(screen.getByTitle('Aprumo')).toHaveTextContent('A')
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

  it('tem o botão "Exportar meus dados" abaixo de "Alterar senha", que chama a API e mostra o erro se falhar', async () => {
    let chamadas = 0
    servidor.use(
      http.get('/api/auth/conta/exportacao', () => {
        chamadas += 1
        return HttpResponse.json({ erro: 'x' }, { status: 500 })
      }),
    )
    renderizar()
    const alterar = screen.getByRole('link', { name: 'Alterar senha' })
    const exportar = screen.getByRole('button', { name: 'Exportar meus dados' })
    expect(exportar).toHaveClass('min-h-11', 'text-[var(--cor-texto)]')
    expect(alterar.compareDocumentPosition(exportar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    fireEvent.click(exportar)

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível exportar. Tente de novo.')
    expect(chamadas).toBe(1)
  })

  it('rodapé expandido: todas as linhas têm ícone svg aria-hidden como primeiro filho e min-h-11', () => {
    renderizar()
    const linhas = [
      screen.getByRole('button', { name: 'Preferências' }),
      screen.getByRole('link', { name: 'Alterar senha' }),
      screen.getByRole('button', { name: 'Exportar meus dados' }),
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
    expect(screen.queryByRole('button', { name: 'Exportar meus dados' })).not.toBeInTheDocument()
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
