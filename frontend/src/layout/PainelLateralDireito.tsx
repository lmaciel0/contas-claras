import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import type { TarefaResponse } from '../api/tipos'
import { useConcluirTarefa, useCriarTarefa, useTarefas } from '../paginas/tarefas/useTarefas'

const foco = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]'

const NOMES_MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

interface PainelLateralDireitoProps {
  className?: string
  aoFechar?: () => void
}

function extrairAnoEMes(dadosHoje?: string) {
  if (dadosHoje) {
    const partes = dadosHoje.split('-').map(Number)
    const ano = partes[0]
    const mes = partes[1]
    if (typeof ano === 'number' && !Number.isNaN(ano) && typeof mes === 'number' && !Number.isNaN(mes)) {
      return { ano, mes: mes - 1 }
    }
  }
  return { ano: 2026, mes: 9 }
}

/**
 * Painel lateral direito de produtividade (estilo SaaS):
 * - Mini calendário interativo do mês com navegação e seleção de dia
 * - Minhas Tarefas de Hoje (com alternância rápida e criação rápida)
 * - Próximas Tarefas
 */
export function PainelLateralDireito({ className = '', aoFechar }: PainelLateralDireitoProps) {
  const { data: dados, isPending } = useTarefas()
  const concluir = useConcluirTarefa()
  const criar = useCriarTarefa()

  const baseAnoEMes = useMemo(() => extrairAnoEMes(dados?.hoje), [dados?.hoje])
  const [deslocamentoMes, setDeslocamentoMes] = useState(0)

  const dataExibida = useMemo(() => {
    const data = new Date(baseAnoEMes.ano, baseAnoEMes.mes + deslocamentoMes, 1)
    return { ano: data.getFullYear(), mes: data.getMonth() }
  }, [baseAnoEMes, deslocamentoMes])

  const anoExibido = dataExibida.ano
  const mesExibido = dataExibida.mes

  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)
  const [novaTarefaHoje, setNovaTarefaHoje] = useState('')
  const [mostrarFormNova, setMostrarFormNova] = useState(false)

  // Atualiza se ano/mês ainda não tiver sido tocado
  const mesNome = NOMES_MESES[mesExibido]

  function mesAnterior() {
    setDeslocamentoMes((d) => d - 1)
  }

  function mesSeguinte() {
    setDeslocamentoMes((d) => d + 1)
  }

  // Gera a matriz de dias do mês atual
  const diasDoMes = useMemo(() => {
    const primeiroDiaSemana = new Date(anoExibido, mesExibido, 1).getDay()
    const totalDiasNoMes = new Date(anoExibido, mesExibido + 1, 0).getDate()

    const celulas: Array<{ numero: number; iso: string } | null> = []
    for (let i = 0; i < primeiroDiaSemana; i++) {
      celulas.push(null)
    }
    for (let d = 1; d <= totalDiasNoMes; d++) {
      const mFormatado = String(mesExibido + 1).padStart(2, '0')
      const dFormatado = String(d).padStart(2, '0')
      celulas.push({
        numero: d,
        iso: `${anoExibido}-${mFormatado}-${dFormatado}`,
      })
    }
    return celulas
  }, [anoExibido, mesExibido])

  // Conjunto de datas que têm tarefas agendadas
  const datasComTarefas = useMemo(() => {
    const conjunto = new Set<string>()
    if (!dados) return conjunto
    const todas = [
      ...dados.atrasadas,
      ...dados.deHoje,
      ...dados.proximas,
      ...dados.concluidasHoje,
    ]
    for (const t of todas) {
      if (t.data) conjunto.add(t.data)
    }
    return conjunto
  }, [dados])

  function aoCriarTarefa(e: FormEvent) {
    e.preventDefault()
    const limpo = novaTarefaHoje.trim()
    if (!limpo || !dados?.hoje || criar.isPending) return
    criar.mutate(
      { titulo: limpo, data: dados.hoje },
      {
        onSuccess: () => {
          setNovaTarefaHoje('')
          setMostrarFormNova(false)
        },
      },
    )
  }

  const tarefasHojeEAtrazadas = useMemo(() => {
    if (!dados) return []
    return [...dados.atrasadas, ...dados.deHoje]
  }, [dados])

  const proximasTarefas = dados?.proximas.slice(0, 5) ?? []

  return (
    <aside
      aria-label="Painel de Produtividade"
      className={`flex flex-col gap-4 border-l border-[var(--cor-linha)] bg-[var(--cor-fundo)] p-4 text-[var(--cor-texto)] ${className}`}
    >
      {/* Botão de fechar se exibido como gaveta/drawer */}
      {aoFechar && (
        <div className="flex justify-end lg:hidden">
          <button
            type="button"
            aria-label="Fechar painel de produtividade"
            onClick={aoFechar}
            className={`rounded-lg p-2 text-[var(--cor-mutado)] hover:bg-[var(--cor-card)] ${foco}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* 1. SEÇÃO MEU CALENDÁRIO */}
      <section
        aria-label="Meu Calendário"
        aria-labelledby="titulo-calendario"
        className="rounded-2xl border border-[var(--cor-linha)] bg-[var(--cor-card)] p-3.5 shadow-xs"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="titulo-calendario" className="text-sm font-bold tracking-tight text-[var(--cor-texto)]">
            Meu Calendário
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Mês anterior no calendário"
              onClick={mesAnterior}
              className={`grid size-7 place-items-center rounded-lg text-[var(--cor-mutado)] transition-colors hover:bg-[var(--cor-fundo)] hover:text-[var(--cor-texto)] ${foco}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span className="min-w-[100px] text-center text-xs font-semibold text-[var(--cor-texto)]">
              {`${mesNome}, ${anoExibido}`}
            </span>
            <button
              type="button"
              aria-label="Próximo mês no calendário"
              onClick={mesSeguinte}
              className={`grid size-7 place-items-center rounded-lg text-[var(--cor-mutado)] transition-colors hover:bg-[var(--cor-fundo)] hover:text-[var(--cor-texto)] ${foco}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Grade semanal */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[var(--cor-mutado)] mb-1">
          {DIAS_SEMANA.map((dia, idx) => (
            <span key={`${dia}-${idx}`}>{dia}</span>
          ))}
        </div>

        {/* Grade de dias */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {diasDoMes.map((dia, idx) => {
            if (!dia) {
              return <div key={`vazio-${idx}`} className="size-7" />
            }
            const ehHoje = dia.iso === dados?.hoje
            const ehSelecionado = dia.iso === diaSelecionado
            const temTarefa = datasComTarefas.has(dia.iso)

            return (
              <button
                key={dia.iso}
                type="button"
                onClick={() => setDiaSelecionado(dia.iso)}
                aria-label={`Dia ${dia.numero} de ${mesNome}`}
                className={`relative flex size-7 items-center justify-center rounded-lg text-xs font-medium transition-all ${
                  ehSelecionado
                    ? 'bg-[var(--cor-principal)] text-[var(--cor-sobre-principal)] font-bold shadow-xs'
                    : ehHoje
                      ? 'border border-[var(--cor-principal)] text-[var(--cor-principal)] font-bold'
                      : 'text-[var(--cor-texto)] hover:bg-[var(--cor-fundo)]'
                } ${foco}`}
              >
                <span>{dia.numero}</span>
                {temTarefa && !ehSelecionado && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0.5 size-1 rounded-full bg-[var(--cor-principal)]"
                  />
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* 2. SEÇÃO MINHAS TAREFAS DE HOJE */}
      <section
        aria-label="Minhas Tarefas de Hoje"
        aria-labelledby="titulo-tarefas-hoje"
        className="rounded-2xl border border-[var(--cor-linha)] bg-[var(--cor-card)] p-3.5 shadow-xs"
      >
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 id="titulo-tarefas-hoje" className="text-sm font-bold tracking-tight text-[var(--cor-texto)]">
              Minhas Tarefas de Hoje
            </h2>
            {tarefasHojeEAtrazadas.length > 0 && (
              <span className="rounded-full bg-[var(--cor-principal-clara)] px-2 py-0.5 text-[11px] font-bold text-[var(--cor-principal)]">
                {tarefasHojeEAtrazadas.length}
              </span>
            )}
          </div>
          <button
            type="button"
            aria-label="Adicionar tarefa rápida para hoje"
            onClick={() => setMostrarFormNova((v) => !v)}
            className={`grid size-7 place-items-center rounded-lg bg-[var(--cor-principal-clara)] text-[var(--cor-principal)] transition-colors hover:bg-[var(--cor-principal)] hover:text-[var(--cor-sobre-principal)] ${foco}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        {mostrarFormNova && (
          <form onSubmit={aoCriarTarefa} className="mb-3 flex items-center gap-1.5">
            <input
              type="text"
              autoFocus
              value={novaTarefaHoje}
              onChange={(e) => setNovaTarefaHoje(e.target.value)}
              placeholder="Nova tarefa hoje…"
              className={`min-h-9 flex-1 rounded-lg border border-[var(--cor-linha)] bg-[var(--cor-fundo)] px-2.5 text-xs text-[var(--cor-texto)] placeholder:text-[var(--cor-mutado)] ${foco}`}
            />
            <button
              type="submit"
              disabled={criar.isPending}
              className={`min-h-9 rounded-lg bg-[var(--cor-principal)] px-2.5 text-xs font-semibold text-[var(--cor-sobre-principal)] ${foco} disabled:opacity-50`}
            >
              Salvar
            </button>
          </form>
        )}

        {isPending ? (
          <div className="flex flex-col gap-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-6 animate-pulse rounded bg-[var(--cor-linha)]" />
            ))}
          </div>
        ) : tarefasHojeEAtrazadas.length === 0 ? (
          <p className="text-xs text-[var(--cor-mutado)]">Nenhuma tarefa pendente para hoje.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 list-none p-0 m-0">
            {tarefasHojeEAtrazadas.slice(0, 5).map((tarefa: TarefaResponse) => (
              <li
                key={tarefa.id}
                className="group flex items-center justify-between gap-2 rounded-xl p-1.5 transition-colors hover:bg-[var(--cor-fundo)]"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <button
                    type="button"
                    aria-label={
                      tarefa.concluida
                        ? `Reabrir tarefa ${tarefa.titulo}`
                        : `Concluir tarefa ${tarefa.titulo}`
                    }
                    onClick={() =>
                      concluir.mutate({ id: tarefa.id, concluida: !tarefa.concluida })
                    }
                    className={`grid size-5 shrink-0 place-items-center rounded-md border ${
                      tarefa.concluida
                        ? 'border-[var(--cor-positivo)] bg-[var(--cor-positivo)] text-[var(--cor-sobre-principal)]'
                        : 'border-[var(--cor-linha)] bg-[var(--cor-card)] group-hover:border-[var(--cor-principal)]'
                    } ${foco}`}
                  >
                    {tarefa.concluida && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                  <span
                    className={`truncate text-xs ${
                      tarefa.concluida
                        ? 'text-[var(--cor-mutado)] line-through'
                        : 'text-[var(--cor-texto)] font-medium'
                    }`}
                  >
                    {tarefa.titulo}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2 pt-2 border-t border-[var(--cor-linha)]">
          <Link
            to="/tarefas"
            className={`text-[11px] font-semibold text-[var(--cor-principal)] hover:underline ${foco}`}
          >
            Ver todas no quadro →
          </Link>
        </div>
      </section>

      {/* 3. SEÇÃO PRÓXIMAS TAREFAS */}
      <section
        aria-label="Próximas Tarefas"
        aria-labelledby="titulo-proximas-tarefas"
        className="rounded-2xl border border-[var(--cor-linha)] bg-[var(--cor-card)] p-3.5 shadow-xs"
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 id="titulo-proximas-tarefas" className="text-sm font-bold tracking-tight text-[var(--cor-texto)]">
            Próximas Tarefas
          </h2>
          {proximasTarefas.length > 0 && (
            <span className="text-[11px] text-[var(--cor-mutado)]">
              {proximasTarefas.length} agendadas
            </span>
          )}
        </div>

        {isPending ? (
          <div className="flex flex-col gap-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-6 animate-pulse rounded bg-[var(--cor-linha)]" />
            ))}
          </div>
        ) : proximasTarefas.length === 0 ? (
          <p className="text-xs text-[var(--cor-mutado)]">Nenhuma tarefa agendada adiante.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 list-none p-0 m-0">
            {proximasTarefas.map((tarefa: TarefaResponse) => (
              <li
                key={tarefa.id}
                className="flex items-center justify-between gap-2 rounded-xl p-1.5 transition-colors hover:bg-[var(--cor-fundo)]"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-full bg-[var(--cor-principal)]"
                  />
                  <span className="truncate text-xs font-medium text-[var(--cor-texto)]">
                    {tarefa.titulo}
                  </span>
                </div>
                {tarefa.data && (
                  <span className="shrink-0 rounded-md bg-[var(--cor-fundo)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--cor-mutado)]">
                    {tarefa.data.slice(5).replace('-', '/')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  )
}
