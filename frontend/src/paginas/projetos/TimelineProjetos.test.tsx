import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TimelineProjetos } from './TimelineProjetos'
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
    criadoEm: '2026-11-01T10:00:00Z',
    atualizadoEm: '2026-11-01T10:00:00Z',
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
    criadoEm: '2026-11-05T10:00:00Z',
    atualizadoEm: '2026-11-05T10:00:00Z',
  },
  {
    id: 3,
    titulo: 'Auditoria de Segurança',
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
    criadoEm: '2026-11-10T10:00:00Z',
    atualizadoEm: '2026-11-10T10:00:00Z',
  },
]

describe('TimelineProjetos', () => {
  it('renderiza barra de navegação temporal com controles e período', () => {
    render(
      <TimelineProjetos
        projetos={mockProjetos}
        aoClicarProjeto={vi.fn()}
        aoCriarProjeto={vi.fn()}
      />
    )

    expect(screen.getByRole('region', { name: /linha do tempo de projetos/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /período anterior/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /próximo período/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /hoje/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /adicionar projeto/i })).toBeInTheDocument()
  })

  it('renderiza os projetos na lista lateral com seus títulos e progresso', () => {
    render(
      <TimelineProjetos
        projetos={mockProjetos}
        aoClicarProjeto={vi.fn()}
        aoCriarProjeto={vi.fn()}
      />
    )

    expect(screen.getAllByText('Redesign da Dashboard').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('API de Projetos').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Auditoria de Segurança').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: /editar redesign da dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /editar api de projetos/i })).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('renderiza as barras de projeto proporcionais na grade de tempo', () => {
    render(
      <TimelineProjetos
        projetos={mockProjetos}
        aoClicarProjeto={vi.fn()}
        aoCriarProjeto={vi.fn()}
      />
    )

    const barras = screen.getAllByRole('button', { name: /ver projeto/i })
    expect(barras.length).toBeGreaterThanOrEqual(3)
  })

  it('exibe indicador de sem prazo definido para projetos sem prazo', () => {
    render(
      <TimelineProjetos
        projetos={mockProjetos}
        aoClicarProjeto={vi.fn()}
        aoCriarProjeto={vi.fn()}
      />
    )

    expect(screen.getByText(/sem prazo/i)).toBeInTheDocument()
  })

  it('chama aoClicarProjeto quando um projeto da lista ou barra é clicado', () => {
    const aoClicarProjeto = vi.fn()
    render(
      <TimelineProjetos
        projetos={mockProjetos}
        aoClicarProjeto={aoClicarProjeto}
        aoCriarProjeto={vi.fn()}
      />
    )

    const botaoProjeto = screen.getByRole('button', { name: /editar redesign da dashboard/i })
    fireEvent.click(botaoProjeto)

    expect(aoClicarProjeto).toHaveBeenCalledTimes(1)
    expect(aoClicarProjeto).toHaveBeenCalledWith(mockProjetos[0])
  })

  it('chama aoCriarProjeto ao clicar no botão de novo projeto', () => {
    const aoCriarProjeto = vi.fn()
    render(
      <TimelineProjetos
        projetos={mockProjetos}
        aoClicarProjeto={vi.fn()}
        aoCriarProjeto={aoCriarProjeto}
      />
    )

    const botaoCriar = screen.getByRole('button', { name: /adicionar projeto/i })
    fireEvent.click(botaoCriar)

    expect(aoCriarProjeto).toHaveBeenCalledTimes(1)
  })

  it('permite alternar entre escala mensal e trimestral', () => {
    render(
      <TimelineProjetos
        projetos={mockProjetos}
        aoClicarProjeto={vi.fn()}
        aoCriarProjeto={vi.fn()}
      />
    )

    const btnTrimestre = screen.getByRole('button', { name: /escala trimestre/i })
    fireEvent.click(btnTrimestre)
    expect(btnTrimestre).toHaveAttribute('aria-pressed', 'true')

    const btnMes = screen.getByRole('button', { name: /escala mês/i })
    fireEvent.click(btnMes)
    expect(btnMes).toHaveAttribute('aria-pressed', 'true')
  })

  it('permite navegar entre períodos com botões anterior, próximo e hoje', () => {
    render(
      <TimelineProjetos
        projetos={mockProjetos}
        aoClicarProjeto={vi.fn()}
        aoCriarProjeto={vi.fn()}
      />
    )

    const btnProximo = screen.getByRole('button', { name: /próximo período/i })
    const btnAnterior = screen.getByRole('button', { name: /período anterior/i })
    const btnHoje = screen.getByRole('button', { name: /hoje/i })

    fireEvent.click(btnProximo)
    fireEvent.click(btnAnterior)
    fireEvent.click(btnHoje)
  })

  it('renderiza estado vazio quando a lista de projetos estiver vazia', () => {
    const aoCriarProjeto = vi.fn()
    render(
      <TimelineProjetos
        projetos={[]}
        aoClicarProjeto={vi.fn()}
        aoCriarProjeto={aoCriarProjeto}
      />
    )

    expect(screen.getByText(/nenhum projeto para exibir na linha do tempo/i)).toBeInTheDocument()
    const botaoCriarVazio = screen.getByRole('button', { name: /criar primeiro projeto/i })
    fireEvent.click(botaoCriarVazio)
    expect(aoCriarProjeto).toHaveBeenCalledTimes(1)
  })
})
