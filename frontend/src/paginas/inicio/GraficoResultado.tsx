import { lazy, Suspense } from 'react'
import type { PontoSerie } from '../../api/tipos'
import { formatarMoeda } from '../../formato/moeda'
import { nomeMes } from '../../formato/mes'
import { useEhDesktop } from '../../layout/useEhDesktop'
import { COR_DESPESAS, COR_RECEITAS, FUNDO_DESPESAS_PREVISTAS } from './cores'
import { formatarComSinal, paraCentavos, resultadoAcumulado, serieDoResultado } from './valores'

// O Recharts é a maior dependência do app: o gráfico carrega em um arquivo à parte.
const BarrasDoResultado = lazy(() => import('./BarrasDoResultado'))

interface Props {
  ano: number
  mes: number
  serie: PontoSerie[]
  className?: string
}

function corDoValor(valor: string): string {
  const centavos = paraCentavos(valor)
  if (centavos === 0) {
    return 'text-[var(--cor-mutado)]'
  }
  return centavos > 0 ? 'text-[var(--cor-positivo-texto)]' : 'text-[var(--cor-negativo-texto)]'
}

/**
 * Resultado de cada mês (Recharts): barras espelhadas, receitas para cima e despesas para baixo da linha zero, cada
 * lado com a parte paga (cor cheia) e a prevista (listrada), e o resultado do mês escrito sob o nome dele. A legenda é
 * HTML, para listar só o que a pessoa entende: Receitas, Despesas, Previsto. A tabela escondida é a versão para leitor de tela.
 */
export function GraficoResultado({ ano, mes, serie, className }: Props) {
  const compacto = !useEhDesktop()
  const pontos = serieDoResultado(serie)
  const acumulado = resultadoAcumulado(serie, mes)

  return (
    <section aria-labelledby="titulo-grafico" className={className ? `card flex flex-col ${className}` : 'card flex flex-col'}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 id="titulo-grafico" className="m-0 text-[15px] font-bold">
          Resultado de cada mês em {ano}
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
      <p className="m-0 mt-1 text-xs text-[var(--cor-mutado)]">
        Acumulado até {nomeMes(mes).toLocaleLowerCase('pt-BR')}:{' '}
        <strong className={`font-bold ${corDoValor(acumulado)}`}>{formatarComSinal(acumulado)}</strong>
      </p>
      {/* Altura mínima fixa: o espaço já está reservado enquanto o gráfico carrega (sem salto de layout); se o card
          crescer (grade), o gráfico ocupa o que sobrar. O gráfico fica em um filho absoluto para ter altura definida. */}
      <div
        role="group"
        aria-label={`Gráfico do resultado de cada mês em ${ano}`}
        className="relative mt-2.5 min-h-[240px] flex-1 md:min-h-[220px]"
      >
        <div className="absolute inset-0">
          <Suspense fallback={null}>
            <BarrasDoResultado dados={pontos} mesSelecionado={mes} compacto={compacto} />
          </Suspense>
        </div>
      </div>
      <table className="sr-only">
        <caption>Resultado de cada mês em {ano}</caption>
        <thead>
          <tr>
            <th scope="col">Mês</th>
            <th scope="col">Receitas</th>
            <th scope="col">Despesas</th>
            <th scope="col">Resultado</th>
          </tr>
        </thead>
        <tbody>
          {pontos.map((ponto) => (
            <tr key={ponto.mes}>
              <th scope="row">{ponto.rotulo}</th>
              <td>{formatarMoeda(ponto.receitas)}</td>
              <td>{formatarMoeda(ponto.despesas)}</td>
              <td>{formatarComSinal(ponto.resultado.toFixed(2))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
