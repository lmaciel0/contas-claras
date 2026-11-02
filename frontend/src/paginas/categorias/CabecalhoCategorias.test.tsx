import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CabecalhoCategorias } from './CabecalhoCategorias'

describe('CabecalhoCategorias', () => {
  it('renderiza pilula de despesas por padrao e botoes de acao', () => {
    render(
      <CabecalhoCategorias
        tipoAtivo="DESPESA"
        aoMudarTipo={vi.fn()}
        aoNovaCategoria={vi.fn()}
        termoBusca=""
        aoMudarBusca={vi.fn()}
        todosExpandidos={true}
        aoAlternarExpansao={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /categoria de despesas/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /nova categoria/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /buscar categorias/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /recolher todas/i })).toBeInTheDocument()
  })

  it('alterna tipo para receitas ao selecionar no menu da pilula', async () => {
    const user = userEvent.setup()
    const aoMudarTipo = vi.fn()
    render(
      <CabecalhoCategorias
        tipoAtivo="DESPESA"
        aoMudarTipo={aoMudarTipo}
        aoNovaCategoria={vi.fn()}
        termoBusca=""
        aoMudarBusca={vi.fn()}
        todosExpandidos={true}
        aoAlternarExpansao={vi.fn()}
      />,
    )

    const btnPilula = screen.getByRole('button', { name: /categoria de despesas/i })
    await user.click(btnPilula)

    const opcaoReceitas = screen.getByRole('menuitem', { name: /categorias de receitas/i })
    await user.click(opcaoReceitas)

    expect(aoMudarTipo).toHaveBeenCalledWith('RECEITA')
  })
})
