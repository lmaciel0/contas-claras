import {
  Calendar,
  CheckCircle2,
  Minus,
  Pencil,
  Plus,
} from 'lucide-react'
import { useId } from 'react'
import type { MetaResponse } from '../../api/tipos'
import { formatarMoeda } from '../../formato/moeda'
import { getIconePreset } from './iconesMeta'
import { obterPresetVisual } from './presetsVisuais'

interface Props {
  meta: MetaResponse
  aoGuardar?: (meta: MetaResponse) => void
  aoResgatar?: (meta: MetaResponse) => void
  aoEditar?: (meta: MetaResponse) => void
}

export function CardMeta({ meta, aoGuardar, aoResgatar, aoEditar }: Props) {
  const idTitulo = useId()
  const preset = obterPresetVisual(meta.presetVisual)
  const percentualNum = Number.parseFloat(meta.percentualConcluido || '0') * 100
  const percentualInteiro = Math.round(percentualNum)
  const fotoExibicao = meta.fotoUrl || preset.fotoPadrao

  return (
    <section
      aria-labelledby={idTitulo}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--cor-linha)] bg-[var(--cor-card)] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
    >
      {/* Top Banner visual inspirado em cartão / foto */}
      <div
        className="relative h-28 w-full overflow-hidden select-none"
        style={{
          background: `linear-gradient(135deg, ${meta.corGradienteInicio || preset.corGradienteInicio} 0%, ${meta.corGradienteFim || preset.corGradienteFim} 100%)`,
        }}
      >
        {fotoExibicao && (
          <img
            src={fotoExibicao}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-overlay transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20"
          aria-hidden="true"
        />

        {/* Cabeçalho superior do banner: preset tag e botão de editar */}
        <div className="relative z-10 flex items-center justify-between p-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-md">
            {getIconePreset(meta.icone || preset.icone)}
            <span>{preset.nome}</span>
          </span>

          <div className="flex items-center gap-1.5">
            {meta.concluida && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur-sm">
                <CheckCircle2 className="size-3" />
                Concluída
              </span>
            )}
            {aoEditar && (
              <button
                type="button"
                onClick={() => aoEditar(meta)}
                aria-label={`Editar ${meta.titulo}`}
                title={`Editar ${meta.titulo}`}
                className="inline-flex size-7 cursor-pointer items-center justify-center rounded-full bg-black/30 text-white/80 transition-colors hover:bg-black/50 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
              >
                <Pencil className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Título da meta no banner */}
        <div className="absolute right-3 bottom-3 left-3 z-10">
          <h3
            id={idTitulo}
            className="m-0 truncate text-base font-bold text-white drop-shadow-sm"
          >
            {meta.titulo}
          </h3>
        </div>
      </div>

      {/* Corpo com valores e barra de progresso */}
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          {/* Valores guardado e alvo */}
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <span className="text-[11px] font-medium text-[var(--cor-mutado)]">
                Guardado
              </span>
              <p className="m-0 text-xl font-bold tracking-tight text-[var(--cor-texto)]">
                {formatarMoeda(meta.valorGuardado)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-medium text-[var(--cor-mutado)]">
                Alvo
              </span>
              <p className="m-0 text-xs font-semibold text-[var(--cor-mutado)]">
                de {formatarMoeda(meta.valorAlvo)}
              </p>
            </div>
          </div>

          {/* Barra de progresso */}
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-[11px] font-medium text-[var(--cor-mutado)]">
                {meta.concluida
                  ? 'Objetivo alcançado!'
                  : `Faltam ${formatarMoeda(meta.valorRestante)}`}
              </span>
              <span className="font-bold text-[var(--cor-principal)]">
                {percentualInteiro}%
              </span>
            </div>

            <div
              role="meter"
              aria-label={`Progresso da meta ${meta.titulo}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percentualInteiro}
              aria-valuetext={`${percentualInteiro}% da meta atingida`}
              className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--cor-linha)]"
            >
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${Math.min(100, Math.max(0, percentualInteiro))}%`,
                  background: `linear-gradient(90deg, ${meta.corGradienteInicio || preset.corGradienteInicio}, ${meta.corGradienteFim || preset.corGradienteFim})`,
                }}
              />
            </div>
          </div>

          {/* Informações de ritmo e prazo */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-1 text-[11px] text-[var(--cor-mutado)]">
            {meta.valorMensalSugerido && !meta.concluida ? (
              <span className="inline-flex items-center gap-1 font-semibold text-[var(--cor-principal)]">
                <Calendar className="size-3 shrink-0" />
                {formatarMoeda(meta.valorMensalSugerido)}/mês
              </span>
            ) : (
              <span />
            )}

            {meta.prazo ? (
              <span>
                Prazo:{' '}
                {new Date(meta.prazo + 'T00:00:00').toLocaleDateString('pt-BR', {
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            ) : (
              <span>Sem prazo fixo</span>
            )}
          </div>
        </div>

        {/* Ações rápidas de aporte e resgate */}
        <div className="mt-4 flex items-center gap-2 border-t border-[var(--cor-linha)]/60 pt-3">
          <button
            type="button"
            onClick={() => aoGuardar?.(meta)}
            className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 active:scale-98 focus-visible:outline-2 focus-visible:outline-emerald-600"
          >
            <Plus className="size-3.5" />
            <span>Guardar</span>
          </button>

          <button
            type="button"
            onClick={() => aoResgatar?.(meta)}
            disabled={Number.parseFloat(meta.valorGuardado || '0') <= 0}
            className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-fundo)] px-3 py-2 text-xs font-semibold text-[var(--cor-texto)] transition-colors hover:bg-[var(--cor-card)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[var(--cor-principal)]"
          >
            <Minus className="size-3.5" />
            <span>Resgatar</span>
          </button>
        </div>
      </div>
    </section>
  )
}
