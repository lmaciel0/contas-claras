import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ListaProjetos } from './ListaProjetos'
import type { Projeto } from './tipos'

const mockProjetos: Projeto[] = [
  {
    id: 1,
    titulo: 'Redesign da Dashboard',
    descricao: 'Atualizar gráficos e KPIs principais',
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
      { id: 10, titulo: 'Protótipo Figma', concluida: true, ordem: 0 },
      { id: 11, titulo: 'Aprovação com cliente', concluida: false, ordem: 1 },
    ],
    criadoEm: '2026-11-02T10:00:00Z',
    atualizadoEm: '2026-11-02T10:00:00Z',
  },
  {
    id: 2,
    titulo: 'API de Projetos',
    descricao: 'Endpoints REST e testes de integração',
    categoria: 'Backend',
    estagio: 'EM_ANDAMENTO',
    prioridade: 'URGENTE',
    cor: 'esmeralda',
    ordem: 0,
    prazo: '2026-11-15',
    porcentagemProgresso: 100,
    totalSubtarefas: 1,
    subtarefasConcluidas: 1,
    subtarefas: [
      { id: 20, titulo: 'Flyway migration', concluida: true, ordem: 0 },
    ],
    criadoEm: '2026-11-02T10:00:00Z',
    atualizadoEm: '2026-11-02T10:00:00Z',
  },
  {
    id: 3,
    titulo: 'Revisão de Segurança',
    descricao: null,
    categoria: null,
    estagio: 'CONCLUIDO',
    prioridade: 'BAIXA',
    cor: 'roxo',
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

describe('ListaProjetos', () => {
  it('renderiza acordeões para os 4 estágios com contadores correspondentes', () => {
    render(
      <ListaProjetos
        projetos={mockProjetos}
        aoMoverEstagio={vi.fn()}
        aoCriarNoEstagio={vi.fn()}
        aoClicarProjeto={vi.fn()}
        aoExcluirProjeto={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'A Fazer' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Em Andamento' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Em Revisão' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Concluído' })).toBeInTheDocument()

    // O projeto 1 está em A Fazer, o projeto 2 em Em Andamento e o projeto 3 em Concluído
    expect(screen.getByText('Redesign da Dashboard')).toBeInTheDocument()
    expect(screen.getByText('API de Projetos')).toBeInTheDocument()
    expect(screen.getByText('Revisão de Segurança')).toBeInTheDocument()
  })

  it('permite colapsar e expandir um acordeão ao clicar no cabeçalho', () => {
    render(
      <ListaProjetos
        projetos={mockProjetos}
        aoMoverEstagio={vi.fn()}
        aoCriarNoEstagio={vi.fn()}
        aoClicarProjeto={vi.fn()}
        aoExcluirProjeto={vi.fn()}
      />,
    )

    // Clica no botão de alternar do acordeão A Fazer
    const botaoToggleAFazer = screen.getByRole('button', { name: /alternar estágio a fazer/i })
    expect(screen.getByText('Redesign da Dashboard')).toBeInTheDocument()

    // Colapsa
    fireEvent.click(botaoToggleAFazer)
    expect(screen.queryByText('Redesign da Dashboard')).not.toBeInTheDocument()

    // Expande novamente
    fireEvent.click(botaoToggleAFazer)
    expect(screen.getByText('Redesign da Dashboard')).toBeInTheDocument()
  })

  it('chama aoClicarProjeto ao clicar no título de um projeto', () => {
    const aoClicar = vi.fn()
    render(
      <ListaProjetos
        projetos={mockProjetos}
        aoMoverEstagio={vi.fn()}
        aoCriarNoEstagio={vi.fn()}
        aoClicarProjeto={aoClicar}
        aoExcluirProjeto={vi.fn()}
      />,
    )

    const botaoTitulo = screen.getByRole('button', { name: 'Redesign da Dashboard' })
    fireEvent.click(botaoTitulo)

    expect(aoClicar).toHaveBeenCalledWith(mockProjetos[0])
  })

  it('permite alterar estágio via select inline e chama aoMoverEstagio', () => {
    const aoMover = vi.fn()
    render(
      <ListaProjetos
        projetos={mockProjetos}
        aoMoverEstagio={aoMover}
        aoCriarNoEstagio={vi.fn()}
        aoClicarProjeto={vi.fn()}
        aoExcluirProjeto={vi.fn()}
      />,
    )

    const selectEstagio = screen.getByLabelText('Estágio de Redesign da Dashboard')
    fireEvent.change(selectEstagio, { target: { value: 'EM_ANDAMENTO' } })

    expect(aoMover).toHaveBeenCalledWith(1, 'EM_ANDAMENTO')
  })

  it('permite expandir subtarefas e alternar checkbox chamando aoAlternarSubtarefa', () => {
    const aoAlternar = vi.fn()
    render(
      <ListaProjetos
        projetos={mockProjetos}
        aoMoverEstagio={vi.fn()}
        aoCriarNoEstagio={vi.fn()}
        aoClicarProjeto={vi.fn()}
        aoExcluirProjeto={vi.fn()}
        aoAlternarSubtarefa={aoAlternar}
      />,
    )

    // Abre painel de subtarefas do primeiro projeto
    const botaoSubtarefas = screen.getByRole('button', { name: /subtarefas de redesign da dashboard/i })
    fireEvent.click(botaoSubtarefas)

    expect(screen.getByText('Protótipo Figma')).toBeInTheDocument()
    expect(screen.getByText('Aprovação com cliente')).toBeInTheDocument()

    // Clica no checkbox da subtarefa 11
    const checkboxAprovacao = screen.getByLabelText('Alternar Aprovação com cliente')
    fireEvent.click(checkboxAprovacao)

    expect(aoAlternar).toHaveBeenCalledWith(1, 11)
  })

  it('chama aoCriarNoEstagio ao clicar no botão de adicionar projeto no cabeçalho do acordeão', () => {
    const aoCriar = vi.fn()
    render(
      <ListaProjetos
        projetos={mockProjetos}
        aoMoverEstagio={vi.fn()}
        aoCriarNoEstagio={aoCriar}
        aoClicarProjeto={vi.fn()}
        aoExcluirProjeto={vi.fn()}
      />,
    )

    const botaoAdicionar = screen.getByRole('button', { name: /adicionar projeto em a fazer/i })
    fireEvent.click(botaoAdicionar)

    expect(aoCriar).toHaveBeenCalledWith('A_FAZER')
  })

  it('chama aoExcluirProjeto ao clicar no botão de excluir projeto', () => {
    const aoExcluir = vi.fn()
    render(
      <ListaProjetos
        projetos={mockProjetos}
        aoMoverEstagio={vi.fn()}
        aoCriarNoEstagio={vi.fn()}
        aoClicarProjeto={vi.fn()}
        aoExcluirProjeto={aoExcluir}
      />,
    )

    const botaoExcluir = screen.getByRole('button', { name: /excluir redesign da dashboard/i })
    fireEvent.click(botaoExcluir)

    expect(aoExcluir).toHaveBeenCalledWith(1)
  })

  it('renderiza estado vazio quando a lista de projetos for vazia', () => {
    render(
      <ListaProjetos
        projetos={[]}
        aoMoverEstagio={vi.fn()}
        aoCriarNoEstagio={vi.fn()}
        aoClicarProjeto={vi.fn()}
        aoExcluirProjeto={vi.fn()}
      />,
    )

    expect(screen.getByText('Nenhum projeto encontrado')).toBeInTheDocument()
  })
})
