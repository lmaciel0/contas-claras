import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ErroApi } from '../../api/cliente'
import type { ConteudoNota, NotaFixadaResponse } from '../../api/tipos'
import { corDaCategoria } from '../notas/coresCategoria'
import { ConteudoSomenteLeitura } from '../notas/ConteudoSomenteLeitura'
import { useCategoriasNota, useNotaFixada, useSalvarConteudoNota } from '../notas/useNotas'

/** Espera curta para juntar cliques seguidos numa só gravação. */
const ATRASO_GRAVACAO_MS = 300
const CHAVE = ['nota-fixada']

const classeLink =
  'inline-flex min-h-11 items-center px-1 text-sm font-semibold text-[var(--cor-principal)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]'

interface Pendente {
  id: number
  conteudo: ConteudoNota
  /** Cache de antes da primeira marcação do lote, para desfazer se a gravação falhar. */
  anterior: NotaFixadaResponse | undefined
}

/**
 * Card "Nota fixada" da tela inicial: título com a cor da categoria, conteúdo somente leitura com rolagem interna e
 * caixinhas que marcam na hora (otimista) e gravam em lote após ~300 ms, com descarga ao sair da tela. Tem consulta
 * própria: a saudação e os outros cards não esperam por ele, e o erro fica só dentro do card.
 */
export function NotaFixada() {
  const queryClient = useQueryClient()
  const consulta = useNotaFixada()
  const categorias = useCategoriasNota()
  const pendente = useRef<Pendente | null>(null)
  const salvar = useSalvarConteudoNota(() => pendente.current !== null)
  const [avisoErro, setAvisoErro] = useState(false)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)

  const gravar = useCallback(() => {
    if (temporizador.current !== null) clearTimeout(temporizador.current)
    temporizador.current = null
    const lote = pendente.current
    pendente.current = null
    if (lote === null) return
    salvar.mutate(
      { id: lote.id, conteudo: lote.conteudo },
      {
        onError: () => {
          queryClient.setQueryData(CHAVE, lote.anterior)
          setAvisoErro(true)
        },
      },
    )
  }, [salvar, queryClient])

  // Descarga ao desmontar: o que ainda espera os 300 ms vai agora (sem o desfazer, o card já saiu da tela).
  const gravarRef = useRef(gravar)
  useEffect(() => {
    gravarRef.current = gravar
  })
  useEffect(
    () => () => {
      if (pendente.current !== null) {
        const lote = pendente.current
        pendente.current = null
        salvar.mutate(
          { id: lote.id, conteudo: lote.conteudo },
          { onError: () => void queryClient.invalidateQueries({ queryKey: CHAVE }) },
        )
      }
      if (temporizador.current !== null) clearTimeout(temporizador.current)
    },
    // Só ao desmontar: `salvar.mutate` e `queryClient` são estáveis.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const nota = consulta.data?.nota ?? null

  function aoMarcar(novo: ConteudoNota) {
    if (nota === null) return
    setAvisoErro(false)
    const anterior = pendente.current?.anterior ?? queryClient.getQueryData<NotaFixadaResponse>(CHAVE)
    pendente.current = { id: nota.id, conteudo: novo, anterior }
    // Uma releitura em voo não pode sobrescrever a marcação otimista: cancela antes de gravar no cache.
    void queryClient.cancelQueries({ queryKey: CHAVE }).then(() => {
      const atual = queryClient.getQueryData<NotaFixadaResponse>(CHAVE)?.nota ?? nota
      queryClient.setQueryData<NotaFixadaResponse>(CHAVE, { nota: { ...atual, conteudo: pendente.current?.conteudo ?? novo } })
    })
    if (temporizador.current !== null) clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => gravarRef.current(), ATRASO_GRAVACAO_MS)
  }

  const categoria = categorias.data?.find((c) => c.id === nota?.categoriaId) ?? null

  return (
    <section aria-labelledby="titulo-nota-fixada" className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 id="titulo-nota-fixada" className="m-0 text-[15px] font-bold">
          Nota fixada
        </h2>
        <Link to="/notas" className={classeLink}>
          Ver todas
        </Link>
      </div>

      {consulta.isPending && (
        <div aria-busy="true" className="flex flex-col gap-3">
          <span className="sr-only">Carregando a nota fixada…</span>
          <div className="h-5 w-2/5 animate-pulse rounded-md bg-[var(--cor-linha)] motion-reduce:animate-none" />
          {[0, 1].map((i) => (
            <div key={i} className="h-4 animate-pulse rounded-md bg-[var(--cor-linha)] motion-reduce:animate-none" />
          ))}
        </div>
      )}

      {consulta.isError && consulta.data === undefined && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
          <p className="m-0">
            {consulta.error instanceof ErroApi ? consulta.error.mensagem : 'Não deu para carregar a nota fixada.'}
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

      {consulta.data !== undefined && nota === null && (
        <p className="nota-entra m-0 text-sm text-[var(--cor-mutado)]">
          Fixe uma nota para vê-la aqui.{' '}
          <Link to="/notas" className={classeLink}>
            Ir para as notas
          </Link>
        </p>
      )}

      {nota !== null && (
        <div className="nota-entra">
          <h3 className="m-0 mb-2 flex items-center gap-2 text-sm font-semibold">
            <span
              data-testid="bolinha-categoria"
              aria-hidden="true"
              className="inline-block size-2.5 flex-none rounded-full"
              style={{ backgroundColor: corDaCategoria(categoria?.cor ?? null) }}
            />
            <span className="min-w-0 break-words">{nota.titulo}</span>
            {categoria !== null && <span className="sr-only">{`Categoria ${categoria.nome}`}</span>}
          </h3>
          <div
            role="region"
            aria-label="Conteúdo da nota fixada"
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={0}
            className="max-h-60 overflow-y-auto rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
          >
            <ConteudoSomenteLeitura conteudo={nota.conteudo} aoMarcarCaixinha={aoMarcar} />
          </div>
          {avisoErro && (
            <p role="alert" className="m-0 mt-2 text-xs text-[var(--cor-negativo-texto)]">
              Não foi possível salvar a marcação.
            </p>
          )}
          <Link to={`/notas/${nota.id}`} className={`${classeLink} mt-1`}>
            Abrir nota
          </Link>
        </div>
      )}
    </section>
  )
}
