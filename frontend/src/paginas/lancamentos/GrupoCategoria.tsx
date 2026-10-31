import { Link } from 'react-router'
import type { LancamentoResponse, StatusLancamento } from '../../api/tipos'
import { formatarMoeda } from '../../formato/moeda'
import { diaEMes, paraCentavos } from '../inicio/valores'

interface Props {
  nome: string
  lancamentos: LancamentoResponse[]
  /** Query string do mês (`?ano=2026&mes=10`), mantida no link que abre o lançamento. */
  busca: string
  /** `id` do lançamento com troca de status em andamento (o chip fica desligado). */
  idMudandoStatus: number | null
  aoMudarStatus: (id: number, status: StatusLancamento) => void
}

const classeFoco =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]'

/** Soma em centavos (inteiros) para o total do grupo não ganhar ruído de ponto flutuante. */
function totalDoGrupo(lancamentos: LancamentoResponse[]): number {
  return lancamentos.reduce((soma, l) => soma + paraCentavos(l.valor), 0) / 100
}

/** Um grupo da lista do mês: título com total e uma linha por lançamento (toque na linha abre; o chip alterna o status). */
export function GrupoCategoria({ nome, lancamentos, busca, idMudandoStatus, aoMudarStatus }: Props) {
  return (
    <section aria-label={nome} className="card">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="m-0 text-[15px] font-bold">{nome}</h2>
        <span data-total className="valor text-[15px] font-bold">
          {formatarMoeda(totalDoGrupo(lancamentos))}
        </span>
      </div>
      <ul className="m-0 mt-2 list-none p-0">
        {lancamentos.map((l) => {
          const pago = l.status === 'PAGO'
          const rotulo = pago ? 'Pago' : 'Previsto'
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
                <span
                  className={`valor font-medium ${l.tipo === 'RECEITA' ? 'text-[var(--cor-positivo)]' : ''}`}
                >
                  {formatarMoeda(l.valor)}
                </span>
              </Link>
              <button
                type="button"
                disabled={idMudandoStatus === l.id}
                aria-label={`${l.itemNome}: ${rotulo}. Tocar para marcar como ${pago ? 'previsto' : 'pago'}`}
                onClick={() => aoMudarStatus(l.id, pago ? 'PREVISTO' : 'PAGO')}
                className={`min-h-8 min-w-[5.5rem] rounded-full px-3 text-[12px] font-semibold disabled:opacity-60 ${classeFoco} ${
                  pago ? 'bg-[var(--cor-ok-fundo)] text-[var(--cor-positivo)]' : 'bg-[var(--cor-fundo)] text-[var(--cor-principal)]'
                }`}
              >
                {pago ? '✓ Pago' : 'Previsto'}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
