import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { ErroApi } from '../../api/cliente'
import type { TarefaResponse } from '../../api/tipos'
import { TarefaLinha } from '../tarefas/TarefaLinha'
import { useConcluirTarefa, useCriarTarefa, useTarefas } from '../tarefas/useTarefas'

const LIMITE_DE_ITENS = 5

const classeLink =
  'inline-flex min-h-11 items-center px-1 text-sm font-semibold text-[var(--cor-principal)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]'

/**
 * Card "Hoje" da tela inicial: tarefas atrasadas e de hoje, seguidas das concluídas hoje (as 5 primeiras, com "+N" para
 * o resto), contador "X de Y feitas" e campo para criar uma tarefa já com a data de hoje. O carregamento e o erro ficam
 * só dentro do card. Compartilha a chave de cache `['tarefas']` com a página de tarefas.
 */
export function TarefasDeHoje() {
  const consulta = useTarefas()
  const criar = useCriarTarefa()
  const concluir = useConcluirTarefa()
  const [titulo, setTitulo] = useState('')

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const limpo = titulo.trim()
    if (limpo === '' || consulta.data === undefined || criar.isPending) return
    criar.mutate(
      { titulo: limpo, data: consulta.data.hoje },
      {
        onSuccess: () => setTitulo(''),
      },
    )
  }

  const alternar = (tarefa: TarefaResponse) => concluir.mutate({ id: tarefa.id, concluida: !tarefa.concluida })

  const dados = consulta.data
  const abertas = dados ? dados.atrasadas.length + dados.deHoje.length : 0
  const total = dados ? abertas + dados.concluidasHoje.length : 0
  const itens = dados ? [...dados.atrasadas, ...dados.deHoje, ...dados.concluidasHoje] : []
  const visiveis = itens.slice(0, LIMITE_DE_ITENS)
  const restantes = itens.length - visiveis.length

  return (
    <section aria-labelledby="titulo-tarefas-hoje" className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex items-baseline gap-2.5">
          <h2 id="titulo-tarefas-hoje" className="m-0 text-[15px] font-bold">
            Hoje
          </h2>
          {dados && total > 0 && (
            <span className="text-xs text-[var(--cor-mutado)]">{`${dados.concluidasHoje.length} de ${total} feitas`}</span>
          )}
        </div>
        <Link to="/tarefas" className={classeLink}>
          Ver todas
        </Link>
      </div>

      {consulta.isPending && (
        <div aria-busy="true" className="flex flex-col gap-3">
          <span className="sr-only">Carregando as tarefas…</span>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-5 animate-pulse rounded-md bg-[var(--cor-linha)] motion-reduce:animate-none" />
          ))}
        </div>
      )}

      {consulta.isError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
          <p className="m-0">
            {consulta.error instanceof ErroApi ? consulta.error.mensagem : 'Não deu para carregar as tarefas.'}
          </p>
          <button
            type="button"
            onClick={() => void consulta.refetch()}
            className="min-h-11 cursor-pointer rounded-full bg-[var(--cor-principal)] px-4 text-sm font-semibold text-[var(--cor-sobre-principal)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
          >
            Tentar de novo
          </button>
        </div>
      )}

      {dados && (
        <>
          {visiveis.length === 0 ? (
            <p className="m-0 mb-3 text-sm text-[var(--cor-mutado)]">Nada para hoje. Que tal adicionar uma tarefa?</p>
          ) : (
            <ul className="m-0 mb-1 flex list-none flex-col p-0">
              {visiveis.map((tarefa) => (
                <TarefaLinha
                  key={tarefa.id}
                  tarefa={tarefa}
                  hoje={dados.hoje}
                  aoAlternar={alternar}
                  desabilitada={concluir.isPending}
                />
              ))}
            </ul>
          )}
          {restantes > 0 && (
            <Link to="/tarefas" className={`${classeLink} mb-2`}>{`+${restantes}`}</Link>
          )}

          <form onSubmit={aoEnviar} className="mt-2 flex items-center gap-2">
            <label htmlFor="nova-tarefa-hoje" className="sr-only">
              Nova tarefa
            </label>
            <input
              id="nova-tarefa-hoje"
              type="text"
              value={titulo}
              maxLength={200}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Nova tarefa"
              autoComplete="off"
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-fundo)] px-3.5 text-sm text-[var(--cor-texto)] placeholder:text-[var(--cor-mutado)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
            />
            <button
              type="submit"
              disabled={criar.isPending}
              className="min-h-11 cursor-pointer rounded-full bg-[var(--cor-principal)] px-4 text-sm font-semibold text-[var(--cor-sobre-principal)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Adicionar
            </button>
          </form>
          {criar.isError && (
            <p className="m-0 mt-2 text-xs text-[var(--cor-negativo-texto)]">
              {criar.error instanceof ErroApi ? criar.error.mensagem : 'Não deu para criar a tarefa.'}
            </p>
          )}
        </>
      )}
    </section>
  )
}
