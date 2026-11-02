import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CategoriaResponse } from '../../api/tipos'
import { LinhaCategoria } from './LinhaCategoria'

const catDespesa: CategoriaResponse = {
  id: 1,
  nome: 'Educação',
  tipo: 'DESPESA',
  ordem: 1,
  icone: 'livro',
  cor: '#7c3aed',
  itens: [],
}

const catReceita: CategoriaResponse = {
  id: 2,
  nome: 'Salário',
  tipo: 'RECEITA',
  ordem: 1,
  icone: 'salario',
  cor: '#10b981',
  itens: [],
}

describe('LinhaCategoria', () => {
  it('renderiza nome, icone, cor e botoes de acao de despesa', () => {
    render(
      <table>
        <tbody>
          <LinhaCategoria
            categoria={catDespesa}
            aoEditar={vi.fn()}
            aoRelatorios={vi.fn()}
            aoArquivar={vi.fn()}
            aoAdicionarSubcategoria={vi.fn()}
          />
        </tbody>
      </table>,
    )

    expect(screen.getByText('Educação')).toBeInTheDocument()
    expect(screen.getByTitle(/relatórios/i)).toBeInTheDocument()
    expect(screen.getByTitle(/editar/i)).toBeInTheDocument()
    expect(screen.getByTitle(/arquivar/i)).toBeInTheDocument()
    expect(screen.getByTitle(/adicionar subcategoria/i)).toBeInTheDocument()
  })

  it('chama aoAdicionarSubcategoria ao clicar no botao +', async () => {
    const user = userEvent.setup()
    const aoAdicionar = vi.fn()
    render(
      <table>
        <tbody>
          <LinhaCategoria
            categoria={catDespesa}
            aoEditar={vi.fn()}
            aoRelatorios={vi.fn()}
            aoArquivar={vi.fn()}
            aoAdicionarSubcategoria={aoAdicionar}
          />
        </tbody>
      </table>,
    )

    const btnPlus = screen.getByTitle(/adicionar subcategoria/i)
    await user.click(btnPlus)

    expect(aoAdicionar).toHaveBeenCalled()
  })
})
