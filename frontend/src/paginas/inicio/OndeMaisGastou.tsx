import type { CategoriaTotal } from '../../api/tipos'
import { formatarMoeda } from '../../formato/moeda'
import { formatarPercentual, larguraDaBarra } from './valores'

interface Props {
  /** Nome do mês em minúsculas (`outubro`). */
  nomeMes: string
  /** Categorias de despesa, maiores primeiro (a API já entrega nessa ordem). */
  categorias: CategoriaTotal[]
}

/** Barras horizontais com o peso de cada categoria de despesa no mês. */
export function OndeMaisGastou({ nomeMes, categorias }: Props) {
  return (
    <section aria-labelledby="titulo-onde" className="card md:col-span-20">
      <h2 id="titulo-onde" className="m-0 text-[15px] font-bold">
        Onde você mais gastou em {nomeMes}
      </h2>
      {categorias.length === 0 ? (
        <p className="m-0 mt-3 text-sm text-[var(--cor-mutado)]">Nenhuma despesa neste mês.</p>
      ) : (
        <ul className="m-0 mt-2 list-none p-0">
          {categorias.map((categoria) => (
            <li
              key={categoria.categoriaId}
              className="my-2 grid grid-cols-[minmax(0,6rem)_1fr_auto] items-center gap-2.5 text-[11.5px] md:grid-cols-[9.5rem_1fr_auto] md:text-[13px]"
            >
              <span className="truncate">{categoria.nome}</span>
              <span aria-hidden="true" className="h-[9px] overflow-hidden rounded-full bg-[var(--cor-linha)]">
                <span
                  className="block h-full rounded-full bg-[var(--cor-principal)]"
                  style={{ width: `${larguraDaBarra(categoria.percentual)}%` }}
                />
              </span>
              <span className="valor text-right">
                {formatarMoeda(categoria.total)} · {formatarPercentual(categoria.percentual)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
