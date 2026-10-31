import type { TotaisMes } from '../../api/tipos'
import { formatarMoeda } from '../../formato/moeda'
import { formatarComSinal, paraCentavos } from './valores'

interface Props {
  sobra: string
  sobraAno: string
  anterior: TotaisMes | null
  /** Nome do mês anterior em minúsculas (`setembro`). */
  nomeMesAnterior: string
}

/** Texto da comparação com o mês anterior; `null` quando não há mês anterior para comparar. */
function comparacao(sobra: string, anterior: TotaisMes | null, nomeMesAnterior: string): string | null {
  if (anterior === null) {
    return null
  }
  const delta = paraCentavos(sobra) - paraCentavos(anterior.sobra)
  if (delta === 0) {
    return `igual a ${nomeMesAnterior}`
  }
  return `${formatarMoeda(Math.abs(delta) / 100)} ${delta > 0 ? 'melhor' : 'pior'} que ${nomeMesAnterior}`
}

/** Destaque da tela: quanto sobrou no mês. Fica sempre em índigo; o valor negativo vai com o prefixo −. */
export function CardSobra({ sobra, sobraAno, anterior, nomeMesAnterior }: Props) {
  const texto = comparacao(sobra, anterior, nomeMesAnterior)

  return (
    <section
      aria-labelledby="titulo-sobra"
      className="flex flex-col rounded-[var(--raio-card)] bg-[var(--cor-principal)] p-4 text-white md:col-span-11"
    >
      <h2 id="titulo-sobra" className="m-0 text-xs font-normal text-[#cfcbf2]">
        Sobra do mês
      </h2>
      <p className="valor m-0 my-1.5 text-[26px] font-bold tracking-tight md:text-[30px]">{formatarComSinal(sobra)}</p>
      {texto !== null && (
        <p className="m-0 w-fit rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">{texto}</p>
      )}
      <p className="valor m-0 mt-auto pt-5 text-xs text-[#cfcbf2]">No ano: {formatarComSinal(sobraAno)}</p>
    </section>
  )
}
