import { Link } from 'react-router'
import type { LancamentoResponse, StatusLancamento } from '../../api/tipos'
import { formatarMoeda } from '../../formato/moeda'
import { diaEMes } from '../inicio/valores'
import { totaisDeReceitas } from './receitas'

interface Props {
  lancamentos: LancamentoResponse[]
  /** Query string do mês (`?ano=2026&mes=10`), mantida no link que abre o lançamento. */
  busca: string
  /** `id` do lançamento com troca de status em andamento (o selo fica desligado). */
  idMudandoStatus: number | null
  aoMudarStatus: (id: number, status: StatusLancamento) => void
}

const classeFoco =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]'

/** Pontilhado esmaecido do bloco do total: bolinhas na cor das receitas, sem competir com o texto. */
const pontilhado = {
  backgroundImage:
    'radial-gradient(color-mix(in srgb, var(--cor-positivo) 28%, transparent) 1.2px, transparent 1.2px)',
  backgroundSize: '12px 12px',
} as const

/**
 * Card das receitas do mês: o total recebido em destaque, barra de recebido contra previsto e uma linha por
 * receita (toque na linha abre; o selo alterna entre "Recebido" e "A receber"). O verde é só das receitas.
 */
export function ReceitasCard({ lancamentos, busca, idMudandoStatus, aoMudarStatus }: Props) {
  const { recebidoCentavos, totalCentavos, percentual } = totaisDeReceitas(lancamentos)

  return (
    <section aria-label="Receitas" className="card md:col-span-2">
      {lancamentos.length === 0 ? (
        <>
          <h2 className="m-0 text-[15px] font-bold">Receitas</h2>
          <p className="m-0 mt-2 text-sm text-[var(--cor-mutado)]">Nenhuma receita neste mês</p>
        </>
      ) : (
        <>
          <div className="rounded-[14px] p-3.5" style={pontilhado}>
            <h2 className="m-0 text-xs font-semibold text-[var(--cor-mutado)]">Recebido no mês</h2>
            <p
              data-total
              className="valor m-0 text-[30px] leading-[1.1] font-extrabold tracking-tight text-[var(--cor-positivo-texto)]"
            >
              {formatarMoeda(recebidoCentavos / 100)}
            </p>
            <div
              role="progressbar"
              aria-label="Receitas recebidas do previsto no mês"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percentual}
              className="mt-3 mb-1 h-2 overflow-hidden rounded-full bg-[var(--cor-ok-fundo)]"
            >
              <div
                className="h-full origin-left rounded-full bg-gradient-to-r from-[var(--cor-positivo)] to-[var(--cor-positivo-texto)] motion-safe:transition-transform motion-safe:duration-300"
                style={{ transform: `scaleX(${percentual / 100})` }}
              />
            </div>
            <p className="m-0 text-xs text-[var(--cor-mutado)]">
              {`${percentual}% do previsto · a receber ${formatarMoeda((totalCentavos - recebidoCentavos) / 100)}`}
            </p>
          </div>
          <ul className="m-0 mt-2 list-none p-0">
            {lancamentos.map((l) => {
              const recebido = l.status === 'PAGO'
              const rotulo = recebido ? 'Recebido' : 'A receber'
              return (
                <li
                  key={l.id}
                  className="grid grid-cols-[1fr_auto] items-center gap-2 border-t border-[var(--cor-linha)] first:border-t-0"
                >
                  <Link
                    to={{ pathname: `/lancamentos/${l.id}`, search: busca }}
                    className={`grid min-h-12 grid-cols-[3rem_1fr_auto] items-center gap-2 py-2 text-[13px] text-inherit no-underline ${classeFoco}`}
                  >
                    <span className="valor font-semibold">{l.vencimento === null ? '—' : diaEMes(l.vencimento)}</span>
                    <span className="min-w-0 truncate font-medium">{l.itemNome}</span>
                    <span className="valor font-medium text-[var(--cor-positivo-texto)]">{formatarMoeda(l.valor)}</span>
                  </Link>
                  <button
                    type="button"
                    disabled={idMudandoStatus === l.id}
                    aria-label={`${l.itemNome}: ${rotulo}. Tocar para marcar como ${recebido ? 'a receber' : 'recebido'}`}
                    onClick={() => aoMudarStatus(l.id, recebido ? 'PREVISTO' : 'PAGO')}
                    className={`min-h-8 min-w-[5.5rem] cursor-pointer rounded-full px-3 text-[12px] font-semibold transition-colors disabled:cursor-default disabled:opacity-60 ${classeFoco} ${
                      recebido
                        ? 'bg-[var(--cor-ok-fundo)] text-[var(--cor-positivo-texto)]'
                        : 'bg-[var(--cor-fundo)] text-[var(--cor-principal)]'
                    }`}
                  >
                    {recebido ? '✓ Recebido' : 'A receber'}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
