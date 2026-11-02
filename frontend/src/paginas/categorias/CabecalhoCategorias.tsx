import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Maximize2, Minimize2, MoreVertical, Plus, Search, X } from 'lucide-react'
import type { TipoCategoria } from '../../api/tipos'

interface Props {
  tipoAtivo: TipoCategoria
  aoMudarTipo: (tipo: TipoCategoria) => void
  aoNovaCategoria: () => void
  termoBusca: string
  aoMudarBusca: (termo: string) => void
  todosExpandidos: boolean
  aoAlternarExpansao: () => void
}

export function CabecalhoCategorias({
  tipoAtivo,
  aoMudarTipo,
  aoNovaCategoria,
  termoBusca,
  aoMudarBusca,
  todosExpandidos,
  aoAlternarExpansao,
}: Props) {
  const [menuAberto, setMenuAberto] = useState(false)
  const [buscaAberta, setBuscaAberta] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputBuscaRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [])

  useEffect(() => {
    if (buscaAberta) {
      inputBuscaRef.current?.focus()
    }
  }, [buscaAberta])

  const eDespesa = tipoAtivo === 'DESPESA'

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      {/* Seletor em Pílula (Dropdown) */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          aria-haspopup="true"
          aria-expanded={menuAberto}
          onClick={() => setMenuAberto((prev) => !prev)}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white shadow-sm transition-all focus-visible:outline-2 focus-visible:outline-offset-2 ${
            eDespesa
              ? 'bg-[#c52828] hover:bg-[#b02222] focus-visible:outline-[#c52828]'
              : 'bg-[#15803d] hover:bg-[#166534] focus-visible:outline-[#15803d]'
          }`}
        >
          <span>{eDespesa ? 'Categoria de Despesas' : 'Categorias de Receitas'}</span>
          <ChevronDown
            className={`size-4 transition-transform duration-200 ${menuAberto ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        {menuAberto && (
          <div
            role="menu"
            className="absolute left-0 z-30 mt-1.5 min-w-[220px] rounded-2xl border border-[var(--cor-linha)] bg-[var(--cor-card)] p-1.5 shadow-xl"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                aoMudarTipo('DESPESA')
                setMenuAberto(false)
              }}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors ${
                eDespesa
                  ? 'bg-[var(--cor-linha)]/50 text-[#c52828]'
                  : 'text-[var(--cor-texto)] hover:bg-[var(--cor-linha)]/40'
              }`}
            >
              <span className="size-2.5 rounded-full bg-[#c52828]" aria-hidden="true" />
              <span>Categoria de Despesas</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                aoMudarTipo('RECEITA')
                setMenuAberto(false)
              }}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors ${
                !eDespesa
                  ? 'bg-[var(--cor-linha)]/50 text-[#15803d]'
                  : 'text-[var(--cor-texto)] hover:bg-[var(--cor-linha)]/40'
              }`}
            >
              <span className="size-2.5 rounded-full bg-[#15803d]" aria-hidden="true" />
              <span>Categorias de Receitas</span>
            </button>
          </div>
        )}
      </div>

      {/* Ferramentas do Cabeçalho */}
      <div className="flex items-center gap-1.5 md:gap-2">
        {buscaAberta ? (
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 size-4 text-[var(--cor-mutado)]" aria-hidden="true" />
            <input
              ref={inputBuscaRef}
              type="text"
              value={termoBusca}
              onChange={(e) => aoMudarBusca(e.target.value)}
              placeholder="Filtrar categorias…"
              aria-label="Buscar categorias"
              className="h-10 w-44 rounded-full border border-[var(--cor-linha)] bg-[var(--cor-card)] pr-8 pl-8 text-xs text-[var(--cor-texto)] shadow-sm focus-visible:outline-2 focus-visible:outline-[var(--cor-principal)] sm:w-56"
            />
            <button
              type="button"
              aria-label="Fechar busca"
              onClick={() => {
                aoMudarBusca('')
                setBuscaAberta(false)
              }}
              className="absolute right-2 grid size-6 place-items-center rounded-full text-[var(--cor-mutado)] hover:bg-[var(--cor-linha)]"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            aria-label="Buscar categorias"
            onClick={() => setBuscaAberta(true)}
            className="grid size-10 place-items-center rounded-full border border-[var(--cor-linha)] bg-[var(--cor-card)] text-[var(--cor-texto)] shadow-sm transition-colors hover:bg-[var(--cor-linha)]/40 focus-visible:outline-2 focus-visible:outline-[var(--cor-principal)]"
          >
            <Search className="size-4" aria-hidden="true" />
          </button>
        )}

        <button
          type="button"
          aria-label={todosExpandidos ? 'Recolher todas as subcategorias' : 'Expandir todas as subcategorias'}
          onClick={aoAlternarExpansao}
          className="grid size-10 place-items-center rounded-full border border-[var(--cor-linha)] bg-[var(--cor-card)] text-[var(--cor-texto)] shadow-sm transition-colors hover:bg-[var(--cor-linha)]/40 focus-visible:outline-2 focus-visible:outline-[var(--cor-principal)]"
        >
          {todosExpandidos ? (
            <Minimize2 className="size-4" aria-hidden="true" />
          ) : (
            <Maximize2 className="size-4" aria-hidden="true" />
          )}
        </button>

        <button
          type="button"
          aria-label="Nova categoria"
          onClick={aoNovaCategoria}
          className="grid size-10 place-items-center rounded-full border border-[var(--cor-linha)] bg-[var(--cor-card)] text-[var(--cor-principal)] shadow-sm transition-colors hover:bg-[var(--cor-linha)]/40 focus-visible:outline-2 focus-visible:outline-[var(--cor-principal)]"
        >
          <Plus className="size-5" aria-hidden="true" />
        </button>

        <button
          type="button"
          aria-label="Mais opções"
          className="grid size-10 place-items-center rounded-full border border-[var(--cor-linha)] bg-[var(--cor-card)] text-[var(--cor-texto)] shadow-sm transition-colors hover:bg-[var(--cor-linha)]/40 focus-visible:outline-2 focus-visible:outline-[var(--cor-principal)]"
        >
          <MoreVertical className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
