import { createEvent, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ColunaKanban } from './ColunaKanban'
import type { Projeto } from './tipos'

const mockProjetos: Projeto[] = [
  {
    id: 1,
    titulo: 'Projeto 1',
    descricao: null,
    categoria: 'Dev',
    estagio: 'A_FAZER',
    prioridade: 'MEDIA',
    cor: 'azul',
    ordem: 0,
    prazo: null,
    porcentagemProgresso: 0,
    totalSubtarefas: 0,
    subtarefasConcluidas: 0,
    subtarefas: [],
    criadoEm: '2026-11-02T10:00:00Z',
    atualizadoEm: '2026-11-02T10:00:00Z',
  },
]

describe('ColunaKanban', () => {
  it('renderiza título, contador e cards da coluna', () => {
    render(
      <ColunaKanban
        estagio="A_FAZER"
        titulo="A Fazer"
        projetos={mockProjetos}
      />,
    )

    expect(screen.getByText('A Fazer')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('Projeto 1')).toBeInTheDocument()
  })

  it('dispara aoCriarNoEstagio ao clicar no botão +', () => {
    const aoCriar = vi.fn()
    render(
      <ColunaKanban
        estagio="A_FAZER"
        titulo="A Fazer"
        projetos={[]}
        aoCriarNoEstagio={aoCriar}
      />,
    )

    const botaoNovo = screen.getByRole('button', { name: /adicionar projeto em a fazer/i })
    fireEvent.click(botaoNovo)

    expect(aoCriar).toHaveBeenCalledWith('A_FAZER')
  })

  it('gerencia eventos de dragover e drop chamando aoMover', () => {
    const aoMover = vi.fn()
    render(
      <ColunaKanban
        estagio="EM_ANDAMENTO"
        titulo="Em Andamento"
        projetos={[]}
        aoMover={aoMover}
      />,
    )

    const dropzone = screen.getByTestId('coluna-dropzone-EM_ANDAMENTO')

    // Drag over deve prevenir default
    const dragOverEvt = createEvent.dragOver(dropzone)
    fireEvent(dropzone, dragOverEvt)
    expect(dragOverEvt.defaultPrevented).toBe(true)

    // Drop deve extrair o id e chamar aoMover
    fireEvent.drop(dropzone, {
      dataTransfer: { getData: () => '1' },
    })

    expect(aoMover).toHaveBeenCalledWith(1, 'EM_ANDAMENTO')
  })

  it('exibe mensagem quando não há projetos na coluna', () => {
    render(
      <ColunaKanban
        estagio="CONCLUIDO"
        titulo="Concluído"
        projetos={[]}
      />,
    )

    expect(screen.getByText(/nenhum projeto/i)).toBeInTheDocument()
  })
})
