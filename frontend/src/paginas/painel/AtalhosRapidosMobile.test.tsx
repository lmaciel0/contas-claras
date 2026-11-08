import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { describe, expect, it, beforeEach } from 'vitest'
import { PreferenciasProvider } from '../../preferencias/PreferenciasContext'
import { renderComApp } from '../../teste/render'
import { AtalhosRapidosMobile } from './AtalhosRapidosMobile'

function renderizar() {
  return renderComApp(
    <PreferenciasProvider>
      <Routes>
        <Route path="/" element={<AtalhosRapidosMobile />} />
        <Route path="/lancamentos/novo" element={<h1>Novo Lancamento</h1>} />
        <Route path="/cartoes" element={<h1>Cartoes</h1>} />
        <Route path="/tarefas" element={<h1>Tarefas</h1>} />
        <Route path="/notas" element={<h1>Notas</h1>} />
        <Route path="/orcamento" element={<h1>Orcamento</h1>} />
      </Routes>
    </PreferenciasProvider>,
    '/?ano=2026&mes=10',
  )
}

describe('AtalhosRapidosMobile', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renderiza os 4 atalhos padrão na tela inicial', async () => {
    renderizar()

    expect(screen.getByRole('region', { name: 'Acesso rápido' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '+ Despesa' })).toHaveAttribute(
      'href',
      '/lancamentos/novo?ano=2026&mes=10',
    )
    expect(screen.getByRole('link', { name: 'Cartões' })).toHaveAttribute(
      'href',
      '/cartoes?ano=2026&mes=10',
    )
    expect(screen.getByRole('link', { name: '+ Tarefa' })).toHaveAttribute('href', '/tarefas?nova=1')
    expect(screen.getByRole('link', { name: '+ Nota' })).toHaveAttribute('href', '/notas')
  })

  it('permite abrir o modal de personalização e alterar os atalhos exibidos', async () => {
    const user = userEvent.setup()
    renderizar()

    // Clica no botão Personalizar
    const botaoPersonalizar = screen.getByRole('button', { name: 'Personalizar atalhos' })
    await user.click(botaoPersonalizar)

    // Modal aberto
    const modal = screen.getByRole('dialog', { name: /Personalizar/i })
    expect(modal).toBeInTheDocument()

    // Clica para desmarcar "+ Nota" e marcar "Orçamento"
    const itemNota = within(modal).getByRole('button', { name: /\+ Nota/i })
    await user.click(itemNota)

    const itemOrcamento = within(modal).getByRole('button', { name: /Orçamento/i })
    await user.click(itemOrcamento)

    // Clica em salvar
    const botaoSalvar = within(modal).getByRole('button', { name: /Salvar 4 atalhos/i })
    await user.click(botaoSalvar)

    // Modal fecha e os novos atalhos são exibidos
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Orçamento' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '+ Nota' })).not.toBeInTheDocument()
  })
})
