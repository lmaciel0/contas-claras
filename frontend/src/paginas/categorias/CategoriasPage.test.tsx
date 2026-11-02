import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { CategoriaResponse } from '../../api/tipos'
import { item } from '../../teste/lancamentos'
import { renderComApp } from '../../teste/render'
import { servidor } from '../../teste/servidor'
import { CategoriasPage } from './CategoriasPage'

const dadosIniciais = (): CategoriaResponse[] => [
  {
    id: 1,
    nome: 'Salários',
    tipo: 'RECEITA',
    ordem: 1,
    icone: 'salario',
    cor: '#10b981',
    itens: [item({ id: 10, nome: 'Salário Mensal', diaVencimento: 5 })],
  },
  {
    id: 2,
    nome: 'Moradia',
    tipo: 'DESPESA',
    ordem: 2,
    icone: 'casa',
    cor: '#06b6d4',
    itens: [
      item({ id: 20, nome: 'Luz', diaVencimento: 10 }),
      item({ id: 22, nome: 'Gás', arquivado: true }),
    ],
  },
  {
    id: 3,
    nome: 'Lazer',
    tipo: 'DESPESA',
    ordem: 3,
    icone: 'praia',
    cor: '#f97316',
    itens: [item({ id: 30, nome: 'Cinema', diaVencimento: null })],
  },
]

function responder(dados: CategoriaResponse[] = dadosIniciais()) {
  const estado = { dados }
  servidor.use(http.get('/api/categorias', () => HttpResponse.json(estado.dados)))
  return estado
}

const renderizar = () => renderComApp(<CategoriasPage />, '/categorias')

describe('CategoriasPage', () => {
  it('renderiza tabela de despesas por padrao com colunas Nome, Ícone, Cor e Ações', async () => {
    responder()
    renderizar()

    expect(await screen.findByRole('button', { name: /categoria de despesas/i })).toBeInTheDocument()
    expect(await screen.findByRole('columnheader', { name: 'Nome' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Ícone' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Cor' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Ações' })).toBeInTheDocument()

    // Categorias de despesas aparecem
    expect(screen.getByText('Moradia')).toBeInTheDocument()
    expect(screen.getByText('Lazer')).toBeInTheDocument()

    // Subcategorias aparecem aninhadas
    expect(screen.getByText('Luz')).toBeInTheDocument()
    expect(screen.getByText('Gás')).toBeInTheDocument()
    expect(screen.getByText('Arquivado')).toBeInTheDocument()

    // Receita não deve aparecer na tabela de despesas
    expect(screen.queryByText('Salários')).not.toBeInTheDocument()
  })

  it('alterna para tabela de receitas ao selecionar no dropdown da pilula', async () => {
    const user = userEvent.setup()
    responder()
    renderizar()

    const btnPilula = await screen.findByRole('button', { name: /categoria de despesas/i })
    await user.click(btnPilula)

    const opcaoReceitas = screen.getByRole('menuitem', { name: /categorias de receitas/i })
    await user.click(opcaoReceitas)

    expect(await screen.findByRole('button', { name: /categorias de receitas/i })).toBeInTheDocument()
    expect(screen.getByText('Salários')).toBeInTheDocument()
    expect(screen.getByText('Salário Mensal')).toBeInTheDocument()

    // Despesas somem da visão de receitas
    expect(screen.queryByText('Moradia')).not.toBeInTheDocument()
  })

  it('filtra categorias e subcategorias pelo termo de busca', async () => {
    const user = userEvent.setup()
    responder()
    renderizar()

    await screen.findByText('Moradia')

    const btnBusca = screen.getByRole('button', { name: /buscar categorias/i })
    await user.click(btnBusca)

    const inputBusca = screen.getByPlaceholderText(/filtrar categorias/i)
    await user.type(inputBusca, 'Cinema')

    // Somente a categoria Lazer (que contém o item Cinema) permanece visível
    expect(screen.getByText('Lazer')).toBeInTheDocument()
    expect(screen.getByText('Cinema')).toBeInTheDocument()
    expect(screen.queryByText('Moradia')).not.toBeInTheDocument()
  })

  it('abre modal de nova categoria pai ao clicar no botao + do cabecalho', async () => {
    const user = userEvent.setup()
    responder()
    renderizar()

    await screen.findByText('Moradia')
    const btnNovo = screen.getByRole('button', { name: 'Nova categoria' })
    await user.click(btnNovo)

    expect(await screen.findByRole('heading', { name: /cadastrar nova categoria/i })).toBeInTheDocument()
  })

  it('abre modal de nova subcategoria ao clicar no botao + da linha da categoria', async () => {
    const user = userEvent.setup()
    responder()
    renderizar()

    await screen.findByText('Moradia')
    const btnAddSub = screen.getByRole('button', { name: /adicionar subcategoria em moradia/i })
    await user.click(btnAddSub)

    expect(await screen.findByRole('heading', { name: /novo item/i })).toBeInTheDocument()
    expect(screen.getByText(/categoria moradia/i)).toBeInTheDocument()
  })

  it('permite recolher e expandir todas as subcategorias', async () => {
    const user = userEvent.setup()
    responder()
    renderizar()

    await screen.findByText('Luz')

    const btnAlternar = screen.getByRole('button', { name: /recolher todas as subcategorias/i })
    await user.click(btnAlternar)

    // Subcategorias ficam recolhidas
    expect(screen.queryByText('Luz')).not.toBeInTheDocument()
    expect(screen.getByText('Moradia')).toBeInTheDocument()

    // Clica de novo para expandir
    const btnExpandir = screen.getByRole('button', { name: /expandir todas as subcategorias/i })
    await user.click(btnExpandir)

    expect(await screen.findByText('Luz')).toBeInTheDocument()
  })
})
