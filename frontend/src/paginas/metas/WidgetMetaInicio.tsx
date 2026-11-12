import type { CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { endpoints } from '../../api/endpoints'
import { formatarMoeda } from '../../formato/moeda'
import { getIconePreset } from './iconesMeta'
import { obterPresetVisual } from './presetsVisuais'

interface WidgetMetaInicioProps {
  className?: string
  style?: CSSProperties
}

export function WidgetMetaInicio({ className, style }: WidgetMetaInicioProps = {}) {
  const { data: metas } = useQuery({
    queryKey: ['metas'],
    queryFn: () => endpoints.metas.listar(),
  })

  if (!metas || metas.length === 0) {
    return null
  }

  // Prioriza metas não concluídas
  const metaAtiva = metas.find((m) => !m.concluida) ?? metas[0]
  if (!metaAtiva) {
    return null
  }

  const preset = obterPresetVisual(metaAtiva.presetVisual)
  const percentualNum = Number.parseFloat(metaAtiva.percentualConcluido || '0') * 100
  const percentualInteiro = Math.round(percentualNum)

  return (
    <section
      aria-labelledby="titulo-widget-meta"
      style={style}
      className={`group flex items-center justify-between gap-3.5 rounded-2xl border border-[var(--cor-linha)] bg-[var(--cor-card)] p-3.5 shadow-xs transition-all hover:border-[var(--cor-principal)]/30 hover:shadow-sm${className ? ` ${className}` : ''}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {/* Ícone com gradiente do preset */}
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-xl text-[var(--cor-sobre-principal)] shadow-xs"
          style={{
            background: `linear-gradient(135deg, ${metaAtiva.corGradienteInicio || preset.corGradienteInicio}, ${metaAtiva.corGradienteFim || preset.corGradienteFim})`,
          }}
        >
          {getIconePreset(metaAtiva.icone || preset.icone)}
        </div>

        {/* Informações da meta */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3
              id="titulo-widget-meta"
              className="m-0 truncate text-xs font-bold text-[var(--cor-texto)]"
            >
              {metaAtiva.titulo}
            </h3>
            <span className="shrink-0 text-xs font-bold text-[var(--cor-principal)]">
              {percentualInteiro}%
            </span>
          </div>

          {/* Barra de progresso compacta */}
          <div
            role="progressbar"
            aria-label={`Progresso de ${metaAtiva.titulo}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percentualInteiro}
            aria-valuetext={`${percentualInteiro}% atingido`}
            className="my-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--cor-linha)]"
          >
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${Math.min(100, Math.max(0, percentualInteiro))}%`,
                background: `linear-gradient(90deg, ${metaAtiva.corGradienteInicio || preset.corGradienteInicio}, ${metaAtiva.corGradienteFim || preset.corGradienteFim})`,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[var(--cor-mutado)]">
            <span>
              {formatarMoeda(metaAtiva.valorGuardado)} de{' '}
              {formatarMoeda(metaAtiva.valorAlvo)}
            </span>
            {metaAtiva.concluida && (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                Concluída 🎉
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Atalho para /metas */}
      <Link
        to="/metas"
        aria-label="Ver metas"
        className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[var(--cor-linha)] bg-[var(--cor-fundo)] text-[var(--cor-mutado)] transition-colors hover:border-[var(--cor-principal)] hover:text-[var(--cor-principal)]"
      >
        <ArrowRight className="size-3.5" />
      </Link>
    </section>
  )
}
