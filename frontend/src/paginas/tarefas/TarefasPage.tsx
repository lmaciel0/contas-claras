import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent, ReactNode } from 'react'
import type { TarefaResponse } from '../../api/tipos'
import { mensagemDoErro } from '../../auth/mensagemDoErro'
import { Esqueleto } from '../../componentes/Esqueleto'
import { TarefaLinha } from './TarefaLinha'
import { useConcluirTarefa, useCriarTarefa, useEditarTarefa, useExcluirTarefa, useTarefas } from './useTarefas'

const classeFoco =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]'
const classeCampo = `min-h-11 rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-fundo)] px-3.5 text-sm text-[var(--cor-texto)] placeholder:text-[var(--cor-mutado)] ${classeFoco}`
const classeBotaoPrimario = `min-h-11 cursor-pointer rounded-full bg-[var(--cor-principal)] px-4 text-sm font-semibold text-[var(--cor-sobre-principal)] ${classeFoco} disabled:cursor-not-allowed disabled:opacity-50`
const classeBotaoTexto = `min-h-11 cursor-pointer rounded-full px-3 text-sm font-semibold text-[var(--cor-principal)] ${classeFoco}`
const classeBotaoPerigoTexto = `min-h-11 cursor-pointer rounded-full px-3 text-sm font-semibold text-[var(--cor-negativo-texto)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-negativo)]`

type Modo = 'ver' | 'editar' | 'excluir'

const LIMITE_CONCLUIDAS = 50

interface LinhaProps {
  tarefa: TarefaResponse
  hoje: string
  mostrarSemData: boolean
  aoAlternar: (tarefa: TarefaResponse) => void
  alternando: boolean
  aoExcluida: (tarefa: TarefaResponse) => void
}

/** Linha com três estados: normal (com Editar e Excluir), edição de título e data, e confirmação de exclusão. */
function LinhaDeTarefa({ tarefa, hoje, mostrarSemData, aoAlternar, alternando, aoExcluida }: LinhaProps) {
  const [modo, setModo] = useState<Modo>('ver')
  const [titulo, setTitulo] = useState(tarefa.titulo)
  const [data, setData] = useState(tarefa.data ?? '')
  const editar = useEditarTarefa()
  const excluir = useExcluirTarefa()
  const idTitulo = useId()
  const idData = useId()
  const botaoEditar = useRef<HTMLButtonElement>(null)
  const botaoExcluir = useRef<HTMLButtonElement>(null)
  // Botão que recebe o foco quando a linha volta ao modo normal (a edição e a confirmação desmontam o botão de origem).
  const devolverFocoA = useRef<'editar' | 'excluir' | null>(null)

  useEffect(() => {
    if (modo !== 'ver' || devolverFocoA.current === null) return
    const alvo = devolverFocoA.current === 'editar' ? botaoEditar.current : botaoExcluir.current
    devolverFocoA.current = null
    alvo?.focus()
  }, [modo])

  function abrirEdicao() {
    setTitulo(tarefa.titulo)
    setData(tarefa.data ?? '')
    editar.reset()
    setModo('editar')
  }

  function cancelar() {
    editar.reset()
    devolverFocoA.current = 'editar'
    setModo('ver')
  }

  function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const limpo = titulo.trim()
    if (limpo === '' || editar.isPending) return
    editar.mutate({ id: tarefa.id, titulo: limpo, data: data === '' ? null : data }, {
      onSuccess: () => {
        devolverFocoA.current = 'editar'
        setModo('ver')
      },
    })
  }

  function aoTeclar(evento: KeyboardEvent<HTMLFormElement>) {
    if (evento.key === 'Escape') {
      evento.stopPropagation()
      cancelar()
    }
  }

  if (modo === 'editar') {
    return (
      <li className="py-1.5">
        <form onSubmit={salvar} onKeyDown={aoTeclar} className="flex flex-wrap items-end gap-2">
          <div className="flex min-w-48 flex-1 flex-col gap-1">
            <label htmlFor={idTitulo} className="text-xs text-[var(--cor-mutado)]">
              Título da tarefa
            </label>
            <input
              id={idTitulo}
              type="text"
              value={titulo}
              maxLength={200}
              autoFocus
              autoComplete="off"
              onChange={(e) => setTitulo(e.target.value)}
              className={classeCampo}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={idData} className="text-xs text-[var(--cor-mutado)]">
              Data da tarefa
            </label>
            <input id={idData} type="date" value={data} onChange={(e) => setData(e.target.value)} className={classeCampo} />
          </div>
          <button type="submit" disabled={editar.isPending} className={classeBotaoPrimario}>
            {editar.isPending ? 'Salvando…' : 'Salvar'}
          </button>
          <button type="button" onClick={cancelar} className={classeBotaoTexto}>
            Cancelar
          </button>
          {editar.isError && (
            <p role="alert" className="m-0 basis-full text-xs text-[var(--cor-negativo-texto)]">
              {mensagemDoErro(editar.error)}
            </p>
          )}
        </form>
      </li>
    )
  }

  if (modo === 'excluir') {
    return (
      <li className="py-1.5">
        <div
          role="group"
          aria-label="Confirmar exclusão"
          className="flex flex-wrap items-center gap-2 rounded-2xl bg-[var(--cor-fundo)] p-2.5"
        >
          <p className="m-0 min-w-0 flex-1 break-words text-sm font-medium">{`Excluir a tarefa ${tarefa.titulo}?`}</p>
          <button
            type="button"
            disabled={excluir.isPending}
            onClick={() => {
              // mutateAsync: a linha some quando a lista é relida, então o callback de mutate() não chegaria a rodar.
              excluir.mutateAsync(tarefa.id).then(
                () => aoExcluida(tarefa),
                () => undefined,
              )
            }}
            className="min-h-11 cursor-pointer rounded-full bg-[var(--cor-negativo)] px-4 text-sm font-semibold text-[var(--cor-sobre-negativo)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-negativo)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {excluir.isPending ? 'Excluindo…' : 'Sim, excluir'}
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => {
              devolverFocoA.current = 'excluir'
              setModo('ver')
            }}
            className={classeBotaoTexto}
          >
            Cancelar
          </button>
          {excluir.isError && (
            <p role="alert" className="m-0 basis-full text-xs text-[var(--cor-negativo-texto)]">
              {mensagemDoErro(excluir.error)}
            </p>
          )}
        </div>
      </li>
    )
  }

  return (
    <TarefaLinha
      tarefa={tarefa}
      hoje={hoje}
      aoAlternar={aoAlternar}
      desabilitada={alternando}
      mostrarSemData={mostrarSemData}
      acoes={
        <>
          <button
            ref={botaoEditar}
            type="button"
            aria-label={`Editar tarefa ${tarefa.titulo}`}
            onClick={abrirEdicao}
            className={classeBotaoTexto}
          >
            Editar
          </button>
          <button
            ref={botaoExcluir}
            type="button"
            aria-label={`Excluir tarefa ${tarefa.titulo}`}
            onClick={() => {
              excluir.reset()
              setModo('excluir')
            }}
            className={classeBotaoPerigoTexto}
          >
            Excluir
          </button>
        </>
      }
    />
  )
}

interface SecaoProps {
  titulo: string
  tarefas: TarefaResponse[]
  hoje: string
  mostrarSemData?: boolean
  aoAlternar: (tarefa: TarefaResponse) => void
  alternando: boolean
  aoExcluida: (tarefa: TarefaResponse) => void
}

function Secao({ titulo, tarefas, hoje, mostrarSemData = false, aoAlternar, alternando, aoExcluida }: SecaoProps) {
  const idTitulo = useId()
  if (tarefas.length === 0) return null
  return (
    <section aria-labelledby={idTitulo} className="card">
      <h2 id={idTitulo} className="m-0 mb-1 text-[15px] font-bold">
        {titulo}
      </h2>
      <ul className="m-0 flex list-none flex-col p-0">
        {tarefas.map((tarefa) => (
          <LinhaDeTarefa
            key={tarefa.id}
            tarefa={tarefa}
            hoje={hoje}
            mostrarSemData={mostrarSemData}
            aoAlternar={aoAlternar}
            alternando={alternando}
            aoExcluida={aoExcluida}
          />
        ))}
      </ul>
    </section>
  )
}

/**
 * `/tarefas`: campo para adicionar (sem data), seções Atrasadas, Hoje e Próximas (as vazias somem) e "Concluídas (N)"
 * recolhida por padrão, com as 50 mais recentes. Compartilha a chave de cache `['tarefas']` com o card do Início.
 */
export function TarefasPage() {
  const consulta = useTarefas()
  const criar = useCriarTarefa()
  const concluir = useConcluirTarefa()
  const [titulo, setTitulo] = useState('')
  const [concluidasAbertas, setConcluidasAbertas] = useState(false)
  const idConcluidas = useId()
  const idLista = useId()
  const campoNovaTarefa = useRef<HTMLInputElement>(null)
  const tituloDaPagina = useRef<HTMLHeadingElement>(null)
  const [aviso, setAviso] = useState('')

  // Concluir move a linha para outra seção (ela remonta) e excluir a remove: o foco vai para o título da página,
  // um destino fixo, e a região aria-live diz o que aconteceu. Não usamos o campo de texto para não abrir o teclado
  // do celular a cada tarefa concluída.
  function aoExcluida(tarefa: TarefaResponse) {
    setAviso(`Tarefa excluída: ${tarefa.titulo}`)
    tituloDaPagina.current?.focus()
  }

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const limpo = titulo.trim()
    if (limpo === '' || criar.isPending) return
    criar.mutate(
      { titulo: limpo, data: null },
      {
        onSuccess: () => {
          setTitulo('')
          setAviso(`Tarefa criada: ${limpo}`)
          campoNovaTarefa.current?.focus()
        },
      },
    )
  }

  const alternar = (tarefa: TarefaResponse) =>
    concluir.mutate(
      { id: tarefa.id, concluida: !tarefa.concluida },
      {
        onSuccess: () => {
          setAviso(`${tarefa.concluida ? 'Tarefa reaberta' : 'Tarefa concluída'}: ${tarefa.titulo}`)
          tituloDaPagina.current?.focus()
        },
      },
    )

  let conteudo: ReactNode
  if (consulta.isPending) {
    conteudo = (
      <div className="flex flex-col gap-3" role="status" aria-label="Carregando as tarefas…" aria-busy="true">
        <span className="sr-only">Carregando as tarefas…</span>
        <div aria-hidden="true" className="flex flex-col gap-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card flex items-center gap-3 py-3">
              <Esqueleto variante="circulo" className="size-5" />
              <Esqueleto className="h-4 flex-1" />
              <Esqueleto className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    )
  } else if (consulta.data === undefined) {
    conteudo = (
      <div role="alert" className="card flex flex-wrap items-center gap-3 text-sm">
        <p className="m-0">{mensagemDoErro(consulta.error)}</p>
        <button type="button" onClick={() => void consulta.refetch()} className={classeBotaoPrimario}>
          Tentar de novo
        </button>
      </div>
    )
  } else {
    const dados = consulta.data
    const semAbertas = dados.atrasadas.length + dados.deHoje.length + dados.proximas.length === 0
    const comum = { hoje: dados.hoje, aoAlternar: alternar, alternando: concluir.isPending, aoExcluida }
    conteudo = (
      <>
        {consulta.isError && (
          <p role="alert" className="m-0 text-xs text-[var(--cor-negativo-texto)]">
            {mensagemDoErro(consulta.error)}
          </p>
        )}
        {concluir.isError && (
          <p role="alert" className="m-0 text-xs text-[var(--cor-negativo-texto)]">
            {mensagemDoErro(concluir.error)}
          </p>
        )}
        {semAbertas && (
          <p className="card m-0 text-sm text-[var(--cor-mutado)]">Nenhuma tarefa por aqui. Que tal adicionar uma?</p>
        )}
        <Secao titulo="Atrasadas" tarefas={dados.atrasadas} {...comum} />
        <Secao titulo="Hoje" tarefas={dados.deHoje} {...comum} />
        <Secao titulo="Próximas" tarefas={dados.proximas} mostrarSemData {...comum} />
        <section aria-labelledby={idConcluidas} className="card">
          <h2 id={idConcluidas} className="m-0 text-[15px] font-bold">
            <button
              type="button"
              aria-expanded={concluidasAbertas}
              aria-controls={idLista}
              onClick={() => setConcluidasAbertas((aberta) => !aberta)}
              className={`flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-xl text-left text-[15px] font-bold ${classeFoco}`}
            >
              <span>{`Concluídas (${dados.totalConcluidas})`}</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className={`shrink-0 text-[var(--cor-mutado)] transition-transform duration-200 motion-reduce:transition-none ${concluidasAbertas ? 'rotate-180' : ''}`}
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </h2>
          <div id={idLista} hidden={!concluidasAbertas}>
            {dados.totalConcluidas > LIMITE_CONCLUIDAS && (
              <p className="m-0 mt-1 text-xs text-[var(--cor-mutado)]">{`Mostrando as ${LIMITE_CONCLUIDAS} mais recentes`}</p>
            )}
            {concluidasAbertas && dados.concluidas.length > 0 && (
              <ul className="m-0 mt-1 flex list-none flex-col p-0">
                {dados.concluidas.map((tarefa) => (
                  <LinhaDeTarefa
                    key={tarefa.id}
                    tarefa={tarefa}
                    hoje={dados.hoje}
                    mostrarSemData={false}
                    aoAlternar={alternar}
                    alternando={concluir.isPending}
                    aoExcluida={aoExcluida}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <div className="mb-3 sr-only md:not-sr-only md:mb-5">
        <h1 ref={tituloDaPagina} tabIndex={-1} className="m-0 text-[28px] font-bold tracking-tight outline-none">
          Tarefas
        </h1>
        <p className="m-0 mt-1 text-[13px] text-[var(--cor-mutado)]">O que precisa ser feito, do mais urgente ao mais distante.</p>
      </div>
      <div role="status" aria-live="polite" className="sr-only">
        {aviso}
      </div>
      <form onSubmit={aoEnviar} className="mb-4 flex items-center gap-2">
        <label htmlFor="nova-tarefa" className="sr-only">
          Adicionar uma tarefa
        </label>
        <input
          id="nova-tarefa"
          ref={campoNovaTarefa}
          type="text"
          value={titulo}
          maxLength={200}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Adicionar uma tarefa"
          autoComplete="off"
          className={`${classeCampo} min-w-0 flex-1`}
        />
        <button type="submit" disabled={criar.isPending} className={classeBotaoPrimario}>
          Adicionar
        </button>
      </form>
      {criar.isError && (
        <p role="alert" className="m-0 -mt-2 mb-3 text-xs text-[var(--cor-negativo-texto)]">
          {mensagemDoErro(criar.error)}
        </p>
      )}
      <div className="flex flex-col gap-3">{conteudo}</div>
    </>
  )
}
