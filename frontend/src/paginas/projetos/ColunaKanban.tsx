import { useState, type DragEvent } from 'react'
import { CardProjeto } from './CardProjeto'
import type { EstagioProjeto, Projeto } from './tipos'

export interface ColunaKanbanProps {
  estagio: EstagioProjeto
  titulo: string
  projetos: Projeto[]
  aoMover?: (projetoId: number, novoEstagio: EstagioProjeto) => void
  aoCriarNoEstagio?: (estagio: EstagioProjeto) => void
  aoClicarCard?: (projeto: Projeto) => void
  aoExcluirCard?: (projetoId: number) => void
}

export function ColunaKanban({
  estagio,
  titulo,
  projetos,
  aoMover,
  aoCriarNoEstagio,
  aoClicarCard,
  aoExcluirCard,
}: ColunaKanbanProps) {
  const [isOver, setIsOver] = useState(false)

  function lidarDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move'
    }
    setIsOver(true)
  }

  function lidarDragLeave() {
    setIsOver(false)
  }

  function lidarDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsOver(false)
    const rawId = e.dataTransfer ? e.dataTransfer.getData('text/plain') : null
    const projetoId = Number(rawId)
    if (projetoId && !Number.isNaN(projetoId)) {
      aoMover?.(projetoId, estagio)
    }
  }

  return (
    <section
      aria-label={`Coluna ${titulo}`}
      className="flex min-w-[280px] w-full max-w-[340px] flex-col rounded-2xl bg-[var(--cor-fundo)]/60 border border-[var(--cor-linha)] p-3"
    >
      {/* Cabeçalho da Coluna */}
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-[var(--cor-texto)]">{titulo}</h2>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--cor-linha)] px-1.5 text-xs font-semibold text-[var(--cor-mutado)]">
            {projetos.length}
          </span>
        </div>

        {aoCriarNoEstagio && (
          <button
            type="button"
            aria-label={`Adicionar projeto em ${titulo.toLowerCase()}`}
            onClick={() => aoCriarNoEstagio(estagio)}
            className="flex size-7 items-center justify-center rounded-lg text-[var(--cor-mutado)] transition-colors hover:bg-[var(--cor-card)] hover:text-[var(--cor-texto)] hover:shadow-xs"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropzone da Lista de Cards */}
      <div
        data-testid={`coluna-dropzone-${estagio}`}
        onDragOver={lidarDragOver}
        onDragLeave={lidarDragLeave}
        onDrop={lidarDrop}
        className={`flex flex-1 flex-col gap-2.5 rounded-xl p-1.5 transition-colors duration-200 min-h-[300px] ${
          isOver
            ? 'border-2 border-dashed border-[var(--cor-principal)] bg-[var(--cor-principal)]/5'
            : 'border-2 border-transparent'
        }`}
      >
        {projetos.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--cor-linha)] p-6 text-center text-xs text-[var(--cor-mutado)]">
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="mb-2 opacity-40"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
            <p>Nenhum projeto neste estágio</p>
          </div>
        ) : (
          projetos.map((projeto) => (
            <CardProjeto
              key={projeto.id}
              projeto={projeto}
              aoClicar={aoClicarCard}
              aoMoverEstagio={aoMover}
              aoExcluir={aoExcluirCard}
            />
          ))
        )}
      </div>
    </section>
  )
}
