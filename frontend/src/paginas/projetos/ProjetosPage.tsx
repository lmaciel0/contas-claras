import { useDeferredValue, useState, type ReactNode } from 'react'
import { Carregando } from '../../componentes/Carregando'
import { ListaProjetos } from './ListaProjetos'
import { ProjetoModal } from './ProjetoModal'
import { QuadroKanban } from './QuadroKanban'
import type { EstagioProjeto, PrioridadeProjeto, Projeto } from './tipos'
import {
  useAdicionarSubtarefa,
  useAlternarSubtarefa,
  useAtualizarProjeto,
  useCriarProjeto,
  useExcluirProjeto,
  useExcluirSubtarefa,
  useMoverEstagioProjeto,
  useProjetos,
} from './useProjetos'

export function ProjetosPage() {
  const [busca, setBusca] = useState('')
  const buscaDiferida = useDeferredValue(busca)
  const [prioridadeFiltro, setPrioridadeFiltro] = useState<PrioridadeProjeto | ''>('')
  const [visao, setVisao] = useState<'quadro' | 'lista' | 'timeline'>('quadro')

  const [modalAberto, setModalAberto] = useState(false)
  const [projetoEdicao, setProjetoEdicao] = useState<Projeto | null>(null)
  const [estagioPadrao, setEstagioPadrao] = useState<EstagioProjeto>('A_FAZER')

  const filtro = {
    busca: buscaDiferida.trim() || undefined,
    prioridade: prioridadeFiltro || undefined,
  }

  const { data: projetos = [], isLoading, isError } = useProjetos(filtro)

  const moverEstagio = useMoverEstagioProjeto()
  const criarProjeto = useCriarProjeto()
  const atualizarProjeto = useAtualizarProjeto()
  const excluirProjeto = useExcluirProjeto()
  const adicionarSubtarefa = useAdicionarSubtarefa()
  const alternarSubtarefa = useAlternarSubtarefa()
  const excluirSubtarefa = useExcluirSubtarefa()

  // Se o projeto aberto no modal for modificado no cache de projetos, sincroniza a referência
  const projetoAtual = projetoEdicao ? projetos.find((p) => p.id === projetoEdicao.id) ?? projetoEdicao : null

  function abrirCriacao(estagio: EstagioProjeto = 'A_FAZER') {
    setProjetoEdicao(null)
    setEstagioPadrao(estagio)
    setModalAberto(true)
  }

  function abrirEdicao(projeto: Projeto) {
    setProjetoEdicao(projeto)
    setModalAberto(true)
  }

  let conteudoPrincipal: ReactNode
  if (isLoading && projetos.length === 0) {
    conteudoPrincipal = (
      <div className="flex h-64 items-center justify-center">
        <Carregando />
      </div>
    )
  } else if (isError) {
    conteudoPrincipal = (
      <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-[var(--cor-negativo)] bg-[var(--cor-erro-fundo)] p-6 text-center text-xs text-[var(--cor-texto)]">
        <p className="font-semibold">Erro ao carregar projetos</p>
        <p className="mt-1 text-[var(--cor-mutado)]">Não foi possível carregar a lista de projetos. Tente novamente mais tarde.</p>
      </div>
    )
  } else if (visao === 'lista') {
    conteudoPrincipal = (
      <ListaProjetos
        projetos={projetos}
        aoMoverEstagio={(id, novoEstagio) => moverEstagio.mutate({ id, estagio: novoEstagio })}
        aoCriarNoEstagio={(estagio) => abrirCriacao(estagio)}
        aoClicarProjeto={(projeto) => abrirEdicao(projeto)}
        aoExcluirProjeto={(id) => excluirProjeto.mutate(id)}
        aoAlternarSubtarefa={(id, subId) => alternarSubtarefa.mutate({ projetoId: id, subtarefaId: subId })}
      />
    )
  } else {
    conteudoPrincipal = (
      <QuadroKanban
        projetos={projetos}
        aoMover={(id, novoEstagio) => moverEstagio.mutate({ id, estagio: novoEstagio })}
        aoCriarNoEstagio={(estagio) => abrirCriacao(estagio)}
        aoClicarCard={(projeto) => abrirEdicao(projeto)}
        aoExcluirCard={(id) => excluirProjeto.mutate(id)}
      />
    )
  }

  return (
    <div className="flex flex-1 flex-col px-4 py-6 sm:px-8 max-w-7xl mx-auto w-full">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--cor-linha)] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--cor-texto)]">Projetos</h1>
            <span className="rounded-full bg-[var(--cor-fundo)] px-2.5 py-0.5 text-xs font-semibold text-[var(--cor-mutado)] border border-[var(--cor-linha)]">
              {projetos.length} {projetos.length === 1 ? 'projeto' : 'projetos'}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--cor-mutado)]">
            Acompanhe o andamento de suas metas e entregas no fluxo Kanban.
          </p>
        </div>

        {/* Botão Novo Projeto */}
        <button
          type="button"
          onClick={() => abrirCriacao('A_FAZER')}
          className="flex items-center justify-center gap-2 rounded-xl bg-[var(--cor-principal)] px-4 py-2.5 text-sm font-semibold text-[var(--cor-sobre-principal)] shadow-sm hover:brightness-110 active:scale-98 transition-all shrink-0"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          + Novo projeto
        </button>
      </div>

      {/* Barra de Filtros e Alternador de Visões */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Abas de Visão */}
        <div role="tablist" aria-label="Visões do projeto" className="flex items-center gap-1 rounded-xl bg-[var(--cor-fundo)] p-1 border border-[var(--cor-linha)] self-start">
          <button
            type="button"
            role="tab"
            aria-selected={visao === 'quadro'}
            onClick={() => setVisao('quadro')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              visao === 'quadro'
                ? 'bg-[var(--cor-card)] text-[var(--cor-texto)] shadow-xs'
                : 'text-[var(--cor-mutado)] hover:text-[var(--cor-texto)]'
            }`}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
            Quadro
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={visao === 'lista'}
            onClick={() => setVisao('lista')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              visao === 'lista'
                ? 'bg-[var(--cor-card)] text-[var(--cor-texto)] shadow-xs'
                : 'text-[var(--cor-mutado)] hover:text-[var(--cor-texto)]'
            }`}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            Lista
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={false}
            disabled
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--cor-mutado)] opacity-60 cursor-not-allowed"
          >
            <span>Linha do Tempo</span>
            <span className="rounded bg-[var(--cor-linha)] px-1 py-0.2 text-[10px]">Em breve</span>
          </button>
        </div>

        {/* Busca e Filtros */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Campo de Busca */}
          <div className="relative min-w-[200px] flex-1 sm:w-64">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cor-mutado)] pointer-events-none"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              aria-label="Buscar projetos"
              placeholder="Buscar projetos..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-card)] pl-9 pr-3.5 py-1.5 text-xs text-[var(--cor-texto)] placeholder:text-[var(--cor-mutado)] focus:border-[var(--cor-principal)] focus:outline-hidden"
            />
          </div>

          {/* Filtro de Prioridade */}
          <select
            aria-label="Filtrar por prioridade"
            value={prioridadeFiltro}
            onChange={(e) => setPrioridadeFiltro(e.target.value as PrioridadeProjeto | '')}
            className="rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-card)] px-3 py-1.5 text-xs text-[var(--cor-texto)] focus:border-[var(--cor-principal)] focus:outline-hidden cursor-pointer"
          >
            <option value="">Todas as prioridades</option>
            <option value="BAIXA">Baixa</option>
            <option value="MEDIA">Média</option>
            <option value="ALTA">Alta</option>
            <option value="URGENTE">Urgente</option>
          </select>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="mt-6 flex-1">
        {conteudoPrincipal}
      </div>

      {/* Modal de Criação / Edição */}
      <ProjetoModal
        aberto={modalAberto}
        projeto={projetoAtual}
        estagioPadrao={estagioPadrao}
        aoFechar={() => setModalAberto(false)}
        aoSalvarCriacao={(req) => {
          criarProjeto.mutate(req, {
            onSuccess: () => setModalAberto(false),
          })
        }}
        aoSalvarEdicao={(id, req) => {
          atualizarProjeto.mutate(
            { id, ...req },
            {
              onSuccess: () => setModalAberto(false),
            },
          )
        }}
        aoAlternarSubtarefa={(projId, subId) => {
          alternarSubtarefa.mutate({ projetoId: projId, subtarefaId: subId })
        }}
        aoAdicionarSubtarefa={(projId, tit) => {
          adicionarSubtarefa.mutate({ projetoId: projId, titulo: tit })
        }}
        aoExcluirSubtarefa={(projId, subId) => {
          excluirSubtarefa.mutate({ projetoId: projId, subtarefaId: subId })
        }}
        salvando={criarProjeto.isPending || atualizarProjeto.isPending}
      />
    </div>
  )
}
