import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CardProjeto } from './CardProjeto'
import type { Projeto } from './tipos'

const mockProjeto: Projeto = {
  id: 1,
  titulo: 'Criar Landing Page',
  descricao: 'Design e implementação da nova home',
  categoria: 'Design',
  estagio: 'A_FAZER',
  prioridade: 'ALTA',
  cor: 'azul',
  ordem: 0,
  prazo: '2026-11-20',
  porcentagemProgresso: 50,
  totalSubtarefas: 2,
  subtarefasConcluidas: 1,
  subtarefas: [
    { id: 10, titulo: 'Figma', concluida: true, ordem: 0 },
    { id: 11, titulo: 'CSS', concluida: false, ordem: 1 },
  ],
  criadoEm: '2026-11-02T10:00:00Z',
  atualizadoEm: '2026-11-02T10:00:00Z',
}

describe('CardProjeto', () => {
  it('renderiza título, descrição, categoria, badge de prioridade e progresso', () => {
    render(<CardProjeto projeto={mockProjeto} />)

    expect(screen.getByText('Criar Landing Page')).toBeInTheDocument()
    expect(screen.getByText('Design e implementação da nova home')).toBeInTheDocument()
    expect(screen.getByText('Design')).toBeInTheDocument()
    expect(screen.getByText('Alta')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('1/2')).toBeInTheDocument()
    expect(screen.getByText('20/11/2026')).toBeInTheDocument()
  })

  it('chama aoClicar ao clicar no card', () => {
    const aoClicar = vi.fn()
    render(<CardProjeto projeto={mockProjeto} aoClicar={aoClicar} />)

    fireEvent.click(screen.getByText('Criar Landing Page'))
    expect(aoClicar).toHaveBeenCalledWith(mockProjeto)
  })

  it('permite arrastar e preenche dataTransfer no dragstart', () => {
    render(<CardProjeto projeto={mockProjeto} />)

    const card = screen.getByRole('article')
    expect(card).toHaveAttribute('draggable', 'true')

    const setData = vi.fn()
    fireEvent.dragStart(card, {
      dataTransfer: { setData, effectAllowed: '' },
    })

    expect(setData).toHaveBeenCalledWith('text/plain', '1')
  })

  it('permite mover de estágio através de menu acessível por teclado', () => {
    const aoMover = vi.fn()
    render(<CardProjeto projeto={mockProjeto} aoMoverEstagio={aoMover} />)

    const botaoAcoes = screen.getByRole('button', { name: /opções do projeto/i })
    fireEvent.click(botaoAcoes)

    const opcaoEmAndamento = screen.getByRole('button', { name: /mover para em andamento/i })
    fireEvent.click(opcaoEmAndamento)

    expect(aoMover).toHaveBeenCalledWith(1, 'EM_ANDAMENTO')
  })
})
