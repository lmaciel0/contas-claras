import { useId } from 'react'
import { Bar, BarChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { COR_DESPESAS, COR_RECEITAS, FUNDO_DESPESAS_PREVISTAS, FUNDO_RECEITAS_PREVISTAS } from './cores'
import { TooltipResultado } from './TooltipResultado'
import { resultadoCurto, type PontoDoResultado } from './valores'

const COR_DO_SENTIDO: Record<PontoDoResultado['sentido'], string> = {
  sobrou: 'var(--cor-positivo-texto)',
  faltou: 'var(--cor-negativo-texto)',
  zero: 'var(--cor-mutado)',
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

interface MesNoEixoProps {
  x?: number | string
  y?: number | string
  payload?: { value?: unknown }
  dados: PontoDoResultado[]
  mesSelecionado: number
  compacto: boolean
}

/** Rótulo do eixo em duas linhas: o mês e, abaixo, o resultado dele com sinal (a cor só reforça o sinal). */
function MesNoEixo({ x = 0, y = 0, payload, dados, mesSelecionado, compacto }: MesNoEixoProps) {
  const ponto = dados.find((candidato) => candidato.rotulo === payload?.value)
  if (!ponto) {
    return null
  }
  const selecionado = ponto.mes === mesSelecionado
  return (
    <g transform={`translate(${x},${Number(y)})`}>
      <text
        y={14}
        textAnchor="middle"
        fontSize={10}
        fontWeight={selecionado ? 700 : 400}
        fill={selecionado ? 'var(--cor-texto)' : 'var(--cor-mutado)'}
        data-selecionado={selecionado ? 'true' : undefined}
      >
        {ponto.rotulo}
      </text>
      <text y={28} textAnchor="middle" fontSize={compacto ? 9 : 10} fontWeight={600} fill={COR_DO_SENTIDO[ponto.sentido]}>
        {resultadoCurto(ponto.resultado, compacto)}
      </text>
    </g>
  )
}

interface Props {
  dados: PontoDoResultado[]
  mesSelecionado: number
  compacto: boolean
}

/**
 * Barras espelhadas por mês numa única pilha: receitas sobem da linha zero e despesas (negativas) descem, cada lado
 * empilhando a parte paga (cor cheia) e a prevista (padrão listrado).
 */
export default function BarrasDoResultado({ dados, mesSelecionado, compacto }: Props) {
  const idBase = useId()
  const idReceitasPrevistas = `${idBase}-receitas-previstas`
  const idDespesasPrevistas = `${idBase}-despesas-previstas`
  const selecionado = dados.find((ponto) => ponto.mes === mesSelecionado)

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={dados} stackOffset="sign" margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <PadraoListrado id={idReceitasPrevistas} cor={COR_RECEITAS} fundo={FUNDO_RECEITAS_PREVISTAS} />
          <PadraoListrado id={idDespesasPrevistas} cor={COR_DESPESAS} fundo={FUNDO_DESPESAS_PREVISTAS} />
        </defs>
        {selecionado && (
          <ReferenceArea
            x1={selecionado.rotulo}
            x2={selecionado.rotulo}
            fill="none"
            stroke="var(--cor-principal)"
            strokeWidth={1.5}
            ifOverflow="visible"
          />
        )}
        <XAxis
          dataKey="rotulo"
          height={36}
          tickLine={false}
          axisLine={false}
          interval={0}
          tick={(props) => (
            <MesNoEixo
              x={props.x}
              y={props.y}
              payload={props.payload}
              dados={dados}
              mesSelecionado={mesSelecionado}
              compacto={compacto}
            />
          )}
        />
        <Tooltip
          cursor={{ fill: 'var(--cor-fundo)' }}
          content={({ active, payload }) => (
            <TooltipResultado ponto={active ? ((payload?.[0]?.payload as PontoDoResultado | undefined) ?? null) : null} />
          )}
        />
        <Bar dataKey="receitasPagas" stackId="fluxo" fill={COR_RECEITAS} isAnimationActive={false} />
        <Bar
          dataKey="receitasPrevistas"
          stackId="fluxo"
          fill={`url(#${idReceitasPrevistas})`}
          isAnimationActive={false}
        />
        <Bar dataKey="despesasPagas" stackId="fluxo" fill={COR_DESPESAS} isAnimationActive={false} />
        <Bar
          dataKey="despesasPrevistas"
          stackId="fluxo"
          fill={`url(#${idDespesasPrevistas})`}
          isAnimationActive={false}
        />
        <ReferenceLine y={0} stroke="var(--cor-linha)" />
      </BarChart>
    </ResponsiveContainer>
  )
}
