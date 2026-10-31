import type { TotaisMes } from '../../api/tipos'
import { formatarMoeda } from '../../formato/moeda'
import { variacao } from './valores'

interface Props {
  receitas: string
  despesas: string
  anterior: TotaisMes | null
  /** Nome do mês anterior em minúsculas (`setembro`). */
  nomeMesAnterior: string
}

type Tom = 'bom' | 'ruim' | 'neutro'

const CORES_DO_CHIP: Record<Tom, string> = {
  bom: 'bg-[#e5f5ec] text-[var(--cor-positivo-texto)]',
  ruim: 'bg-[#fbe5e5] text-[var(--cor-negativo-texto)]',
  neutro: 'bg-[var(--cor-linha)] text-[var(--cor-mutado)]',
}

interface ChipProps {
  atual: string
  anterior: string | undefined
  nomeMesAnterior: string
  /** Despesa que cai é bom; receita que cai é ruim. */
  subirEBom: boolean
}

/** `↑/↓ N% vs <mês>`; some sem mês anterior ou quando o valor anterior é zero (não há base para comparar). */
function Chip({ atual, anterior, nomeMesAnterior, subirEBom }: ChipProps) {
  const mudanca = anterior === undefined ? null : variacao(atual, anterior)
  if (mudanca === null) {
    return null
  }
  const tom: Tom =
    mudanca.direcao === 'igual' ? 'neutro' : (mudanca.direcao === 'subiu') === subirEBom ? 'bom' : 'ruim'
  const seta = mudanca.direcao === 'subiu' ? '↑' : mudanca.direcao === 'caiu' ? '↓' : '='
  const percentual = mudanca.direcao !== 'igual' && mudanca.percentual === 0 ? '<1%' : `${mudanca.percentual}%`

  return (
    <p
      data-tom={tom}
      className={`m-0 w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold ${CORES_DO_CHIP[tom]}`}
    >
      {seta} {percentual} vs {nomeMesAnterior}
    </p>
  )
}

interface CardProps extends ChipProps {
  id: string
  titulo: string
}

function CardTotal({ id, titulo, atual, ...chip }: CardProps) {
  return (
    <section aria-labelledby={id} className="card flex flex-col justify-center gap-1.5 !p-3.5 md:!p-4">
      <h2 id={id} className="m-0 text-xs font-normal text-[var(--cor-mutado)]">
        {titulo}
      </h2>
      <p className="valor m-0 text-base font-bold tracking-tight md:text-[22px]">{formatarMoeda(atual)}</p>
      <Chip atual={atual} {...chip} />
    </section>
  )
}

/** Receitas e despesas do mês, lado a lado no celular e empilhadas no computador. */
export function CardsTotais({ receitas, despesas, anterior, nomeMesAnterior }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2.5 md:col-span-10 md:grid-cols-1 md:grid-rows-2 md:gap-3.5">
      <CardTotal
        id="titulo-receitas"
        titulo="Receitas"
        atual={receitas}
        anterior={anterior?.receitas}
        nomeMesAnterior={nomeMesAnterior}
        subirEBom
      />
      <CardTotal
        id="titulo-despesas"
        titulo="Despesas"
        atual={despesas}
        anterior={anterior?.despesas}
        nomeMesAnterior={nomeMesAnterior}
        subirEBom={false}
      />
    </div>
  )
}
