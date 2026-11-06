import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { FolhaAcaoRapida } from './AcaoRapida'

function Local() {
  const { pathname, search, state } = useLocation()
  return (
    <>
      <p data-testid="local">{`${pathname}${search}`}</p>
      <p data-testid="estado">{JSON.stringify(state)}</p>
    </>
  )
}

/** Dono do estado, como a DockInferior: o botão "Criar" abre a folha. */
function Hospedeira() {
  const [aberta, setAberta] = useState(false)
  return (
    <>
      <button type="button" aria-label="Criar" onClick={() => setAberta(true)} />
      <FolhaAcaoRapida
        aberta={aberta}
        aoFechar={() => {
          setAberta(false)
        }}
      />
      <Local />
    </>
  )
}

function renderizar(rota = '/?ano=2026&mes=10') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="*" element={<Hospedeira />} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  document.body.style.overflow = ''
})

describe('FolhaAcaoRapida', () => {
  it('fechada não renderiza nada; aberta mostra o diálogo "Criar" com três links e leva o foco ao primeiro', async () => {
    renderizar()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Criar' }))

    const dialogo = screen.getByRole('dialog', { name: 'Criar' })
    expect(dialogo).toHaveAttribute('aria-modal', 'true')
    const links = within(dialogo).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['Nova nota', 'Nova conta', 'Nova tarefa'])
    expect(links[0]).toHaveFocus()
  })

  it('cada link aponta para o destino certo, com o mês só no da conta', async () => {
    renderizar('/?ano=2026&mes=3')
    await userEvent.click(screen.getByRole('button', { name: 'Criar' }))

    expect(screen.getByRole('link', { name: 'Nova nota' })).toHaveAttribute('href', '/notas')
    expect(screen.getByRole('link', { name: 'Nova conta' })).toHaveAttribute(
      'href',
      '/lancamentos/novo?ano=2026&mes=3',
    )
    expect(screen.getByRole('link', { name: 'Nova tarefa' })).toHaveAttribute('href', '/tarefas?nova=1')
  })

  it('Esc chama aoFechar e fecha', async () => {
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Criar' }))

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
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

  it('"Nova nota" vai para /notas levando { nova: true } no estado de navegação (não na URL)', async () => {
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Criar' }))

    await userEvent.click(screen.getByRole('link', { name: 'Nova nota' }))

    expect(screen.getByTestId('local')).toHaveTextContent(/^\/notas$/)
    expect(screen.getByTestId('estado')).toHaveTextContent('{"nova":true}')
  })

  it('tem um botão "Fechar" de 44 px, o último da folha, que fecha', async () => {
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Criar' }))
    const dialogo = screen.getByRole('dialog', { name: 'Criar' })
    const fechar = within(dialogo).getByRole('button', { name: 'Fechar' })
    expect(fechar).toHaveClass('min-h-11')
    expect(Array.from(dialogo.querySelectorAll('a[href], button')).at(-1)).toBe(fechar)

    await userEvent.click(fechar)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})
