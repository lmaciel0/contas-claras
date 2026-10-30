import type { ProximaConta } from '../../api/tipos'
import { formatarMoeda } from '../../formato/moeda'
import { diaEMes } from './valores'

interface Props {
  /** Atrasadas e as que vencem nos próximos 30 dias, por vencimento (independe do mês escolhido). */
  contas: ProximaConta[]
}

/** Lista das contas a pagar: data `dd/mm`, item, categoria e valor; as atrasadas levam a etiqueta vermelha. */
export function ProximasContas({ contas }: Props) {
  return (
    <section aria-labelledby="titulo-proximas" className="card md:col-span-15">
      <h2 id="titulo-proximas" className="m-0 text-[15px] font-bold">
        Próximas contas
      </h2>
      {contas.length === 0 ? (
        <p className="m-0 mt-3 text-sm text-[var(--cor-mutado)]">Nenhuma conta a vencer.</p>
      ) : (
        <ul className="m-0 mt-2 list-none p-0">
          {contas.map((conta) => (
            <li
              key={conta.lancamentoId}
              className="grid grid-cols-[3rem_1fr_auto] items-center gap-2 border-t border-[var(--cor-linha)] py-2 text-[12.5px] first:border-t-0"
            >
              <time dateTime={conta.vencimento} className="valor font-semibold">
                {diaEMes(conta.vencimento)}
              </time>
              <span className="min-w-0">
                <span className="block truncate font-medium">{conta.itemNome}</span>
                <span className="block truncate text-[11px] text-[var(--cor-mutado)]">{conta.categoriaNome}</span>
              </span>
              <span className="flex flex-col items-end gap-0.5">
                <span className="valor font-medium">{formatarMoeda(conta.valor)}</span>
                {conta.atrasada && (
                  <span className="rounded-full bg-[#fbe5e5] px-2 py-0.5 text-[11px] font-semibold text-[var(--cor-negativo)]">
                    atrasada
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
