import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import type { CategoriaNotaResponse, NotaResumoResponse } from '../../api/tipos'
import { corDaCategoria } from './coresCategoria'
import { IconeAlfinete } from './Icones'

interface Props {
  nota: NotaResumoResponse
  categoria: CategoriaNotaResponse | undefined
  aoFixar: (nota: NotaResumoResponse) => void
  /** Posição na grade: escalona a entrada (30 ms por cartão, até o oitavo). */
  indice?: number
}

const formatoData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

/** Cartão da lista: o link cobre título, prévia, categoria e data; o alfinete fica ao lado (botão não entra em link). */
export function CartaoNota({ nota, categoria, aoFixar, indice = 0 }: Props) {
  const rotuloData = formatoData.format(new Date(nota.atualizadoEm))
  return (
    <li className="nota-entra relative min-w-0" style={{ '--i': indice } as CSSProperties}>
      <Link
        to={`/notas/${nota.id}`}
        className="flex h-full min-h-11 flex-col gap-2 rounded-[var(--raio-card)] border border-[var(--cor-linha)] bg-[var(--cor-card)] p-4 pr-14 text-[var(--cor-texto)] no-underline transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-[var(--cor-principal)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
      >
        <span className="break-words text-base font-semibold">{nota.titulo}</span>
        {nota.previa !== '' && (
          <span className="line-clamp-3 break-words text-sm text-[var(--cor-mutado)]">{nota.previa}</span>
        )}
        <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-[var(--cor-mutado)]">
          {categoria !== undefined && (
            <span className="inline-flex items-center gap-1.5 font-medium text-[var(--cor-texto)]">
              <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: corDaCategoria(categoria.cor) }} />
              {categoria.nome}
            </span>
          )}
          <span>{rotuloData}</span>
        </span>
      </Link>
      <button
        type="button"
        aria-label={nota.fixada ? 'Tirar da tela inicial' : 'Fixar na tela inicial'}
        aria-pressed={nota.fixada}
        onClick={() => aoFixar(nota)}
        className={`absolute top-1 right-1 grid size-11 cursor-pointer place-items-center rounded-full transition-[color,background-color,transform] duration-200 active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--cor-principal)] ${
          nota.fixada
            ? 'bg-[var(--cor-principal)] text-[var(--cor-sobre-principal)]'
            : 'text-[var(--cor-mutado)] hover:bg-[var(--cor-fundo)] hover:text-[var(--cor-principal)]'
        }`}
      >
        <IconeAlfinete cheio={nota.fixada} />
      </button>
    </li>
  )
}
