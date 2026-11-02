import { useState, type DragEvent } from 'react'
import { isoParaBr } from '../lancamentos/datas'
import type { CorProjeto, EstagioProjeto, PrioridadeProjeto, Projeto } from './tipos'

export interface CardProjetoProps {
  projeto: Projeto
  aoClicar?: (projeto: Projeto) => void
  aoMoverEstagio?: (projetoId: number, novoEstagio: EstagioProjeto) => void
  aoExcluir?: (projetoId: number) => void
}

const MAPA_CORES: Record<CorProjeto, { borda: string; bg: string; dot: string; progresso: string }> = {
  azul: { borda: 'border-blue-500/30', bg: 'bg-blue-500/10', dot: 'bg-blue-500', progresso: 'bg-blue-500' },
  esmeralda: {
    borda: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    dot: 'bg-emerald-500',
    progresso: 'bg-emerald-500',
  },
  indigo: {
    borda: 'border-indigo-500/30',
    bg: 'bg-indigo-500/10',
    dot: 'bg-indigo-500',
    progresso: 'bg-indigo-500',
  },
  ambar: { borda: 'border-amber-500/30', bg: 'bg-amber-500/10', dot: 'bg-amber-500', progresso: 'bg-amber-500' },
  rosa: { borda: 'border-pink-500/30', bg: 'bg-pink-500/10', dot: 'bg-pink-500', progresso: 'bg-pink-500' },
  roxo: { borda: 'border-purple-500/30', bg: 'bg-purple-500/10', dot: 'bg-purple-500', progresso: 'bg-purple-500' },
}

const ROTULO_PRIORIDADE: Record<PrioridadeProjeto, { rotulo: string; classes: string }> = {
  BAIXA: { rotulo: 'Baixa', classes: 'text-[var(--cor-mutado)] bg-[var(--cor-linha)]/50 border-transparent' },
  MEDIA: { rotulo: 'Média', classes: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
  ALTA: { rotulo: 'Alta', classes: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  URGENTE: { rotulo: 'Urgente', classes: 'text-red-500 bg-red-500/10 border-red-500/20 font-semibold' },
}

const ESTAGIOS: { valor: EstagioProjeto; rotulo: string }[] = [
  { valor: 'A_FAZER', rotulo: 'A Fazer' },
  { valor: 'EM_ANDAMENTO', rotulo: 'Em Andamento' },
  { valor: 'EM_REVISAO', rotulo: 'Em Revisão' },
  { valor: 'CONCLUIDO', rotulo: 'Concluído' },
]

export function CardProjeto({ projeto, aoClicar, aoMoverEstagio, aoExcluir }: Readonly<CardProjetoProps>) {
  const [menuAberto, setMenuAberto] = useState(false)
  const estiloCor = MAPA_CORES[projeto.cor] || MAPA_CORES.azul
  const prioridadeInfo = ROTULO_PRIORIDADE[projeto.prioridade] || ROTULO_PRIORIDADE.MEDIA

  function lidarDragStart(e: DragEvent<HTMLElement>) {
    e.dataTransfer.setData('text/plain', String(projeto.id))
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <article
      draggable
      onDragStart={lidarDragStart}
      className={`group relative flex flex-col gap-3 rounded-xl border bg-[var(--cor-card)] p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-grab active:cursor-grabbing border-[var(--cor-linha)] hover:${estiloCor.borda}`}
    >
      {/* Topo: Categoria + Menu de Ações */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className={`size-2 shrink-0 rounded-full ${estiloCor.dot}`} />
          {projeto.categoria && (
            <span className="truncate rounded-md bg-[var(--cor-fundo)] px-2 py-0.5 text-xs font-medium text-[var(--cor-mutado)] border border-[var(--cor-linha)]">
              {projeto.categoria}
            </span>
          )}
        </div>

        {/* Menu Acessível */}
        <div className="relative">
          <button
            type="button"
            aria-label="Opções do projeto"
            aria-expanded={menuAberto}
            onClick={(e) => {
              e.stopPropagation()
              setMenuAberto(!menuAberto)
            }}
            className="flex size-7 items-center justify-center rounded-lg text-[var(--cor-mutado)] opacity-80 transition-opacity hover:bg-[var(--cor-linha)] hover:text-[var(--cor-texto)] group-hover:opacity-100"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>

          {menuAberto && (
            <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-[var(--cor-linha)] bg-[var(--cor-card)] p-1 shadow-lg">
              <span className="block px-2 py-1 text-[11px] font-semibold text-[var(--cor-mutado)] uppercase tracking-wider">
                Mover para:
              </span>
              {ESTAGIOS.filter((itemEstagio) => itemEstagio.valor !== projeto.estagio).map((itemEstagio) => (
                <button
                  key={itemEstagio.valor}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    aoMoverEstagio?.(projeto.id, itemEstagio.valor)
                    setMenuAberto(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-[var(--cor-texto)] hover:bg-[var(--cor-fundo)] transition-colors"
                >
                  <span className="size-1.5 rounded-full bg-[var(--cor-mutado)]" />
                  Mover para {itemEstagio.rotulo}
                </button>
              ))}
              {aoExcluir && (
                <>
                  <div className="my-1 border-t border-[var(--cor-linha)]" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      aoExcluir(projeto.id)
                      setMenuAberto(false)
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    Excluir projeto
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Título e Descrição */}
      <div>
        <button
          type="button"
          onClick={() => aoClicar?.(projeto)}
          className="w-full text-left font-semibold text-sm text-[var(--cor-texto)] hover:text-[var(--cor-principal)] transition-colors focus:outline-hidden cursor-pointer"
        >
          <span className="line-clamp-2">{projeto.titulo}</span>
        </button>
        {projeto.descricao && (
          <p className="mt-1 line-clamp-2 text-xs text-[var(--cor-mutado)] leading-relaxed">
            {projeto.descricao}
          </p>
        )}
      </div>

      {/* Barra de Progresso */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-[var(--cor-mutado)]">
          <span className="font-medium text-[var(--cor-texto)]">{projeto.porcentagemProgresso}%</span>
          <span>
            {projeto.subtarefasConcluidas}/{projeto.totalSubtarefas}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--cor-linha)]">
          <div
            className={`h-full rounded-full transition-all duration-300 ${estiloCor.progresso}`}
            style={{ width: `${Math.min(100, Math.max(0, projeto.porcentagemProgresso))}%` }}
          />
        </div>
      </div>

      {/* Rodapé: Prioridade e Prazo */}
      <div className="mt-1 flex items-center justify-between gap-2 border-t border-[var(--cor-linha)] pt-2.5 text-xs">
        <span className={`rounded-full px-2 py-0.5 text-[11px] border ${prioridadeInfo.classes}`}>
          {prioridadeInfo.rotulo}
        </span>

        {projeto.prazo && (
          <div className="flex items-center gap-1.5 text-[var(--cor-mutado)]">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{isoParaBr(projeto.prazo)}</span>
          </div>
        )}
      </div>
    </article>
  )
}
