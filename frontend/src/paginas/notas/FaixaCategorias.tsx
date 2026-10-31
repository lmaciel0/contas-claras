import { useState } from 'react'
import type { CategoriaNotaResponse } from '../../api/tipos'
import { corDaCategoria } from './coresCategoria'
import { EditorCategoriaNota } from './EditorCategoriaNota'
import { IconeLapis } from './Icones'

export type SelecaoCategoria = 'todas' | 'sem' | number

interface Props {
  categorias: CategoriaNotaResponse[]
  selecionada: SelecaoCategoria
  aoSelecionar: (selecao: SelecaoCategoria) => void
}

const foco = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]'
const transicao = 'transition-[background-color,color,border-color,transform] duration-200 motion-reduce:transition-none'
/** O chip troca de cor no mesmo instante do clique (sem esperar a rede) e afunda um pouco ao toque. */
const chip = `inline-flex min-h-11 cursor-pointer items-center gap-2 border px-3.5 text-sm font-medium active:scale-[0.97] motion-reduce:active:scale-100 ${transicao} ${foco}`
const ativo = 'border-[var(--cor-principal)] bg-[var(--cor-principal)] text-[var(--cor-sobre-principal)]'
const inativo = 'border-[var(--cor-linha)] bg-[var(--cor-card)] text-[var(--cor-texto)] hover:border-[var(--cor-principal)]'

type Editando = { existente?: CategoriaNotaResponse } | null

/** Chips de filtro por categoria. Cada categoria tem um botão de editar (nome, cor e exclusão). */
export function FaixaCategorias({ categorias, selecionada, aoSelecionar }: Props) {
  const [editando, setEditando] = useState<Editando>(null)

  return (
    <div role="group" aria-label="Categorias" className="flex flex-wrap items-center gap-2">
      <button type="button" aria-pressed={selecionada === 'todas'} onClick={() => aoSelecionar('todas')} className={`${chip} rounded-full ${selecionada === 'todas' ? ativo : inativo}`}>
        Todas
      </button>
      {categorias.map((c) => {
        const marcada = selecionada === c.id
        return (
          <span key={c.id} className="inline-flex items-center">
            <button type="button" aria-pressed={marcada} onClick={() => aoSelecionar(c.id)} className={`${chip} rounded-l-full border-r-0 pr-2 ${marcada ? ativo : inativo}`}>
              <span aria-hidden="true" className="size-2.5 rounded-full ring-1 ring-[var(--cor-card)]" style={{ background: corDaCategoria(c.cor) }} />
              {c.nome}
            </button>
            <button
              type="button"
              aria-label={`Editar categoria ${c.nome}`}
              onClick={() => setEditando({ existente: c })}
              className={`inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-r-full border border-l-0 ${transicao} ${foco} ${marcada ? ativo : inativo}`}
            >
              <IconeLapis />
            </button>
          </span>
        )
      })}
      <button type="button" aria-pressed={selecionada === 'sem'} onClick={() => aoSelecionar('sem')} className={`${chip} rounded-full ${selecionada === 'sem' ? ativo : inativo}`}>
        Sem categoria
      </button>
      <button type="button" onClick={() => setEditando({})} className={`${chip} rounded-full border-dashed ${inativo}`}>
        + Categoria
      </button>
      {editando !== null && <EditorCategoriaNota existente={editando.existente} aoFechar={() => setEditando(null)} />}
    </div>
  )
}
