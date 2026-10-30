import { useId } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { formatarMoeda } from '../../formato/moeda'
import { COR_DESPESAS, COR_RECEITAS, FUNDO_DESPESAS_PREVISTAS, FUNDO_RECEITAS_PREVISTAS } from './cores'
import type { PontoDoGrafico } from './valores'

const NOMES_DAS_SERIES: Record<string, string> = {
  receitasPagas: 'Receitas',
  receitasPrevistas: 'Receitas previstas',
  despesasPagas: 'Despesas',
  despesasPrevistas: 'Despesas previstas',
}

interface PadraoProps {
  id: string
  cor: string
  fundo: string
}

/** Listras diagonais: a parte ainda prevista (não paga) da barra. */
function PadraoListrado({ id, cor, fundo }: PadraoProps) {
  return (
    <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="6" height="6" fill={fundo} />
      <rect width="3" height="6" fill={cor} />
    </pattern>
  )
}

/** Barras agrupadas por mês: receitas e despesas lado a lado, cada uma empilhando a parte paga e a prevista. */
export default function BarrasDoAno({ dados }: { dados: PontoDoGrafico[] }) {
  const idBase = useId()
  const idReceitasPrevistas = `${idBase}-receitas-previstas`
  const idDespesasPrevistas = `${idBase}-despesas-previstas`

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={dados} barGap={2} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <PadraoListrado id={idReceitasPrevistas} cor={COR_RECEITAS} fundo={FUNDO_RECEITAS_PREVISTAS} />
          <PadraoListrado id={idDespesasPrevistas} cor={COR_DESPESAS} fundo={FUNDO_DESPESAS_PREVISTAS} />
        </defs>
        <XAxis
          dataKey="rotulo"
          tickLine={false}
          axisLine={{ stroke: 'var(--cor-linha)' }}
          tick={{ fontSize: 10, fill: 'var(--cor-mutado)' }}
          interval={0}
        />
        <Tooltip
          cursor={{ fill: 'var(--cor-fundo)' }}
          formatter={(valor, nome) => [formatarMoeda(Number(valor)), NOMES_DAS_SERIES[String(nome)] ?? String(nome)]}
        />
        <Bar dataKey="receitasPagas" stackId="receitas" fill={COR_RECEITAS} isAnimationActive={false} />
        <Bar
          dataKey="receitasPrevistas"
          stackId="receitas"
          fill={`url(#${idReceitasPrevistas})`}
          isAnimationActive={false}
        />
        <Bar dataKey="despesasPagas" stackId="despesas" fill={COR_DESPESAS} isAnimationActive={false} />
        <Bar
          dataKey="despesasPrevistas"
          stackId="despesas"
          fill={`url(#${idDespesasPrevistas})`}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
