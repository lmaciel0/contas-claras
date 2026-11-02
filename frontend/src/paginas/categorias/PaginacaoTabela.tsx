import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface Props {
  totalItens: number
  linhasPorPagina: number
  paginaAtual: number
  aoMudarPagina: (pagina: number) => void
  aoMudarLinhasPorPagina: (linhas: number) => void
}

export function PaginacaoTabela({
  totalItens,
  linhasPorPagina,
  paginaAtual,
  aoMudarPagina,
  aoMudarLinhasPorPagina,
}: Props) {
  const totalPaginas = Math.max(1, Math.ceil(totalItens / linhasPorPagina))
  const inicio = totalItens === 0 ? 0 : (paginaAtual - 1) * linhasPorPagina + 1
  const fim = Math.min(totalItens, paginaAtual * linhasPorPagina)

  return (
    <div className="flex flex-wrap items-center justify-end gap-4 py-3 pr-6 pl-4 text-xs text-[var(--cor-mutado)] select-none">
      {/* Seletor de Linhas por Página */}
      <div className="flex items-center gap-2">
        <span>Linhas por página:</span>
        <select
          value={linhasPorPagina}
          onChange={(e) => {
            aoMudarLinhasPorPagina(Number(e.target.value))
            aoMudarPagina(1)
          }}
          aria-label="Linhas por página"
          className="rounded-lg border border-[var(--cor-linha)] bg-[var(--cor-card)] px-2 py-1 text-xs text-[var(--cor-texto)] focus-visible:outline-2 focus-visible:outline-[var(--cor-principal)]"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
      </div>

      {/* Contagem */}
      <div>
        <span>{`${inicio}-${fim} de ${totalItens}`}</span>
      </div>

      {/* Botões de Navegação */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Primeira página"
          disabled={paginaAtual <= 1}
          onClick={() => aoMudarPagina(1)}
          className="grid size-8 place-items-center rounded-full text-[var(--cor-texto)] transition-colors hover:bg-[var(--cor-linha)]/60 disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-[var(--cor-principal)]"
        >
          <ChevronsLeft className="size-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          aria-label="Página anterior"
          disabled={paginaAtual <= 1}
          onClick={() => aoMudarPagina(paginaAtual - 1)}
          className="grid size-8 place-items-center rounded-full text-[var(--cor-texto)] transition-colors hover:bg-[var(--cor-linha)]/60 disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-[var(--cor-principal)]"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          aria-label="Próxima página"
          disabled={paginaAtual >= totalPaginas}
          onClick={() => aoMudarPagina(paginaAtual + 1)}
          className="grid size-8 place-items-center rounded-full text-[var(--cor-texto)] transition-colors hover:bg-[var(--cor-linha)]/60 disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-[var(--cor-principal)]"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          aria-label="Última página"
          disabled={paginaAtual >= totalPaginas}
          onClick={() => aoMudarPagina(totalPaginas)}
          className="grid size-8 place-items-center rounded-full text-[var(--cor-texto)] transition-colors hover:bg-[var(--cor-linha)]/60 disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-[var(--cor-principal)]"
        >
          <ChevronsRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
