import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { DockInferior } from './DockInferior'
import { GRUPOS_MENU, ITENS_DOCK } from './itensMenu'

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
      { rotulo: 'Finanças', caminho: '/financeiro', comMes: true, tambemAtivoEm: expect.any(Array) },
    ])
  })

  it('Finanças fica ativo em todo o grupo Financeiro do menu, sem repetir a lista de rotas à mão', () => {
    const financeiro = GRUPOS_MENU.find((g) => g.titulo === 'Financeiro')?.itens.map((i) => i.caminho)
    expect(financeiro).toEqual(['/financeiro', '/lancamentos', '/cartoes', '/categorias', '/relatorios'])
    expect(ITENS_DOCK.find((i) => i.rotulo === 'Finanças')?.tambemAtivoEm).toEqual(financeiro)
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

  it.each(['/financeiro', '/lancamentos', '/cartoes', '/categorias', '/relatorios'])(
    'em %s Finanças fica ativo, com rótulo e aria-current, e os outros não',
    (rota) => {
      renderizar(`${rota}?ano=2026&mes=10`)
      const financas = screen.getByRole('link', { name: 'Finanças' })
      expect(financas).toHaveAttribute('aria-current', 'page')
      expect(financas).toHaveTextContent('Finanças')
      expect(financas).toHaveAttribute('href', '/financeiro?ano=2026&mes=10')
      for (const nome of ['Início', 'Tarefas', 'Notas']) {
        const link = screen.getByRole('link', { name: nome })
        expect(link).not.toHaveAttribute('aria-current')
        expect(link).toHaveTextContent('')
      }
    },
  )

  it('em /lancamentos/novo (subrota) Finanças continua ativo', () => {
    renderizar('/lancamentos/novo?ano=2026&mes=10')
    expect(screen.getByRole('link', { name: 'Finanças' })).toHaveAttribute('aria-current', 'page')
  })

  it.each(['/', '/tarefas', '/notas', '/projetos'])('em %s Finanças NÃO fica ativo', (rota) => {
    renderizar(rota)
    const financas = screen.getByRole('link', { name: 'Finanças' })
    expect(financas).not.toHaveAttribute('aria-current')
    expect(financas).toHaveTextContent('')
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
