import { lazy, Suspense } from 'react'
import type { PontoSerie } from '../../api/tipos'
import { COR_DESPESAS, COR_RECEITAS, FUNDO_DESPESAS_PREVISTAS } from './cores'
import { serieDoGrafico } from './valores'

// O Recharts é a maior dependência do app: o gráfico (último bloco no celular) carrega em um arquivo à parte.
const BarrasDoAno = lazy(() => import('./BarrasDoAno'))

interface Props {
  ano: number
  serie: PontoSerie[]
}

/**
 * Receitas × despesas mês a mês (Recharts): barras agrupadas, cada lado empilhando a parte paga (cor cheia) e a
 * prevista (padrão listrado). A legenda é HTML, para listar só o que a pessoa entende: Receitas, Despesas, Previsto.
 */
export function GraficoAno({ ano, serie }: Props) {
  return (
    <section aria-labelledby="titulo-grafico" className="card md:col-span-14 md:col-start-22 md:row-start-1">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 id="titulo-grafico" className="m-0 text-[15px] font-bold">
          Receitas × Despesas {ano}
        </h2>
        <ul aria-label="Legenda do gráfico" className="m-0 flex list-none gap-3 p-0 text-[11px] text-[var(--cor-mutado)]">
          <li className="flex items-center gap-1">
            <span aria-hidden="true" className="size-[9px] rounded-[3px]" style={{ background: COR_RECEITAS }} />
            Receitas
          </li>
          <li className="flex items-center gap-1">
            <span aria-hidden="true" className="size-[9px] rounded-[3px]" style={{ background: COR_DESPESAS }} />
            Despesas
          </li>
          <li className="flex items-center gap-1">
            <span
              aria-hidden="true"
              className="size-[9px] rounded-[3px]"
              style={{
                background: `repeating-linear-gradient(45deg, ${COR_RECEITAS} 0 2px, ${FUNDO_DESPESAS_PREVISTAS} 2px 4px)`,
              }}
            />
            Previsto
          </li>
        </ul>
      </div>
      {/* Altura fixa: o espaço já está reservado enquanto o gráfico carrega (sem salto de layout). */}
      <div
        role="group"
        aria-label={`Gráfico de receitas e despesas por mês em ${ano}`}
        className="mt-2.5 h-[200px] md:h-[170px]"
      >
        <Suspense fallback={null}>
          <BarrasDoAno dados={serieDoGrafico(serie)} />
        </Suspense>
      </div>
    </section>
  )
}
