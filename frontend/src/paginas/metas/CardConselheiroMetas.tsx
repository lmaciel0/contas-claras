import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Sparkles, Target } from 'lucide-react'
import { Link } from 'react-router'
import { endpoints } from '../../api/endpoints'
import { formatarMoeda } from '../../formato/moeda'
import { getIconePreset } from './iconesMeta'
import { obterPresetVisual } from './presetsVisuais'

interface Props {
  ano: number
  mes: number
  className?: string
}

export function CardConselheiroMetas({ ano, mes, className = '' }: Props) {
  const { data, isPending, isError } = useQuery({
    queryKey: ['metas-conselheiro', ano, mes],
    queryFn: () => endpoints.metas.conselheiro(ano, mes),
  })

  if (isPending || isError || !data) {
    return null
  }

  const { sobraPrevistaMes, totalSugeridoAporte, sugestoes } = data
  const sobraNum = Number.parseFloat(sobraPrevistaMes || '0')
  const temSugestoes = sugestoes && sugestoes.length > 0

  return (
    <section
      aria-labelledby="titulo-conselheiro-metas"
      className={`relative flex flex-col justify-between overflow-hidden rounded-[var(--raio-card)] border border-[var(--cor-linha)] bg-[var(--cor-card)] p-4 sm:p-5 shadow-xs transition-all hover:shadow-sm ${className}`}
    >
      <div>
        {/* Cabeçalho do Card */}
        <div className="flex items-center justify-between gap-2 border-b border-[var(--cor-linha)]/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h2
                id="titulo-conselheiro-metas"
                className="m-0 text-sm font-bold text-[var(--cor-texto)]"
              >
                Conselheiro de Metas
              </h2>
              <span className="text-[11px] text-[var(--cor-mutado)]">
                {temSugestoes
                  ? `Sobra de ${formatarMoeda(sobraPrevistaMes)}`
                  : 'Planejamento com propósito'}
              </span>
            </div>
          </div>

          <Link
            to="/metas"
            className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-[var(--cor-principal)] hover:underline"
          >
            <span>Ver metas</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {/* Conteúdo Contextual */}
        <div className="mt-3.5">
          {temSugestoes ? (
            <div className="flex flex-col gap-3">
              <p className="m-0 text-xs text-[var(--cor-mutado)]">
                Sua sobra prevista é de {formatarMoeda(sobraPrevistaMes)}.
                Sugerimos destinar{' '}
                <strong className="font-semibold text-[var(--cor-texto)]">
                  {formatarMoeda(totalSugeridoAporte)}
                </strong>{' '}
                para suas caixinhas:
              </p>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {sugestoes.map((sugestao) => {
                  const preset = obterPresetVisual(sugestao.presetVisual)
                  return (
                    <div
                      key={sugestao.metaId}
                      className="flex items-center justify-between rounded-xl border border-[var(--cor-linha)]/80 bg-[var(--cor-fundo)] p-3"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[var(--cor-sobre-principal)]"
                          style={{
                            background: `linear-gradient(135deg, ${sugestao.corGradienteInicio || preset.corGradienteInicio}, ${sugestao.corGradienteFim || preset.corGradienteFim})`,
                          }}
                        >
                          {getIconePreset(sugestao.icone || preset.icone)}
                        </span>
                        <div className="min-w-0">
                          <h3 className="m-0 truncate text-xs font-bold text-[var(--cor-texto)]">
                            {sugestao.titulo}
                          </h3>
                          <p className="m-0 truncate text-[10px] text-[var(--cor-mutado)]">
                            {sugestao.motivo}
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 pl-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        + {formatarMoeda(sugestao.valorSugerido)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : sobraNum > 0 ? (
            <div className="flex flex-col items-start gap-2 py-1">
              <p className="m-0 text-xs text-[var(--cor-texto)]">
                Você tem sobra prevista este mês ({formatarMoeda(sobraPrevistaMes)}).
                Que tal criar uma caixinha para acelerar seus sonhos ou sua reserva?
              </p>
              <Link
                to="/metas"
                className="mt-1 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[var(--cor-principal)] px-3.5 py-1.5 text-xs font-bold text-[var(--cor-sobre-principal)] shadow-xs hover:opacity-90"
              >
                <Target className="size-3.5" />
                <span>Criar uma meta</span>
              </Link>
            </div>
          ) : (
            <div className="py-1 text-xs text-[var(--cor-mutado)]">
              <p className="m-0">
                Sem sobra prevista para novos aportes este mês. Priorize manter o
                orçamento e as despesas em dia antes de realizar novos depósitos.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
