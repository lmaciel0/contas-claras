import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { AcaoRapida } from './AcaoRapida'

function definirLargura(largura: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: largura })
  window.dispatchEvent(new Event('resize'))
}

function Local() {
  const { pathname, search } = useLocation()
  return <p data-testid="local">{`${pathname}${search}`}</p>
}

function renderizar(largura = 600, rota = '/?ano=2026&mes=10') {
  definirLargura(largura)
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <AcaoRapida />
              <Local />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  definirLargura(1024)
})

describe('AcaoRapida', () => {
  it('o botão "Criar" existe com a tela em 600 px', () => {
    renderizar(600)
    expect(screen.getByRole('button', { name: 'Criar' })).toBeInTheDocument()
  })

  it('o botão tem o alvo de toque mínimo de 44 px e avisa que abre um diálogo', () => {
    renderizar()
    const botao = screen.getByRole('button', { name: 'Criar' })
    expect(botao).toHaveClass('min-h-11', 'min-w-11')
    expect(botao).toHaveAttribute('aria-haspopup', 'dialog')
    expect(botao).toHaveAttribute('aria-expanded', 'false')
  })

  it('fica acima da dock, sem cobrir o aviso de saída nem a área segura', () => {
    renderizar()
    expect(screen.getByRole('button', { name: 'Criar' })).toHaveClass(
      'fixed',
      'right-4',
      'bottom-[calc(5rem+env(safe-area-inset-bottom))]',
      'z-30',
    )
  })

  it('clicar abre o diálogo "Criar" com três links e leva o foco ao primeiro', async () => {
    renderizar()
    const botao = screen.getByRole('button', { name: 'Criar' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(botao)

    const dialogo = screen.getByRole('dialog', { name: 'Criar' })
    expect(dialogo).toHaveAttribute('aria-modal', 'true')
    expect(botao).toHaveAttribute('aria-expanded', 'true')
    const links = within(dialogo).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['Nova nota', 'Nova conta', 'Nova tarefa'])
    expect(links[0]).toHaveFocus()
  })

  it('cada link aponta para o destino certo, com o mês só no da conta', async () => {
    renderizar(600, '/?ano=2026&mes=3')
    await userEvent.click(screen.getByRole('button', { name: 'Criar' }))

    expect(screen.getByRole('link', { name: 'Nova nota' })).toHaveAttribute('href', '/notas?nova=1')
    expect(screen.getByRole('link', { name: 'Nova conta' })).toHaveAttribute(
      'href',
      '/lancamentos/novo?ano=2026&mes=3',
    )
    expect(screen.getByRole('link', { name: 'Nova tarefa' })).toHaveAttribute('href', '/tarefas?nova=1')
  })

  it('Esc fecha e devolve o foco ao botão', async () => {
    renderizar()
    const botao = screen.getByRole('button', { name: 'Criar' })
    await userEvent.click(botao)

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(botao).toHaveFocus()
    expect(botao).toHaveAttribute('aria-expanded', 'false')
  })

  it('clicar no fundo fecha', async () => {
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Criar' }))

    await userEvent.click(screen.getByTestId('fundo-da-acao-rapida'))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('escolher "Nova conta" navega para /lancamentos/novo com o mês e fecha', async () => {
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Criar' }))

    await userEvent.click(screen.getByRole('link', { name: 'Nova conta' }))

    expect(screen.getByTestId('local')).toHaveTextContent('/lancamentos/novo?ano=2026&mes=10')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('o Tab fica preso dentro do diálogo', async () => {
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Criar' }))
    const dialogo = screen.getByRole('dialog', { name: 'Criar' })

    for (let i = 0; i < 8; i++) {
      await userEvent.tab()
      expect(dialogo.contains(document.activeElement)).toBe(true)
    }
    for (let i = 0; i < 8; i++) {
      await userEvent.tab({ shift: true })
      expect(dialogo.contains(document.activeElement)).toBe(true)
    }
  })

  it('trava a rolagem do corpo enquanto aberto e solta ao fechar', async () => {
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Criar' }))
    expect(document.body.style.overflow).toBe('hidden')

    await userEvent.keyboard('{Escape}')

    expect(document.body.style.overflow).not.toBe('hidden')
  })
})
