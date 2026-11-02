import { useState } from 'react'
import type { CorProjeto, EstagioProjeto, Projeto } from './tipos'

interface TimelineProjetosProps {
  projetos: Projeto[]
  aoClicarProjeto: (projeto: Projeto) => void
  aoCriarProjeto: () => void
}

type EscalaTimeline = 'mes' | 'trimestre'

const CORES_PROJETO: Record<CorProjeto, { borda: string; badge: string; dot: string; barra: string; barraBg: string }> = {
  azul: {
    borda: 'border-blue-500/30',
    badge: 'bg-blue-500/10 text-blue-400',
    dot: 'bg-blue-400',
    barra: 'bg-blue-500',
    barraBg: 'bg-blue-500/20',
  },
  esmeralda: {
    borda: 'border-emerald-500/30',
    badge: 'bg-emerald-500/10 text-emerald-400',
    dot: 'bg-emerald-400',
    barra: 'bg-emerald-500',
    barraBg: 'bg-emerald-500/20',
  },
  indigo: {
    borda: 'border-indigo-500/30',
    badge: 'bg-indigo-500/10 text-indigo-400',
    dot: 'bg-indigo-400',
    barra: 'bg-indigo-500',
    barraBg: 'bg-indigo-500/20',
  },
  ambar: {
    borda: 'border-amber-500/30',
    badge: 'bg-amber-500/10 text-amber-400',
    dot: 'bg-amber-400',
    barra: 'bg-amber-500',
    barraBg: 'bg-amber-500/20',
  },
  rosa: {
    borda: 'border-rose-500/30',
    badge: 'bg-rose-500/10 text-rose-400',
    dot: 'bg-rose-400',
    barra: 'bg-rose-500',
    barraBg: 'bg-rose-500/20',
  },
  roxo: {
    borda: 'border-purple-500/30',
    badge: 'bg-purple-500/10 text-purple-400',
    dot: 'bg-purple-400',
    barra: 'bg-purple-500',
    barraBg: 'bg-purple-500/20',
  },
}

const NOMES_ESTAGIO: Record<EstagioProjeto, string> = {
  A_FAZER: 'A Fazer',
  EM_ANDAMENTO: 'Em Andamento',
  EM_REVISAO: 'Em Revisão',
  CONCLUIDO: 'Concluído',
}

const BADGES_ESTAGIO: Record<EstagioProjeto, string> = {
  A_FAZER: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  EM_ANDAMENTO: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  EM_REVISAO: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  CONCLUIDO: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export function TimelineProjetos({
  projetos,
  aoClicarProjeto,
  aoCriarProjeto,
}: Readonly<TimelineProjetosProps>) {
  const [dataReferencia, setDataReferencia] = useState<Date>(() => new Date())
  const [escala, setEscala] = useState<EscalaTimeline>('mes')

  const ano = dataReferencia.getFullYear()
  const mesIndex = dataReferencia.getMonth()

  // Navegação
  const navegarAnterior = () => {
    setDataReferencia((prev) => {
      const d = new Date(prev)
      if (escala === 'mes') {
        d.setMonth(d.getMonth() - 1)
      } else {
        d.setMonth(d.getMonth() - 3)
      }
      return d
    })
  }

  const navegarProximo = () => {
    setDataReferencia((prev) => {
      const d = new Date(prev)
      if (escala === 'mes') {
        d.setMonth(d.getMonth() + 1)
      } else {
        d.setMonth(d.getMonth() + 3)
      }
      return d
    })
  }

  const navegarHoje = () => {
    setDataReferencia(new Date())
  }

  // Cálculo das datas limites do período
  let inicioPeriodo: Date
  let fimPeriodo: Date
  let colunas: { rotulo: string; subrotulo?: string }[] = []

  if (escala === 'mes') {
    inicioPeriodo = new Date(ano, mesIndex, 1, 0, 0, 0, 0)
    fimPeriodo = new Date(ano, mesIndex + 1, 0, 23, 59, 59, 999)
    const totalDias = fimPeriodo.getDate()

    // Divisão em 4 a 5 semanas do mês
    colunas = [
      { rotulo: 'Semana 1', subrotulo: '01 - 07' },
      { rotulo: 'Semana 2', subrotulo: '08 - 14' },
      { rotulo: 'Semana 3', subrotulo: '15 - 21' },
      { rotulo: 'Semana 4', subrotulo: '22 - 28' },
      ...(totalDias > 28 ? [{ rotulo: 'Semana 5', subrotulo: `29 - ${totalDias}` }] : []),
    ]
  } else {
    // Escala Trimestre: 3 meses centrados ou a partir do mês atual
    const mesInicioTri = Math.floor(mesIndex / 3) * 3
    inicioPeriodo = new Date(ano, mesInicioTri, 1, 0, 0, 0, 0)
    fimPeriodo = new Date(ano, mesInicioTri + 3, 0, 23, 59, 59, 999)

    colunas = [
      { rotulo: NOMES_MESES[mesInicioTri] ?? '', subrotulo: 'Mês 1' },
      { rotulo: NOMES_MESES[mesInicioTri + 1] ?? '', subrotulo: 'Mês 2' },
      { rotulo: NOMES_MESES[mesInicioTri + 2] ?? '', subrotulo: 'Mês 3' },
    ]
  }

  const duracaoTotalMs = Math.max(1, fimPeriodo.getTime() - inicioPeriodo.getTime())

  // Indicador de "Hoje"
  const hoje = new Date()
  const hojeEstaNoPeriodo = hoje >= inicioPeriodo && hoje <= fimPeriodo
  const hojeOffsetPercent = hojeEstaNoPeriodo
    ? ((hoje.getTime() - inicioPeriodo.getTime()) / duracaoTotalMs) * 100
    : null

  // Rótulo textual do período
  const rotuloPeriodo =
    escala === 'mes'
      ? `${NOMES_MESES[mesIndex] ?? ''} de ${ano}`
      : `${NOMES_MESES[inicioPeriodo.getMonth()] ?? ''} - ${NOMES_MESES[fimPeriodo.getMonth()] ?? ''} de ${ano}`

  if (projetos.length === 0) {
    return (
      <section
        role="region"
        aria-label="Linha do tempo de projetos"
        className="rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-card)] p-12 text-center"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--cor-fundo)] border border-[var(--cor-linha)] text-[var(--cor-mutado)] mb-4 shadow-inner">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-[var(--cor-texto)]">
          Nenhum projeto para exibir na linha do tempo
        </h3>
        <p className="mt-1 text-sm text-[var(--cor-mutado)] max-w-md mx-auto">
          Crie projetos com prazos e datas para acompanhar suas entregas em formato de roadmap e Gantt.
        </p>
        <div className="mt-6">
          <button
            type="button"
            onClick={aoCriarProjeto}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--cor-destaque)] px-4 py-2 text-sm font-semibold text-[var(--cor-destaque-texto)] shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Criar primeiro projeto
          </button>
        </div>
      </section>
    )
  }

  return (
    <section
      role="region"
      aria-label="Linha do tempo de projetos"
      className="space-y-4"
    >
      {/* Barra de Controles Temporal */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-card)] p-3 shadow-xs">
        {/* Navegação de Data */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-[var(--cor-linha)] bg-[var(--cor-fundo)] p-0.5">
            <button
              type="button"
              onClick={navegarAnterior}
              aria-label="Período anterior"
              className="rounded-md p-1.5 text-[var(--cor-mutado)] hover:text-[var(--cor-texto)] hover:bg-[var(--cor-card)] transition-colors cursor-pointer"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={navegarHoje}
              className="rounded-md px-2.5 py-1 text-xs font-medium text-[var(--cor-texto)] hover:bg-[var(--cor-card)] transition-colors cursor-pointer"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={navegarProximo}
              aria-label="Próximo período"
              className="rounded-md p-1.5 text-[var(--cor-mutado)] hover:text-[var(--cor-texto)] hover:bg-[var(--cor-card)] transition-colors cursor-pointer"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <h2 className="text-sm font-semibold text-[var(--cor-texto)] ml-1">
            {rotuloPeriodo}
          </h2>
        </div>

        {/* Alternador de Escala e Ações */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-[var(--cor-linha)] bg-[var(--cor-fundo)] p-0.5" role="group" aria-label="Escala de tempo">
            <button
              type="button"
              aria-label="Escala Mês"
              aria-pressed={escala === 'mes'}
              onClick={() => setEscala('mes')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                escala === 'mes'
                  ? 'bg-[var(--cor-card)] text-[var(--cor-texto)] shadow-xs'
                  : 'text-[var(--cor-mutado)] hover:text-[var(--cor-texto)]'
              }`}
            >
              Mês
            </button>
            <button
              type="button"
              aria-label="Escala Trimestre"
              aria-pressed={escala === 'trimestre'}
              onClick={() => setEscala('trimestre')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                escala === 'trimestre'
                  ? 'bg-[var(--cor-card)] text-[var(--cor-texto)] shadow-xs'
                  : 'text-[var(--cor-mutado)] hover:text-[var(--cor-texto)]'
              }`}
            >
              Trimestre
            </button>
          </div>

          <button
            type="button"
            onClick={aoCriarProjeto}
            aria-label="Adicionar projeto"
            className="flex items-center gap-1.5 rounded-lg bg-[var(--cor-destaque)] px-3 py-1.5 text-xs font-semibold text-[var(--cor-destaque-texto)] shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Novo Projeto</span>
          </button>
        </div>
      </div>

      {/* Grade de Gantt */}
      <div className="overflow-x-auto rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-card)] shadow-xs">
        <div className="min-w-[800px]">
          {/* Cabeçalho da Grade */}
          <div className="grid grid-cols-[260px_1fr] border-b border-[var(--cor-linha)] bg-[var(--cor-fundo)]/50">
            <div className="px-4 py-3 text-xs font-semibold text-[var(--cor-mutado)] uppercase tracking-wider border-r border-[var(--cor-linha)]">
              Projetos ({projetos.length})
            </div>

            <div
              className="grid text-center"
              style={{ gridTemplateColumns: `repeat(${colunas.length}, 1fr)` }}
            >
              {colunas.map((col, idx) => (
                <div
                  key={col.rotulo}
                  className={`py-2 px-1 text-xs ${
                    idx < colunas.length - 1 ? 'border-r border-[var(--cor-linha)]/50' : ''
                  }`}
                >
                  <div className="font-semibold text-[var(--cor-texto)]">{col.rotulo}</div>
                  {col.subrotulo && (
                    <div className="text-[10px] text-[var(--cor-mutado)]">{col.subrotulo}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Linhas da Grade de Projetos */}
          <div className="divide-y divide-[var(--cor-linha)]/40 relative">
            {/* Linha vertical de "Hoje" sobreposta */}
            {hojeOffsetPercent !== null && (
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-10 flex flex-col items-center"
                style={{ left: `calc(260px + (100% - 260px) * ${hojeOffsetPercent / 100})` }}
              >
                <span className="rounded bg-[var(--cor-destaque)] text-[var(--cor-destaque-texto)] text-[9px] font-bold px-1 py-0.2 shadow-xs -translate-y-1">
                  Hoje
                </span>
                <div className="w-px h-full bg-[var(--cor-destaque)] opacity-70" />
              </div>
            )}

            {projetos.map((projeto) => {
              const corEstilo = CORES_PROJETO[projeto.cor] ?? CORES_PROJETO.azul

              // Cálculo de posicionamento da barra
              const dataInicioProj = new Date(projeto.criadoEm)
              const temPrazo = Boolean(projeto.prazo)

              // Se não tem prazo, assume duração padrão de 7 dias ou até o fim da semana
              const dataFimProj = temPrazo && projeto.prazo
                ? new Date(`${projeto.prazo}T23:59:59`)
                : new Date(dataInicioProj.getTime() + 7 * 24 * 60 * 60 * 1000)

              // Mapeamento percentual
              const inicioOffset = dataInicioProj.getTime() - inicioPeriodo.getTime()
              const fimOffset = dataFimProj.getTime() - inicioPeriodo.getTime()

              let leftPercent = (inicioOffset / duracaoTotalMs) * 100
              let rightPercent = (fimOffset / duracaoTotalMs) * 100

              // Clamping para não vazar a grade se o projeto estiver no período
              leftPercent = Math.max(0, Math.min(95, leftPercent))
              rightPercent = Math.max(leftPercent + 4, Math.min(100, rightPercent))
              const widthPercent = Math.max(5, rightPercent - leftPercent)

              return (
                <div
                  key={projeto.id}
                  className="grid grid-cols-[260px_1fr] hover:bg-[var(--cor-fundo)]/40 transition-colors group"
                >
                  {/* Coluna Lateral do Projeto */}
                  <div className="flex items-center justify-between gap-2 px-4 py-3 border-r border-[var(--cor-linha)]">
                    <button
                      type="button"
                      onClick={() => aoClicarProjeto(projeto)}
                      aria-label={`Editar ${projeto.titulo}`}
                      className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group-hover:text-[var(--cor-destaque)] transition-colors"
                    >
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${corEstilo.dot}`} />
                      <span className="text-xs font-semibold text-[var(--cor-texto)] truncate">
                        {projeto.titulo}
                      </span>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${BADGES_ESTAGIO[projeto.estagio]}`}
                      >
                        {NOMES_ESTAGIO[projeto.estagio]}
                      </span>
                      <span className="text-[10px] font-semibold text-[var(--cor-mutado)] min-w-[28px] text-right">
                        {projeto.porcentagemProgresso}%
                      </span>
                    </div>
                  </div>

                  {/* Grade Temporal com a Barra Gantt */}
                  <div className="relative py-2.5 px-2 flex items-center min-h-[44px]">
                    {/* Linhas verticais de fundo da coluna */}
                    <div
                      className="absolute inset-0 grid pointer-events-none"
                      style={{ gridTemplateColumns: `repeat(${colunas.length}, 1fr)` }}
                    >
                      {colunas.map((col, idx) => (
                        <div
                          key={`grade-${col.rotulo}`}
                          className={`h-full ${
                            idx < colunas.length - 1 ? 'border-r border-[var(--cor-linha)]/30' : ''
                          }`}
                        />
                      ))}
                    </div>

                    {/* Barra de Gantt do Projeto */}
                    <button
                      type="button"
                      onClick={() => aoClicarProjeto(projeto)}
                      aria-label={`Ver projeto ${projeto.titulo}`}
                      title={`${projeto.titulo} - ${NOMES_ESTAGIO[projeto.estagio]} (${projeto.porcentagemProgresso}% concluído)${!temPrazo ? ' - Sem prazo' : ''}`}
                      className={`relative z-1 h-7 rounded-md border text-left text-xs transition-transform hover:scale-[1.01] hover:shadow-md cursor-pointer overflow-hidden flex items-center ${
                        corEstilo.borda
                      } ${corEstilo.barraBg} ${
                        !temPrazo ? 'border-dashed opacity-80' : ''
                      }`}
                      style={{
                        marginLeft: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                      }}
                    >
                      {/* Preenchimento do Progresso */}
                      <div
                        className={`absolute inset-y-0 left-0 ${corEstilo.barra} opacity-75 transition-all duration-300`}
                        style={{ width: `${projeto.porcentagemProgresso}%` }}
                      />

                      {/* Conteúdo textual da barra */}
                      <div className="relative z-2 flex items-center justify-between w-full px-2 text-[11px] font-medium text-[var(--cor-texto)] drop-shadow-xs truncate">
                        <span className="truncate">{projeto.titulo}</span>
                        {!temPrazo && (
                          <span className="ml-1 shrink-0 rounded bg-black/40 px-1 py-0.2 text-[9px] text-[var(--cor-mutado)]">
                            Sem prazo
                          </span>
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
