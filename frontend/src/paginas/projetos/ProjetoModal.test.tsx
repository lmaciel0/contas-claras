import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProjetoModal } from './ProjetoModal'
import type { Projeto } from './tipos'

const mockProjeto: Projeto = {
  id: 1,
  titulo: 'Projeto Existente',
  descricao: 'Descrição longa do projeto',
  categoria: 'Engenharia',
  estagio: 'EM_ANDAMENTO',
  prioridade: 'URGENTE',
  cor: 'rosa',
  ordem: 0,
  prazo: '2026-12-31',
  porcentagemProgresso: 50,
  totalSubtarefas: 2,
  subtarefasConcluidas: 1,
  subtarefas: [
    { id: 10, titulo: 'Subtarefa 1', concluida: true, ordem: 0 },
    { id: 11, titulo: 'Subtarefa 2', concluida: false, ordem: 1 },
  ],
  criadoEm: '2026-11-02T10:00:00Z',
  atualizadoEm: '2026-11-02T10:00:00Z',
}

describe('ProjetoModal', () => {
  it('renderiza modo de criação e chama aoSalvarCriacao ao submeter', () => {
    const aoSalvar = vi.fn()
    const aoFechar = vi.fn()

    render(
      <ProjetoModal
        aberto={true}
        projeto={null}
        estagioPadrao="A_FAZER"
        aoFechar={aoFechar}
        aoSalvarCriacao={aoSalvar}
      />,
    )

    expect(screen.getByText('Novo Projeto')).toBeInTheDocument()

    // Preenche título
    const inputTitulo = screen.getByLabelText(/título/i)
    fireEvent.change(inputTitulo, { target: { value: 'Meu Novo Projeto' } })

    // Preenche categoria
    const inputCategoria = screen.getByLabelText(/categoria/i)
    fireEvent.change(inputCategoria, { target: { value: 'Design' } })

    // Adiciona subtarefa preliminar
    const inputSub = screen.getByPlaceholderText(/adicionar subtarefa/i)
    fireEvent.change(inputSub, { target: { value: 'Primeiro passo' } })
    fireEvent.keyDown(inputSub, { key: 'Enter', code: 'Enter' })

    expect(screen.getByText('Primeiro passo')).toBeInTheDocument()

    // Submete formulário
    const botaoSalvar = screen.getByRole('button', { name: /criar projeto/i })
    fireEvent.click(botaoSalvar)

    expect(aoSalvar).toHaveBeenCalledWith(
      expect.objectContaining({
        titulo: 'Meu Novo Projeto',
        categoria: 'Design',
        estagio: 'A_FAZER',
        subtarefas: ['Primeiro passo'],
      }),
    )
  })

  it('permite remover subtarefa adicionada na criação', () => {
    render(
      <ProjetoModal
        aberto={true}
        projeto={null}
        aoFechar={vi.fn()}
        aoSalvarCriacao={vi.fn()}
      />,
    )

    const inputSub = screen.getByPlaceholderText(/adicionar subtarefa/i)
    fireEvent.change(inputSub, { target: { value: 'Item para deletar' } })
    fireEvent.keyDown(inputSub, { key: 'Enter', code: 'Enter' })

    expect(screen.getByText('Item para deletar')).toBeInTheDocument()

    const botaoRemover = screen.getByRole('button', { name: /remover item para deletar/i })
    fireEvent.click(botaoRemover)

    expect(screen.queryByText('Item para deletar')).not.toBeInTheDocument()
  })

  it('renderiza modo de edição com dados existentes e gerencia subtarefas', () => {
    const aoSalvarEdicao = vi.fn()
    const aoAlternarSub = vi.fn()
    const aoAdicionarSub = vi.fn()
    const aoExcluirSub = vi.fn()

    render(
      <ProjetoModal
        aberto={true}
        projeto={mockProjeto}
        aoFechar={vi.fn()}
        aoSalvarEdicao={aoSalvarEdicao}
        aoAlternarSubtarefa={aoAlternarSub}
        aoAdicionarSubtarefa={aoAdicionarSub}
        aoExcluirSubtarefa={aoExcluirSub}
      />,
    )

    expect(screen.getByText('Editar Projeto')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Projeto Existente')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Descrição longa do projeto')).toBeInTheDocument()
    expect(screen.getByText('Subtarefa 1')).toBeInTheDocument()
    expect(screen.getByText('Subtarefa 2')).toBeInTheDocument()

    // Alternar subtarefa
    const checkboxSub2 = screen.getByRole('checkbox', { name: /alternar subtarefa 2/i })
    fireEvent.click(checkboxSub2)
    expect(aoAlternarSub).toHaveBeenCalledWith(1, 11)

    // Adicionar subtarefa no modo edição
    const inputNovaSub = screen.getByPlaceholderText(/adicionar subtarefa/i)
    fireEvent.change(inputNovaSub, { target: { value: 'Subtarefa 3' } })
    fireEvent.keyDown(inputNovaSub, { key: 'Enter', code: 'Enter' })
    expect(aoAdicionarSub).toHaveBeenCalledWith(1, 'Subtarefa 3')

    // Salvar alterações
    const botaoSalvar = screen.getByRole('button', { name: /salvar alterações/i })
    fireEvent.click(botaoSalvar)

    expect(aoSalvarEdicao).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        titulo: 'Projeto Existente',
        descricao: 'Descrição longa do projeto',
      }),
    )
  })

  it('fecha ao pressionar Escape ou clicar em fechar', () => {
    const aoFechar = vi.fn()
    render(
      <ProjetoModal
        aberto={true}
        projeto={null}
        aoFechar={aoFechar}
        aoSalvarCriacao={vi.fn()}
      />,
    )

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
    expect(aoFechar).toHaveBeenCalledTimes(1)

    const botaoFechar = screen.getByRole('button', { name: /fechar modal/i })
    fireEvent.click(botaoFechar)
    expect(aoFechar).toHaveBeenCalledTimes(2)
  })
})
