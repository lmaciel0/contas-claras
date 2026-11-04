import { Link } from 'react-router'
import type { CartaoResponse } from '../../api/tipos'
import { formatarMoeda } from '../../formato/moeda'
import { CLASSE_DO_CHIP, COR_DA_BARRA } from '../cartoes/faixas'
import { formatarPercentual, larguraDaBarra } from './valores'

interface Props {
  cartoes: CartaoResponse[]
  /** Query string do mês (`?ano=2026&mes=10`), repassada ao link para a tela de cartões abrir no mesmo mês. */
  busca: string
  className?: string
}

/** Resumo dos cartões na Visão geral: fatura do mês e, quando há limite, a barra de uso. Sem cartões, não aparece. */
export function ResumoCartoes({ cartoes, busca, className = '' }: Props) {
  if (cartoes.length === 0) {
    return null
  }
  return (
    <section aria-labelledby="titulo-cartoes" className={`card ${className}`.trim()}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="titulo-cartoes" className="m-0 text-[15px] font-bold">
          Cartões
        </h2>
        <Link
          to={{ pathname: '/cartoes', search: busca }}
          className="inline-flex min-h-6 items-center text-xs font-semibold text-[var(--cor-principal)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
        >
          Ver cartões
        </Link>
      </div>
      <ul className="m-0 mt-2 list-none p-0">
        {cartoes.map((cartao) => {
          const { faixa, uso, limite } = cartao
          const comLimite = faixa !== 'SEM_LIMITE' && uso !== null && limite !== null
          return (
            <li
              key={cartao.itemId}
              data-faixa={faixa}
              className="border-t border-[var(--cor-linha)] py-2.5 text-[12.5px] first:border-t-0"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate font-medium">{cartao.nome}</span>
                <span className="valor shrink-0 font-semibold">{formatarMoeda(cartao.fatura)}</span>
              </div>
              {comLimite && (
                <>
                  <div
                    role="meter"
                    aria-label={`Uso do limite de ${cartao.nome}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(larguraDaBarra(uso))}
                    aria-valuetext={`${formatarPercentual(uso)} do limite`}
                    className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--cor-linha)]"
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${larguraDaBarra(uso)}%`, backgroundColor: COR_DA_BARRA[faixa] }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-[var(--cor-mutado)]">
                    <span className="valor">de {formatarMoeda(limite)}</span>
                    <span className={`rounded-full px-2 py-0.5 font-bold ${CLASSE_DO_CHIP[faixa]}`}>
                      {formatarPercentual(uso)}
                    </span>
                  </div>
                </>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
