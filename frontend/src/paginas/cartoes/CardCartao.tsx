import { useId } from 'react'
import { Link } from 'react-router'
import type { CartaoResponse, FaixaUso } from '../../api/tipos'
import { formatarMoeda } from '../../formato/moeda'
import { formatarPercentual, larguraDaBarra } from '../inicio/valores'

/** Cor do preenchimento da barra por faixa de uso (a faixa vem pronta da API). */
const COR_DA_BARRA: Record<Exclude<FaixaUso, 'SEM_LIMITE'>, string> = {
  VERDE: '#2E9E5B',
  AMARELO: '#E0A100',
  VERMELHO: '#D64545',
}

// Texto do chip um tom mais escuro que a barra para chegar a 4,5:1 sobre o fundo claro (WCAG AA); tokens em index.css.
const CLASSE_DO_CHIP: Record<Exclude<FaixaUso, 'SEM_LIMITE'>, string> = {
  VERDE: 'bg-[var(--cor-ok-fundo)] text-[var(--cor-positivo-texto)]',
  AMARELO: 'bg-[var(--cor-aviso-fundo)] text-[var(--cor-aviso-texto)]',
  VERMELHO: 'bg-[var(--cor-erro-fundo)] text-[var(--cor-negativo-texto)]',
}

const classeFoco =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]'

interface Props {
  cartao: CartaoResponse
}

/** Um cartão: nome, vencimento, fatura do mês e, havendo limite, a barra de uso com o percentual. */
export function CardCartao({ cartao }: Props) {
  const idTitulo = useId()
  const { faixa, uso, limite } = cartao
  const comLimite = faixa !== 'SEM_LIMITE' && uso !== null && limite !== null

  return (
    <section aria-labelledby={idTitulo} data-faixa={faixa} className="card flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 text-sm font-semibold">
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 id={idTitulo} className="m-0 min-w-0 truncate text-sm font-semibold">
            {cartao.nome}
          </h3>
          {cartao.titular && (
            <span className="inline-flex shrink-0 items-center rounded-full border border-[var(--cor-linha)] bg-[var(--cor-fundo)] px-2 py-0.5 text-[11px] font-semibold text-[var(--cor-principal)]">
              {cartao.titular}
            </span>
          )}
        </div>
        {comLimite && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${CLASSE_DO_CHIP[faixa]}`}>
            {formatarPercentual(uso)}
          </span>
        )}
      </div>
      {cartao.diaVencimento !== null && (
        <p className="m-0 text-[11px] text-[var(--cor-mutado)]">
          vence dia {String(cartao.diaVencimento).padStart(2, '0')}
        </p>
      )}
      {comLimite ? (
        <div
          role="meter"
          aria-label={`Uso do limite de ${cartao.nome}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(larguraDaBarra(uso))}
          aria-valuetext={`${formatarPercentual(uso)} do limite`}
          className="my-2.5 mb-1.5 h-[9px] overflow-hidden rounded-full bg-[var(--cor-linha)]"
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${larguraDaBarra(uso)}%`, backgroundColor: COR_DA_BARRA[faixa] }}
          />
        </div>
      ) : (
        <div className="my-2.5 mb-1.5" />
      )}
      <div className="flex items-baseline justify-between gap-2 text-xs text-[var(--cor-mutado)]">
        <span className="valor">
          <b className="text-[var(--cor-texto)]">{formatarMoeda(cartao.fatura)}</b> fatura
        </span>
        {comLimite ? (
          <span className="valor">de {formatarMoeda(limite)}</span>
        ) : (
          <Link
            to="/categorias"
            className={`inline-flex min-h-6 items-center font-semibold text-[var(--cor-principal)] ${classeFoco}`}
          >
            Cadastrar limite
          </Link>
        )}
      </div>
    </section>
  )
}
