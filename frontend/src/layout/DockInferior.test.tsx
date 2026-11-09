import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { DockInferior } from './DockInferior'
import { ICONE_ENGRENAGEM, ICONES } from './icones'
import { CAMINHOS_MAIS, GRUPOS_MENU, ITENS_DOCK, ITENS_MAIS } from './itensMenu'

function Local() {
  const { pathname, search, state } = useLocation()
  const navegar = useNavigate()
  return (
    <>
      <p data-testid="local">{`${pathname}${search}`}</p>
      <p data-testid="estado">{JSON.stringify(state)}</p>
      <button type="button" onClick={() => void navegar('/outra-tela')}>
        Trocar de rota
      </button>
    </>
  )
}

function renderizar(rota = '/') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <DockInferior />
              <Local />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  document.body.style.overflow = ''
})

describe('ITENS_DOCK', () => {
  it('tem Início, Notas, Orçamento e Mais, nessa ordem', () => {
    expect(ITENS_DOCK.map((i) => i.rotulo)).toEqual(['Início', 'Notas', 'Orçamento', 'Mais'])
    expect(ITENS_DOCK).toEqual([
      { rotulo: 'Início', caminho: '/', exata: true },
      { rotulo: 'Notas', caminho: '/notas' },
      { rotulo: 'Orçamento', caminho: '/lancamentos', comMes: true },
      { rotulo: 'Mais', caminho: '/mais', tambemAtivoEm: CAMINHOS_MAIS },
    ])
  })
})

describe('ITENS_MAIS e CAMINHOS_MAIS', () => {
  it('ITENS_MAIS vem de GRUPOS_MENU, na ordem Visão geral, Cartões, Categorias, Relatórios', () => {
    expect(ITENS_MAIS.map((i) => i.rotulo)).toEqual([
      'Visão geral',
      'Cartões',
      'Categorias',
      'Relatórios',
    ])
    const todos = GRUPOS_MENU.flatMap((g) => g.itens)
    for (const item of ITENS_MAIS) {
      expect(todos).toContain(item)
    }
  })

  it('CAMINHOS_MAIS tem os atalhos, /mais, /conta/senha e /conta/excluir', () => {
    expect(CAMINHOS_MAIS).toEqual([
      '/financeiro',
      '/cartoes',
      '/categorias',
      '/relatorios',
      '/mais',
      '/conta/senha',
      '/conta/excluir',
    ])
  })

  it('o ícone de /mais é a engrenagem compartilhada', () => {
    expect(ICONES['/mais']).toBe(ICONE_ENGRENAGEM)
  })
})

describe('DockInferior', () => {
  it('é a navegação "Navegação principal" com Início, Notas, Orçamento e Mais, e o botão Criar entre Notas e Orçamento', () => {
    renderizar()
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' })
    const itens = within(nav).getAllByRole('link').length
    expect(itens).toBe(4)
    const ordem = Array.from(nav.querySelectorAll('a, button')).map((e) => e.getAttribute('aria-label'))
    expect(ordem).toEqual(['Início', 'Notas', 'Criar', 'Orçamento', 'Mais'])
  })

  it('cada link tem nome acessível e destino certos', () => {
    renderizar('/?ano=2026&mes=10')
    expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Notas' })).toHaveAttribute('href', '/notas')
    expect(screen.getByRole('link', { name: 'Orçamento' })).toHaveAttribute('href', '/lancamentos?ano=2026&mes=10')
    expect(screen.getByRole('link', { name: 'Mais' })).toHaveAttribute('href', '/mais')
  })

  it('só o item ativo mostra o rótulo em texto e tem aria-current="page"', () => {
    renderizar('/notas')
    const notas = screen.getByRole('link', { name: 'Notas' })
    expect(notas).toHaveTextContent('Notas')
    expect(notas).toHaveAttribute('aria-current', 'page')

    for (const nome of ['Início', 'Orçamento', 'Mais']) {
      const link = screen.getByRole('link', { name: nome })
      expect(link).toHaveTextContent('')
      expect(link).not.toHaveAttribute('aria-current')
      expect(link).toHaveAttribute('aria-label', nome)
      expect(link.querySelector('svg')).not.toBeNull()
    }
    expect(notas.querySelector('svg')).not.toBeNull()
  })

  it('Início só fica ativo na rota exata', () => {
    renderizar('/notas')
    expect(screen.getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Notas' })).toHaveAttribute('aria-current', 'page')
  })

  it.each(['/financeiro', '/cartoes', '/categorias', '/relatorios', '/mais', '/conta/senha', '/conta/excluir'])(
    'em %s o item Mais fica ativo, com rótulo, e os outros não',
    (rota) => {
      renderizar(rota)
      const mais = screen.getByRole('link', { name: 'Mais' })
      expect(mais).toHaveAttribute('aria-current', 'page')
      expect(mais).toHaveTextContent('Mais')
      for (const nome of ['Início', 'Notas', 'Orçamento']) {
        const link = screen.getByRole('link', { name: nome })
        expect(link).not.toHaveAttribute('aria-current')
        expect(link).toHaveTextContent('')
      }
    },
  )

  it.each(['/lancamentos', '/lancamentos/novo', '/lancamentos/12'])('em %s Orçamento fica ativo e Mais não', (rota) => {
    renderizar(`${rota}?ano=2026&mes=10`)
    const orcamento = screen.getByRole('link', { name: 'Orçamento' })
    expect(orcamento).toHaveAttribute('aria-current', 'page')
    expect(orcamento).toHaveTextContent('Orçamento')
    expect(screen.getByRole('link', { name: 'Mais' })).not.toHaveAttribute('aria-current')
  })

  it('o link de Orçamento mantém ?ano=&mes= do mês em foco', () => {
    renderizar('/financeiro?ano=2026&mes=10')
    expect(screen.getByRole('link', { name: 'Orçamento' })).toHaveAttribute('href', '/lancamentos?ano=2026&mes=10')
  })

  it('cada alvo tem 44 px no mínimo e foco visível por teclado, na ordem visual', async () => {
    renderizar()
    const nav = screen.getByRole('navigation')
    for (const alvo of [...within(nav).getAllByRole('link'), within(nav).getByRole('button', { name: 'Criar' })]) {
      expect(alvo).toHaveClass('min-h-11', 'min-w-11')
      expect(alvo.className).toMatch(/focus-visible:outline-2/)
      expect(alvo.className).toMatch(/focus-visible:outline-\[var\(--cor-principal\)\]/)
    }

    await userEvent.tab()
    expect(screen.getByRole('link', { name: 'Início' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('link', { name: 'Notas' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Criar' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('link', { name: 'Orçamento' })).toHaveFocus()
  })

  it('fica fixa embaixo, respeita a área segura e só usa tokens de cor', () => {
    renderizar()
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' })
    expect(nav).toHaveClass('fixed')
    expect(nav.className).toMatch(/env\(safe-area-inset-bottom\)/)
    expect(nav.className).not.toMatch(/#[0-9a-f]{3,6}|rgb\(|(bg|text|border)-(white|black|gray|slate|zinc)/i)
    const criar = screen.getByRole('button', { name: 'Criar' })
    expect(criar.className).not.toMatch(/#[0-9a-f]{3,6}|rgb\(|(bg|text|border|ring)-(white|black|gray|slate|zinc)/i)
  })

  it('o rótulo do item ativo anima só por classe que respeita prefers-reduced-motion', () => {
    renderizar('/notas')
    expect(screen.getByText('Notas')).toHaveClass('dock-rotulo')
  })
})

describe('DockInferior: botão Criar', () => {
  it('é um círculo de pelo menos 56 px, destacado, com ícone SVG e animação que respeita reduced-motion', () => {
    renderizar()
    const criar = screen.getByRole('button', { name: 'Criar' })
    expect(criar).toHaveClass('size-14', 'rounded-full', 'bg-[var(--cor-principal)]')
    expect(criar.className).toMatch(/motion-safe:active:scale-95/)
    expect(criar.className).toMatch(/motion-reduce:transition-none/)
    expect(criar.querySelector('svg')).not.toBeNull()
    expect(criar).toHaveAttribute('aria-haspopup', 'dialog')
    expect(criar).toHaveAttribute('aria-expanded', 'false')
    expect(criar).not.toHaveAttribute('aria-controls')
  })

  it('abre o diálogo "Criar" com Nova nota, Nova conta e Nova tarefa e leva o foco ao primeiro', async () => {
    renderizar('/?ano=2026&mes=3')
    const criar = screen.getByRole('button', { name: 'Criar' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(criar)

    const dialogo = screen.getByRole('dialog', { name: 'Criar' })
    expect(dialogo).toHaveAttribute('aria-modal', 'true')
    expect(criar).toHaveAttribute('aria-expanded', 'true')
    expect(criar).toHaveAttribute('aria-controls', dialogo.id)
    const links = within(dialogo).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['Nova nota', 'Nova despesa', 'Nova receita'])
    expect(links[0]).toHaveFocus()
    expect(links[1]).toHaveAttribute('href', '/lancamentos/novo?ano=2026&mes=3')
    expect(links[2]).toHaveAttribute('href', '/lancamentos/novo?ano=2026&mes=3&tipo=RECEITA')
  })

  it('o diálogo não é descendente do nav (o backdrop-blur do nav quebraria o fixed inset-0)', async () => {
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Criar' }))
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' })
    expect(nav.contains(screen.getByRole('dialog', { name: 'Criar' }))).toBe(false)
  })

  it('Esc fecha e devolve o foco ao botão Criar', async () => {
    renderizar()
    const criar = screen.getByRole('button', { name: 'Criar' })
    await userEvent.click(criar)

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(criar).toHaveFocus()
    expect(criar).toHaveAttribute('aria-expanded', 'false')
  })

  it('clicar num item navega e fecha', async () => {
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Criar' }))

    await userEvent.click(screen.getByRole('link', { name: 'Nova receita' }))

    expect(screen.getByTestId('local').textContent).toMatch(/\/lancamentos\/novo\?.*tipo=RECEITA/)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('mudar de rota com a folha aberta (gesto de voltar) fecha a folha e solta a rolagem', async () => {
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Criar' }))
    expect(document.body.style.overflow).toBe('hidden')

    await userEvent.click(screen.getByRole('button', { name: 'Trocar de rota' }))

    expect(screen.getByTestId('local')).toHaveTextContent('/outra-tela')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('mudar de rota com a folha aberta devolve o foco ao botão Criar', async () => {
    renderizar()
    const criar = screen.getByRole('button', { name: 'Criar' })
    await userEvent.click(criar)
    expect(screen.getByRole('dialog', { name: 'Criar' })).toBeInTheDocument()

    await act(async () => {
      screen.getByRole('button', { name: 'Trocar de rota' }).click()
    })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(criar).toHaveFocus()
  })
})
