import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderComApp } from '../teste/render'
import { Sidebar } from './Sidebar'

beforeEach(() => {
  localStorage.clear()
})

function renderizar(rota = '/?ano=2026&mes=10', nome = 'Ana', aoSair = vi.fn()) {
  renderComApp(<Sidebar nomeUsuario={nome} aoSair={aoSair} />, rota)
  return { aoSair }
}

describe('Sidebar', () => {
  it('lista os itens na ordem Início, Tarefas, Notas, Visão geral, Orçamento, Cartões, Categorias, Relatórios', () => {
    renderizar()

    const nav = screen.getByRole('navigation', { name: 'Menu principal' })

    expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Início',
      'Tarefas',
      'Notas',
      'Visão geral',
      'Orçamento',
      'Cartões',
      'Categorias',
      'Relatórios',
    ])
    expect(within(nav).getByText('Financeiro')).toBeInTheDocument()
  })

  it('não lista módulos que ainda não existem', () => {
    renderizar()

    for (const nome of ['Projetos', 'Calendário']) {
      expect(screen.queryByText(new RegExp(nome))).not.toBeInTheDocument()
    }
  })

  it('marca o item da rota atual com aria-current="page"', () => {
    renderizar('/cartoes?ano=2026&mes=10')

    const atuais = screen.getAllByRole('link').filter((link) => link.getAttribute('aria-current') === 'page')

    expect(atuais.map((link) => link.textContent)).toEqual(['Cartões'])
  })

  it('links financeiros preservam o mês da URL', () => {
    renderizar('/?ano=2026&mes=10')

    expect(screen.getByRole('link', { name: 'Orçamento' })).toHaveAttribute('href', '/lancamentos?ano=2026&mes=10')
    expect(screen.getByRole('link', { name: 'Visão geral' })).toHaveAttribute('href', '/financeiro?ano=2026&mes=10')
    expect(screen.getByRole('link', { name: 'Cartões' })).toHaveAttribute('href', '/cartoes?ano=2026&mes=10')
    expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Categorias' })).toHaveAttribute('href', '/categorias')
    expect(screen.getByRole('link', { name: 'Relatórios' })).toHaveAttribute('href', '/relatorios')
  })

  it('mostra o nome, o switch de tema, Alterar senha e Sair', () => {
    renderizar()

    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Tema escuro' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Alterar senha' })).toHaveAttribute('href', '/conta/senha')
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
  })

  it('Sair chama aoSair', async () => {
    const { aoSair } = renderizar()

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))

    expect(aoSair).toHaveBeenCalledTimes(1)
  })

  it('aoNavegar roda ao clicar num link', async () => {
    const aoNavegar = vi.fn()
    renderComApp(<Sidebar nomeUsuario="Ana" aoSair={vi.fn()} aoNavegar={aoNavegar} />, '/')

    await userEvent.click(screen.getByRole('link', { name: 'Cartões' }))
    await userEvent.click(screen.getByRole('link', { name: 'Alterar senha' }))

    expect(aoNavegar).toHaveBeenCalledTimes(2)
  })

  it('nome muito longo recebe a classe truncate', () => {
    const nome = 'Maria Aparecida de Nazaré Albuquerque Cavalcanti de Souza'
    renderizar('/', nome)

    expect(screen.getByText(nome)).toHaveClass('truncate')
  })
})
