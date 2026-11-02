import { CornerDownRight, FileText, Inbox, Pencil } from 'lucide-react'
import type { ItemResponse } from '../../api/tipos'
import { obterCorValida } from './paletaCores'

interface Props {
  item: ItemResponse
  corPai: string
  aoEditar: (item: ItemResponse) => void
  aoRelatorios: (item: ItemResponse) => void
  aoArquivar: (item: ItemResponse) => void
}

export function LinhaSubcategoria({
  item,
  corPai,
  aoEditar,
  aoRelatorios,
  aoArquivar,
}: Props) {
  const corHex = obterCorValida(corPai)

  return (
    <tr
      className={`border-b border-[var(--cor-linha)]/60 bg-[var(--cor-card)]/60 transition-colors hover:bg-[var(--cor-fundo)] ${
        item.arquivado ? 'opacity-60' : ''
      }`}
    >
      {/* Coluna Nome com Recuo e conector ↳ */}
      <td className="py-2.5 pr-4 pl-12 text-sm text-[var(--cor-texto)]">
        <div className="flex items-center gap-2">
          <CornerDownRight className="size-3.5 text-[var(--cor-mutado)]" aria-hidden="true" />
          <span className="font-normal">{item.nome}</span>
          {item.arquivado && (
            <span className="rounded-full bg-[var(--cor-linha)] px-2 py-0.5 text-[10px] font-medium text-[var(--cor-mutado)]">
              Arquivado
            </span>
          )}
        </div>
      </td>

      {/* Coluna Ícone (Vazia nas subcategorias, exatamente como nos prints) */}
      <td className="py-2.5 px-4 text-center">
        <span className="sr-only">Sem ícone próprio</span>
      </td>

      {/* Coluna Cor (Herda a cor da categoria pai) */}
      <td className="py-2.5 px-4 text-center">
        <div className="flex justify-center">
          <span
            className="size-2.5 rounded-full shadow-xs"
            style={{ backgroundColor: corHex }}
            aria-hidden="true"
          />
        </div>
      </td>

      {/* Coluna Ações (Relatórios, Editar, Arquivar) */}
      <td className="py-2.5 pr-6 pl-4 text-right">
        <div className="flex items-center justify-end gap-1 sm:gap-2">
          {/* Relatórios */}
          <button
            type="button"
            title="Relatórios"
            aria-label={`Ver relatórios de ${item.nome}`}
            onClick={() => aoRelatorios(item)}
            className="group relative grid size-8 place-items-center rounded-full text-[var(--cor-mutado)] hover:bg-[var(--cor-linha)]/60 hover:text-[var(--cor-texto)] focus-visible:outline-2 focus-visible:outline-[var(--cor-principal)]"
          >
            <FileText className="size-3.5" aria-hidden="true" />
            <span className="pointer-events-none absolute -top-8 z-20 hidden rounded-md bg-neutral-800 px-2 py-0.5 text-[11px] font-medium text-white shadow-md group-hover:block">
              Relatórios
            </span>
          </button>

          {/* Editar */}
          <button
            type="button"
            title="Editar"
            aria-label={`Editar subcategoria ${item.nome}`}
            onClick={() => aoEditar(item)}
            className="grid size-8 place-items-center rounded-full text-[var(--cor-mutado)] hover:bg-[var(--cor-linha)]/60 hover:text-[var(--cor-texto)] focus-visible:outline-2 focus-visible:outline-[var(--cor-principal)]"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
          </button>

          {/* Arquivar */}
          <button
            type="button"
            title={item.arquivado ? 'Desarquivar' : 'Arquivar'}
            aria-label={`${item.arquivado ? 'Desarquivar' : 'Arquivar'} subcategoria ${item.nome}`}
            onClick={() => aoArquivar(item)}
            className="grid size-8 place-items-center rounded-full text-[var(--cor-mutado)] hover:bg-[var(--cor-linha)]/60 hover:text-[var(--cor-texto)] focus-visible:outline-2 focus-visible:outline-[var(--cor-principal)]"
          >
            <Inbox className="size-3.5" aria-hidden="true" />
          </button>

          {/* Espaçador invisível para alinhar perfeitamente com a coluna da categoria pai */}
          <span className="size-7" aria-hidden="true" />
        </div>
      </td>
    </tr>
  )
}
