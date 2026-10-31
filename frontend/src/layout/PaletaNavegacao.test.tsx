import { act, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import { PainelPage } from '../paginas/painel/PainelPage'
import { comSessao } from '../teste/auth'
import { renderComApp } from '../teste/render'
import { AppShell } from './AppShell'
import { normalizar } from './paleta'

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('matchMedia', undefined)
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: 1440,
  })
  window.dispatchEvent(new Event('resize'))
})

function Local() {
  const { pathname, search } = useLocation()
  return <p data-testid="local">{pathname + search}</p>
}

function renderizar(rota = '/lancamentos?ano=2026&mes=10') {
  comSessao()
  renderComApp(
    <AuthProvider>
      <Routes>
        <Route element={<AppShell nomeUsuario="Ana" />}>
          <Route path="/" element={<PainelPage />} />
          <Route path="*" element={<Local />} />
        </Route>
      </Routes>
    </AuthProvider>,
    rota,
  )
}

const paleta = () => screen.queryByRole('dialog', { name: 'Ir para' })
const opcoes = () => screen.queryAllByRole('option').map((o) => o.textContent)

describe('normalizar', () => {
  it('põe em minúsculas e tira acentos', () => {
    expect(normalizar('LANÇAmentos Cartões')).toBe('lancamentos cartoes')
  })
})

describe('PaletaNavegacao', () => {
  it.each([
    ['Ctrl+K', { ctrlKey: true }],
    ['Meta+K', { metaKey: true }],
  ])('%s abre a paleta com todas as páginas', async (_nome, modificador) => {
    renderizar()
    expect(paleta()).not.toBeInTheDocument()

    const disparo = new KeyboardEvent('keydown', {
      key: 'k',
      cancelable: true,
      bubbles: true,
      ...modificador,
    })
    act(() => {
      document.dispatchEvent(disparo)
    })

    const dialogo = await screen.findByRole('dialog', { name: 'Ir para' })
    expect(dialogo).toHaveAttribute('aria-modal', 'true')
    expect(disparo.defaultPrevented).toBe(true)
    expect(screen.getByRole('combobox')).toHaveFocus()
    expect(opcoes()).toEqual(['Início', 'Tarefas', 'Notas', 'Visão geral', 'Lançamentos', 'Cartões', 'Categorias', 'Relatórios'])
  })

  it('digitar "lanc" filtra para Lançamentos, ignorando acento e caixa', async () => {
    const user = userEvent.setup()
    renderizar()
    await user.keyboard('{Control>}k{/Control}')
    await user.keyboard('LANC')
    expect(opcoes()).toEqual(['Lançamentos'])

    await user.clear(screen.getByRole('combobox'))
    await user.keyboard('cartoes')
    expect(opcoes()).toEqual(['Cartões'])
  })

  it('menuLateralTemNotasEPaletaEncontraNotas', async () => {
    const user = userEvent.setup()
    renderizar('/categorias')
    expect(within(screen.getByRole('navigation', { name: 'Menu principal' })).getByRole('link', { name: 'Notas' })).toHaveAttribute(
      'href',
      '/notas',
    )

    await user.keyboard('{Control>}k{/Control}')
    await user.keyboard('nota')
    expect(opcoes()).toEqual(['Notas'])

    await user.keyboard('{Enter}')
    expect(paleta()).not.toBeInTheDocument()
    expect(screen.getByTestId('local')).toHaveTextContent('/notas')
  })

  it('menuLateralTemTarefasEPaletaEncontraTarefas', async () => {
    const user = userEvent.setup()
    renderizar('/categorias')
    expect(within(screen.getByRole('navigation', { name: 'Menu principal' })).getByRole('link', { name: 'Tarefas' })).toHaveAttribute(
      'href',
      '/tarefas',
    )

    await user.keyboard('{Control>}k{/Control}')
    await user.keyboard('taref')
    expect(opcoes()).toEqual(['Tarefas'])

    await user.keyboard('{Enter}')
    expect(paleta()).not.toBeInTheDocument()
    expect(screen.getByTestId('local')).toHaveTextContent('/tarefas')
  })

  it('setas movem a opção ativa e Enter navega (com o mês, quando a página usa) e fecha', async () => {
    const user = userEvent.setup()
    renderizar('/categorias?ano=2026&mes=7')
    await user.keyboard('{Control>}k{/Control}')
    const campo = screen.getByRole('combobox')
    const [primeira, segunda] = screen.getAllByRole('option')
    expect(primeira).toHaveAttribute('aria-selected', 'true')
    expect(campo).toHaveAttribute('aria-activedescendant', primeira?.id)

    await user.keyboard('{ArrowDown}')
    expect(segunda).toHaveAttribute('aria-selected', 'true')
    expect(campo).toHaveAttribute('aria-activedescendant', segunda?.id)

    await user.keyboard('{ArrowUp}{ArrowUp}')
    expect(screen.getAllByRole('option').at(-1)).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{Enter}')
    expect(paleta()).not.toBeInTheDocument()
    expect(screen.getByTestId('local')).toHaveTextContent('/financeiro?ano=2026&mes=7')
  })

  it('com o foco em "Fechar", Enter fecha e não navega; setas não mexem na opção ativa', async () => {
    const user = userEvent.setup()
    renderizar('/lancamentos?ano=2026&mes=10')
    await user.keyboard('{Control>}k{/Control}')
    const [primeira] = screen.getAllByRole('option')
    const fechar = screen.getByRole('button', { name: 'Fechar' })
    fechar.focus()

    await user.keyboard('{ArrowDown}')
    expect(primeira).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{Enter}')
    expect(paleta()).not.toBeInTheDocument()
    expect(screen.getByTestId('local')).toHaveTextContent('/lancamentos?ano=2026&mes=10')
  })

  it('Enter durante composição (IME) não navega', async () => {
    const user = userEvent.setup()
    renderizar('/lancamentos?ano=2026&mes=10')
    await user.keyboard('{Control>}k{/Control}')
    await user.keyboard('cart')

    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter', isComposing: true })

    expect(paleta()).toBeInTheDocument()
    expect(screen.getByTestId('local')).toHaveTextContent('/lancamentos?ano=2026&mes=10')
  })

  it('trava a rolagem do body enquanto aberta e restaura ao fechar', async () => {
    const user = userEvent.setup()
    renderizar()
    await user.keyboard('{Control>}k{/Control}')
    expect(document.body.style.overflow).toBe('hidden')

    await user.keyboard('{Escape}')
    expect(document.body.style.overflow).toBe('')
  })

  it('página sem mês navega sem query string', async () => {
    const user = userEvent.setup()
    renderizar('/lancamentos?ano=2026&mes=7')
    await user.keyboard('{Control>}k{/Control}')
    await user.keyboard('relat{Enter}')
    expect(screen.getByTestId('local')).toHaveTextContent(/^\/relatorios$/)
  })

  it('clicar numa opção navega e fecha', async () => {
    const user = userEvent.setup()
    renderizar()
    await user.keyboard('{Control>}k{/Control}')
    await user.click(screen.getByRole('option', { name: 'Cartões' }))
    expect(paleta()).not.toBeInTheDocument()
    expect(screen.getByTestId('local')).toHaveTextContent('/cartoes?ano=2026&mes=10')
  })

  it.each([
    ['Enter', 'Enter'],
    ['Espaço', ' '],
  ])('%s numa opção com foco navega e fecha, como o clique', async (_nome, tecla) => {
    renderizar()
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true }))
    })
    const opcao = await screen.findByRole('option', { name: 'Cartões' })

    fireEvent.keyDown(opcao, { key: tecla })

    expect(paleta()).not.toBeInTheDocument()
    expect(screen.getByTestId('local')).toHaveTextContent('/cartoes?ano=2026&mes=10')
  })

  it('Esc fecha e devolve o foco a quem estava focado antes', async () => {
    const user = userEvent.setup()
    renderizar()
    const link = screen.getByRole('link', { name: 'Cartões' })
    link.focus()
    await user.keyboard('{Control>}k{/Control}')
    expect(screen.getByRole('combobox')).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(paleta()).not.toBeInTheDocument()
    expect(link).toHaveFocus()
  })

  it('clicar no fundo fecha', async () => {
    const user = userEvent.setup()
    renderizar()
    await user.keyboard('{Control>}k{/Control}')
    await user.click(screen.getByTestId('fundo-da-paleta'))
    expect(paleta()).not.toBeInTheDocument()
  })

  it('Tab fica preso dentro do diálogo', async () => {
    const user = userEvent.setup()
    renderizar()
    await user.keyboard('{Control>}k{/Control}')
    const dialogo = screen.getByRole('dialog', { name: 'Ir para' })

    for (let i = 0; i < 5; i += 1) {
      await user.tab()
      expect(dialogo).toContainElement(document.activeElement as HTMLElement)
    }
    for (let i = 0; i < 5; i += 1) {
      await user.tab({ shift: true })
      expect(dialogo).toContainElement(document.activeElement as HTMLElement)
    }
  })

  it('sem resultado mostra "Nenhum resultado"', async () => {
    const user = userEvent.setup()
    renderizar()
    await user.keyboard('{Control>}k{/Control}')
    await user.keyboard('zzz')
    expect(screen.getByText('Nenhum resultado')).toBeInTheDocument()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    await user.keyboard('{Enter}')
    expect(paleta()).toBeInTheDocument()
  })

  it('o botão "Ir para…" da tela inicial abre a paleta', async () => {
    const user = userEvent.setup()
    renderizar('/')
    await user.click(await screen.findByRole('button', { name: /^Ir para…/ }))
    expect(await screen.findByRole('dialog', { name: 'Ir para' })).toBeInTheDocument()
    expect(screen.getByText('Ctrl K')).toBeInTheDocument()
  })

  it('abaixo de 1280 px a paleta também abre', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 390,
    })
    window.dispatchEvent(new Event('resize'))
    const user = userEvent.setup()
    renderizar()
    await user.keyboard('{Control>}k{/Control}')
    expect(await screen.findByRole('dialog', { name: 'Ir para' })).toBeInTheDocument()
  })
})
