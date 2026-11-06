import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Outlet, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { ContextoShell } from '../../layout/contextoShell'
import { renderComApp } from '../../teste/render'
import { MaisPage } from './MaisPage'

function renderizar(rota = '/mais', contexto: Partial<ContextoShell> = {}) {
  const completo: ContextoShell = {
    nomeUsuario: 'Ana Souza',
    aoSair: vi.fn(),
    aoAbrirPreferencias: vi.fn(),
    ...contexto,
  }
  renderComApp(
    <Routes>
      <Route element={<Outlet context={completo} />}>
        <Route path="/mais" element={<MaisPage />} />
      </Route>
    </Routes>,
    rota,
  )
  return completo
}

describe('MaisPage', () => {
  it('tem o título "Mais" como h1', () => {
    renderizar()
    expect(screen.getByRole('heading', { level: 1, name: 'Mais' })).toBeInTheDocument()
  })

  it('mostra o nome do usuário e a inicial no cartão', () => {
    renderizar()
    expect(screen.getByText('Ana Souza')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('lista os atalhos com o destino certo', () => {
    renderizar()
    expect(screen.getByRole('link', { name: 'Tarefas' })).toHaveAttribute('href', '/tarefas')
    expect(screen.getByRole('link', { name: 'Projetos' })).toHaveAttribute('href', '/projetos')
    expect(screen.getByRole('link', { name: 'Visão geral' })).toHaveAttribute('href', expect.stringMatching(/^\/financeiro\?ano=\d{4}&mes=\d{1,2}$/))
    expect(screen.getByRole('link', { name: 'Cartões' })).toHaveAttribute('href', expect.stringMatching(/^\/cartoes\?ano=\d{4}&mes=\d{1,2}$/))
    expect(screen.getByRole('link', { name: 'Categorias' })).toHaveAttribute('href', '/categorias')
    expect(screen.getByRole('link', { name: 'Relatórios' })).toHaveAttribute('href', '/relatorios')
  })

  it('Visão geral e Cartões levam o mês que está na URL', () => {
    renderizar('/mais?ano=2026&mes=10')
    expect(screen.getByRole('link', { name: 'Visão geral' })).toHaveAttribute('href', '/financeiro?ano=2026&mes=10')
    expect(screen.getByRole('link', { name: 'Cartões' })).toHaveAttribute('href', '/cartoes?ano=2026&mes=10')
    expect(screen.getByRole('link', { name: 'Tarefas' })).toHaveAttribute('href', '/tarefas')
  })

  it('tem os links de conta e a política de privacidade', () => {
    renderizar()
    expect(screen.getByRole('link', { name: 'Alterar senha' })).toHaveAttribute('href', '/conta/senha')
    expect(screen.getByRole('link', { name: 'Excluir conta' })).toHaveAttribute('href', '/conta/excluir')
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade')
  })

  it('"Preferências" chama aoAbrirPreferencias', async () => {
    const { aoAbrirPreferencias } = renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Preferências' }))
    expect(aoAbrirPreferencias).toHaveBeenCalledTimes(1)
  })

  it('"Sair" chama aoSair', async () => {
    const { aoSair } = renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))
    expect(aoSair).toHaveBeenCalledTimes(1)
  })

  it('cada linha tem alvo de toque de 44 px e usa só tokens de cor', () => {
    renderizar()
    for (const elemento of [...screen.getAllByRole('link'), ...screen.getAllByRole('button')]) {
      expect(elemento).toHaveClass('min-h-11')
      expect(elemento.className).not.toMatch(/#[0-9a-f]{3,6}|rgb\(|(bg|text|border)-(white|black|gray|slate|zinc|red)/i)
    }
  })

  it('aguenta nome ausente sem quebrar', () => {
    renderizar('/mais', { nomeUsuario: undefined })
    expect(screen.getByRole('heading', { name: 'Mais' })).toBeInTheDocument()
  })
})
