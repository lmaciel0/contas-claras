import type { ReactNode } from 'react'
import type { TarefaResponse } from '../../api/tipos'
import { isoParaBr } from '../lancamentos/datas'

interface Props {
  tarefa: TarefaResponse
  /** Dia de hoje (`yyyy-MM-dd`) vindo da API, para decidir atraso sem `Date` do navegador. */
  hoje: string
  aoAlternar: (tarefa: TarefaResponse) => void
  desabilitada?: boolean
  /** Mostra "sem data" quando a tarefa não tem data (a página usa em Próximas). */
  mostrarSemData?: boolean
  /** Ações extras (editar, excluir) no fim da linha. */
  acoes?: ReactNode
}

/** `dd/mm` no ano de hoje, `dd/mm/aaaa` nos demais. */
function rotuloDaData(data: string, hoje: string): string {
  const completa = isoParaBr(data)
  return data.slice(0, 4) === hoje.slice(0, 4) ? completa.slice(0, 5) : completa
}

export function TarefaLinha({ tarefa, hoje, aoAlternar, desabilitada = false, mostrarSemData = false, acoes }: Props) {
  const atrasada = !tarefa.concluida && tarefa.data !== null && tarefa.data < hoje
  const rotulo = tarefa.concluida ? 'Reabrir tarefa' : 'Marcar como feita'

  return (
    <li className="flex min-h-11 items-center gap-3" data-atrasada={atrasada || undefined}>
      <button
        type="button"
        aria-label={rotulo}
        disabled={desabilitada}
        onClick={() => aoAlternar(tarefa)}
        className={`flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)] disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span
          aria-hidden="true"
          className={`flex size-6 items-center justify-center rounded-full border-2 transition-colors duration-200 ${
            tarefa.concluida
              ? 'border-[var(--cor-principal)] bg-[var(--cor-principal)] text-[var(--cor-sobre-principal)]'
              : 'border-[var(--cor-mutado)] bg-transparent'
          }`}
        >
          {tarefa.concluida && (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </button>
      <span
        className={`min-w-0 flex-1 break-words text-sm ${
          tarefa.concluida ? 'text-[var(--cor-mutado)] line-through' : 'text-[var(--cor-texto)]'
        }`}
      >
        {tarefa.titulo}
      </span>
      {tarefa.data !== null && (
        <span
          className={`shrink-0 text-xs ${
            atrasada ? 'font-medium text-[var(--cor-negativo-texto)]' : 'text-[var(--cor-mutado)]'
          }`}
        >
          {atrasada && <span>atrasada · </span>}
          <span>{rotuloDaData(tarefa.data, hoje)}</span>
        </span>
      )}
      {tarefa.data === null && mostrarSemData && <span className="shrink-0 text-xs text-[var(--cor-mutado)]">sem data</span>}
      {acoes}
    </li>
  )
}
