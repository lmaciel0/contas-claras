import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { DockInferior } from './DockInferior'
import { ITENS_DOCK } from './itensMenu'

function renderizar(rota = '/') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <DockInferior />
    </MemoryRouter>,
  )
}

describe('ITENS_DOCK', () => {
  it('tem Início, Tarefas, Notas e Finanças, nessa ordem', () => {
    expect(ITENS_DOCK).toEqual([
      { rotulo: 'Início', caminho: '/', exata: true },
      { rotulo: 'Tarefas', caminho: '/tarefas' },
      { rotulo: 'Notas', caminho: '/notas' },
      { rotulo: 'Finanças', caminho: '/financeiro', comMes: true },
    ])
  })
})

describe('DockInferior', () => {
  it('é uma navegação chamada "Navegação principal" com quatro links', () => {
    renderizar()
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => l.getAttribute('aria-label') ?? l.textContent)).toEqual([
      'Início',
      'Tarefas',
      'Notas',
      'Finanças',
    ])
  })

  it('cada link tem nome acessível e destino certos', () => {
    renderizar('/?ano=2026&mes=10')
    expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Tarefas' })).toHaveAttribute('href', '/tarefas')
    expect(screen.getByRole('link', { name: 'Notas' })).toHaveAttribute('href', '/notas')
    expect(screen.getByRole('link', { name: 'Finanças' })).toBeInTheDocument()
  })

  it('só o item ativo mostra o rótulo em texto e tem aria-current="page"', () => {
    renderizar('/tarefas')
    const tarefas = screen.getByRole('link', { name: 'Tarefas' })
    expect(tarefas).toHaveTextContent('Tarefas')
    expect(tarefas).toHaveAttribute('aria-current', 'page')

    for (const nome of ['Início', 'Notas', 'Finanças']) {
      const link = screen.getByRole('link', { name: nome })
      expect(link).toHaveTextContent('')
      expect(link).not.toHaveAttribute('aria-current')
      expect(link).toHaveAttribute('aria-label', nome)
      expect(link.querySelector('svg')).not.toBeNull()
    }
    expect(tarefas.querySelector('svg')).not.toBeNull()
  })

  it('Início só fica ativo na rota exata', () => {
    renderizar('/notas')
    expect(screen.getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Notas' })).toHaveAttribute('aria-current', 'page')
  })

  it('o link de Finanças leva ?ano=&mes= do mês em foco', () => {
    renderizar('/tarefas?ano=2026&mes=10')
    expect(screen.getByRole('link', { name: 'Finanças' })).toHaveAttribute('href', '/financeiro?ano=2026&mes=10')
  })

  it('cada alvo tem 44 px no mínimo e foco visível por teclado', async () => {
    renderizar()
    for (const link of within(screen.getByRole('navigation')).getAllByRole('link')) {
      expect(link).toHaveClass('min-h-11', 'min-w-11')
      expect(link.className).toMatch(/focus-visible:outline-2/)
      expect(link.className).toMatch(/focus-visible:outline-\[var\(--cor-principal\)\]/)
    }

    await userEvent.tab()
    expect(screen.getByRole('link', { name: 'Início' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('link', { name: 'Tarefas' })).toHaveFocus()
  })

  it('fica fixa embaixo, respeita a área segura e só usa tokens de cor', () => {
    renderizar()
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' })
    expect(nav).toHaveClass('fixed')
    expect(nav.className).toMatch(/env\(safe-area-inset-bottom\)/)
    expect(nav.className).not.toMatch(/#[0-9a-f]{3,6}|rgb\(|(bg|text|border)-(white|black|gray|slate|zinc)/i)
  })

  it('o rótulo do item ativo anima só por classe que respeita prefers-reduced-motion', () => {
    renderizar('/notas')
    const rotulo = screen.getByText('Notas')
    expect(rotulo).toHaveClass('dock-rotulo')
  })
})
