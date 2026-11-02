import { useState } from 'react'
import { isoParaBr } from '../lancamentos/datas'
import type { CorProjeto, EstagioProjeto, PrioridadeProjeto, Projeto } from './tipos'

export interface LinhaProjetoListaProps {
  projeto: Projeto
  aoMoverEstagio?: (projetoId: number, novoEstagio: EstagioProjeto) => void
  aoClicarProjeto?: (projeto: Projeto) => void
  aoExcluirProjeto?: (projetoId: number) => void
  aoAlternarSubtarefa?: (projetoId: number, subtarefaId: number) => void
}

const MAPA_CORES: Record<CorProjeto, { dot: string; progresso: string }> = {
  azul: { dot: 'bg-blue-500', progresso: 'bg-blue-500' },
  esmeralda: { dot: 'bg-emerald-500', progresso: 'bg-emerald-500' },
  indigo: { dot: 'bg-indigo-500', progresso: 'bg-indigo-500' },
  ambar: { dot: 'bg-amber-500', progresso: 'bg-amber-500' },
  rosa: { dot: 'bg-pink-500', progresso: 'bg-pink-500' },
  roxo: { dot: 'bg-purple-500', progresso: 'bg-purple-500' },
}

const ROTULO_PRIORIDADE: Record<PrioridadeProjeto, { rotulo: string; classes: string }> = {
  BAIXA: { rotulo: 'Baixa', classes: 'text-[var(--cor-mutado)] bg-[var(--cor-linha)]/50 border-transparent' },
  MEDIA: { rotulo: 'Média', classes: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
  ALTA: { rotulo: 'Alta', classes: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  URGENTE: { rotulo: 'Urgente', classes: 'text-red-500 bg-red-500/10 border-red-500/20 font-semibold' },
}

const ESTAGIOS: { valor: EstagioProjeto; rotulo: string }[] = [
  { valor: 'A_FAZER', rotulo: 'A Fazer' },
  { valor: 'EM_ANDAMENTO', rotulo: 'Em Andamento' },
  { valor: 'EM_REVISAO', rotulo: 'Em Revisão' },
  { valor: 'CONCLUIDO', rotulo: 'Concluído' },
]

export function LinhaProjetoLista({
  projeto,
  aoMoverEstagio,
  aoClicarProjeto,
  aoExcluirProjeto,
  aoAlternarSubtarefa,
}: Readonly<LinhaProjetoListaProps>) {
  const [subtarefasAbertas, setSubtarefasAbertas] = useState(false)

  const estiloCor = MAPA_CORES[projeto.cor] || MAPA_CORES.azul
  const prioridadeInfo = ROTULO_PRIORIDADE[projeto.prioridade] || ROTULO_PRIORIDADE.MEDIA

  const hojeIso = new Date().toISOString().slice(0, 10)
  const isVencido = Boolean(
    projeto.prazo &&
    projeto.prazo < hojeIso &&
    projeto.estagio !== 'CONCLUIDO'
  )

  return (
    <>
      <tr className="group border-b border-[var(--cor-linha)] hover:bg-[var(--cor-card)]/50 transition-colors">
        {/* Título & Detalhes */}
        <td className="py-3 pl-4 pr-3 align-middle">
          <div className="flex items-center gap-2.5">
            <span className={`size-2 shrink-0 rounded-full ${estiloCor.dot}`} />
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => aoClicarProjeto?.(projeto)}
                className="text-left font-semibold text-xs sm:text-sm text-[var(--cor-texto)] hover:text-[var(--cor-principal)] transition-colors focus:outline-hidden cursor-pointer"
              >
                <span className="line-clamp-1">{projeto.titulo}</span>
              </button>
              {projeto.descricao && (
                <p className="line-clamp-1 text-[11px] text-[var(--cor-mutado)] mt-0.5">
                  {projeto.descricao}
                </p>
              )}
            </div>
          </div>
        </td>

        {/* Categoria */}
        <td className="py-3 px-3 align-middle whitespace-nowrap">
          {projeto.categoria ? (
            <span className="rounded-md bg-[var(--cor-fundo)] px-2 py-0.5 text-xs font-medium text-[var(--cor-mutado)] border border-[var(--cor-linha)]">
              {projeto.categoria}
            </span>
          ) : (
            <span className="text-xs text-[var(--cor-mutado)]/50">—</span>
          )}
        </td>

        {/* Prioridade */}
        <td className="py-3 px-3 align-middle whitespace-nowrap">
          <span className={`rounded-full px-2 py-0.5 text-[11px] border ${prioridadeInfo.classes}`}>
            {prioridadeInfo.rotulo}
          </span>
        </td>

        {/* Prazo */}
        <td className="py-3 px-3 align-middle whitespace-nowrap text-xs">
          {projeto.prazo ? (
            <div className={`flex items-center gap-1.5 ${isVencido ? 'text-red-500 font-medium' : 'text-[var(--cor-mutado)]'}`}>
              <svg aria-hidden="true" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>{isoParaBr(projeto.prazo)}</span>
              {isVencido && <span className="text-[10px] uppercase font-bold tracking-wider">(vencido)</span>}
            </div>
          ) : (
            <span className="text-[var(--cor-mutado)]/50">—</span>
          )}
        </td>

        {/* Subtarefas & Progresso */}
        <td className="py-3 px-3 align-middle whitespace-nowrap">
          {projeto.totalSubtarefas > 0 ? (
            <button
              type="button"
              aria-label={`Subtarefas de ${projeto.titulo}`}
              aria-expanded={subtarefasAbertas}
              onClick={() => setSubtarefasAbertas(!subtarefasAbertas)}
              className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-[var(--cor-fundo)] transition-colors cursor-pointer group/sub"
            >
              <div className="flex flex-col items-start gap-1">
                <span className="text-xs text-[var(--cor-mutado)] group-hover/sub:text-[var(--cor-texto)]">
                  {projeto.subtarefasConcluidas}/{projeto.totalSubtarefas} ({projeto.porcentagemProgresso}%)
                </span>
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--cor-linha)]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${estiloCor.progresso}`}
                    style={{ width: `${Math.min(100, Math.max(0, projeto.porcentagemProgresso))}%` }}
                  />
                </div>
              </div>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`text-[var(--cor-mutado)] transition-transform ${subtarefasAbertas ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          ) : (
            <span className="text-xs text-[var(--cor-mutado)]/50">Sem subtarefas</span>
          )}
        </td>

        {/* Dropdown Inline de Estágio */}
        <td className="py-3 px-3 align-middle whitespace-nowrap">
          <select
            aria-label={`Estágio de ${projeto.titulo}`}
            value={projeto.estagio}
            onChange={(e) => aoMoverEstagio?.(projeto.id, e.target.value as EstagioProjeto)}
            className="rounded-lg border border-[var(--cor-linha)] bg-[var(--cor-fundo)] px-2 py-1 text-xs text-[var(--cor-texto)] focus:border-[var(--cor-principal)] focus:outline-hidden cursor-pointer"
          >
            {ESTAGIOS.map((est) => (
              <option key={est.valor} value={est.valor}>
                {est.rotulo}
              </option>
            ))}
          </select>
        </td>

        {/* Ações */}
        <td className="py-3 pl-3 pr-4 align-middle text-right whitespace-nowrap">
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              aria-label={`Editar ${projeto.titulo}`}
              onClick={() => aoClicarProjeto?.(projeto)}
              className="flex size-7 items-center justify-center rounded-lg text-[var(--cor-mutado)] hover:bg-[var(--cor-linha)] hover:text-[var(--cor-texto)] transition-colors cursor-pointer"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            {aoExcluirProjeto && (
              <button
                type="button"
                aria-label={`Excluir ${projeto.titulo}`}
                onClick={() => aoExcluirProjeto(projeto.id)}
                className="flex size-7 items-center justify-center rounded-lg text-[var(--cor-mutado)] hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Painel Expansível de Subtarefas */}
      {subtarefasAbertas && projeto.subtarefas.length > 0 && (
        <tr className="bg-[var(--cor-fundo)]/60 border-b border-[var(--cor-linha)]">
          <td colSpan={7} className="py-2.5 pl-10 pr-4">
            <div className="space-y-1.5 max-w-lg">
              <span className="block text-[11px] font-semibold text-[var(--cor-mutado)] uppercase tracking-wider mb-1">
                Subtarefas ({projeto.subtarefasConcluidas}/{projeto.totalSubtarefas}):
              </span>
              {projeto.subtarefas.map((sub) => (
                <label
                  key={sub.id}
                  className="flex items-center gap-2 text-xs text-[var(--cor-texto)] cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={sub.concluida}
                    aria-label={`Alternar ${sub.titulo}`}
                    onChange={() => aoAlternarSubtarefa?.(projeto.id, sub.id)}
                    className="rounded border-[var(--cor-linha)] text-[var(--cor-principal)] focus:ring-[var(--cor-principal)]"
                  />
                  <span className={sub.concluida ? 'text-[var(--cor-mutado)] line-through' : ''}>
                    {sub.titulo}
                  </span>
                </label>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
