import { FileText, Inbox, Pencil, Plus } from 'lucide-react'
import type { CategoriaResponse } from '../../api/tipos'
import { renderizarIcone } from './catalogoIcones'
import { obterCorValida } from './paletaCores'

interface Props {
  categoria: CategoriaResponse
  aoEditar: (categoria: CategoriaResponse) => void
  aoRelatorios: (categoria: CategoriaResponse) => void
  aoArquivar: (categoria: CategoriaResponse) => void
  aoAdicionarSubcategoria: (categoria: CategoriaResponse) => void
}

export function LinhaCategoria({
  categoria,
  aoEditar,
  aoRelatorios,
  aoArquivar,
  aoAdicionarSubcategoria,
}: Props) {
  const eDespesa = categoria.tipo === 'DESPESA'
  const corHex = obterCorValida(categoria.cor)

  return (
    <tr className="border-b border-[var(--cor-linha)] bg-[var(--cor-card)] transition-colors hover:bg-[var(--cor-fundo)]/50">
      {/* Coluna Nome */}
      <td className="py-3 pr-4 pl-6 text-sm font-semibold text-[var(--cor-texto)]">
        <span className="truncate">{categoria.nome}</span>
      </td>

      {/* Coluna Ícone */}
      <td className="py-3 px-4 text-center text-[var(--cor-mutado)]">
        <div className="flex justify-center">{renderizarIcone(categoria.icone, 'size-5')}</div>
      </td>

      {/* Coluna Cor */}
      <td className="py-3 px-4 text-center">
        <div className="flex justify-center">
          <span
            className="size-3.5 rounded-full shadow-xs"
            style={{ backgroundColor: corHex }}
            aria-hidden="true"
          />
        </div>
      </td>

      {/* Coluna Ações */}
      <td className="py-3 pr-6 pl-4 text-right">
        <div className="flex items-center justify-end gap-1 sm:gap-2">
          {/* Relatórios */}
          <button
            type="button"
            title="Relatórios"
            aria-label={`Ver relatórios de ${categoria.nome}`}
            onClick={() => aoRelatorios(categoria)}
            className="group relative grid size-9 place-items-center rounded-full text-[var(--cor-mutado)] hover:bg-[var(--cor-linha)]/60 hover:text-[var(--cor-texto)] focus-visible:outline-2 focus-visible:outline-[var(--cor-principal)]"
          >
            <FileText className="size-4" aria-hidden="true" />
            <span className="pointer-events-none absolute -top-8 z-20 hidden rounded-md bg-neutral-800 px-2 py-0.5 text-[11px] font-medium text-white shadow-md group-hover:block">
              Relatórios
            </span>
          </button>

          {/* Editar */}
          <button
            type="button"
            title="Editar"
            aria-label={`Editar categoria ${categoria.nome}`}
            onClick={() => aoEditar(categoria)}
            className="grid size-9 place-items-center rounded-full text-[var(--cor-mutado)] hover:bg-[var(--cor-linha)]/60 hover:text-[var(--cor-texto)] focus-visible:outline-2 focus-visible:outline-[var(--cor-principal)]"
          >
            <Pencil className="size-4" aria-hidden="true" />
          </button>

          {/* Arquivar */}
          <button
            type="button"
            title="Arquivar"
            aria-label={`Arquivar categoria ${categoria.nome}`}
            onClick={() => aoArquivar(categoria)}
            className="grid size-9 place-items-center rounded-full text-[var(--cor-mutado)] hover:bg-[var(--cor-linha)]/60 hover:text-[var(--cor-texto)] focus-visible:outline-2 focus-visible:outline-[var(--cor-principal)]"
          >
            <Inbox className="size-4" aria-hidden="true" />
          </button>

          {/* Botão + Adicionar Subcategoria */}
          <button
            type="button"
            title="Adicionar subcategoria"
            aria-label={`Adicionar subcategoria em ${categoria.nome}`}
            onClick={() => aoAdicionarSubcategoria(categoria)}
            className={`grid size-7 place-items-center rounded-full text-white shadow-xs transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-1 ${
              eDespesa
                ? 'bg-[#c52828] hover:bg-[#b02222] focus-visible:outline-[#c52828]'
                : 'bg-[#15803d] hover:bg-[#166534] focus-visible:outline-[#15803d]'
            }`}
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  )
}
