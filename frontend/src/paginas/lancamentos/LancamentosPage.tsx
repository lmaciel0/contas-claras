import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import { endpoints } from '../../api/endpoints'
import type { LancamentoResponse, StatusLancamento } from '../../api/tipos'
import { mensagemDoErro } from '../../auth/mensagemDoErro'
import { Esqueleto } from '../../componentes/Esqueleto'
import { CabecalhoPagina } from '../../layout/CabecalhoPagina'
import { useMesSelecionado } from '../../layout/useMesSelecionado'
import { FaixaSaldo } from './FaixaSaldo'
import { GrupoCategoria } from './GrupoCategoria'
import { invalidarLancamentos } from './invalidar'
import { ReceitasCard } from './ReceitasCard'

interface Grupo {
  categoriaId: number
  nome: string
  lancamentos: LancamentoResponse[]
}

/** Agrupa por categoria na ordem da API (as receitas já saíram, cada uma vai para o `ReceitasCard`). */
function agrupar(lancamentos: LancamentoResponse[]): Grupo[] {
  const grupos = new Map<number, Grupo>()
  for (const l of lancamentos) {
    const grupo = grupos.get(l.categoriaId)
    if (grupo === undefined) {
      grupos.set(l.categoriaId, { categoriaId: l.categoriaId, nome: l.categoriaNome, lancamentos: [l] })
    } else {
      grupo.lancamentos.push(l)
    }
  }
  return [...grupos.values()]
}

/**
 * `/lancamentos`: faixa com o saldo do Itaú, card único das receitas do mês (total recebido em destaque) e, depois, os demais lançamentos
 * agrupados por categoria, com total por grupo.
 * O formulário (`/lancamentos/novo` e `/lancamentos/:id`) é uma rota filha, desenhada por cima pelo `<Outlet />`.
 */
export function LancamentosPage() {
  const { ano, mes, busca } = useMesSelecionado()
  const queryClient = useQueryClient()
  const consulta = useQuery({
    queryKey: ['lancamentos', ano, mes],
    queryFn: () => endpoints.lancamentos.listar(ano, mes),
    placeholderData: keepPreviousData,
  })
  const status = useMutation({
    mutationFn: ({ id, novo }: { id: number; novo: StatusLancamento }) => endpoints.lancamentos.mudarStatus(id, novo),
    onSuccess: () => invalidarLancamentos(queryClient),
  })

  const titulo = <CabecalhoPagina titulo="Orçamento" subtitulo="Tudo o que entra e sai no mês, por categoria." />

  let conteudo: ReactNode
  if (consulta.isPending) {
    conteudo = (
      <div
        className="grid gap-2.5 md:grid-cols-2 md:gap-3.5"
        role="status"
        aria-label="Carregando os lançamentos…"
        aria-busy="true"
      >
        <span className="sr-only">Carregando os lançamentos…</span>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} aria-hidden="true" className="card flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Esqueleto className="h-5 w-32" />
              <Esqueleto className="h-5 w-20" />
            </div>
            <Esqueleto linhas={3} />
          </div>
        ))}
      </div>
    )
  } else if (consulta.isError) {
    conteudo = (
      <div role="alert" className="card flex flex-wrap items-center gap-3 text-sm">
        <p className="m-0">{mensagemDoErro(consulta.error)}</p>
        <button
          type="button"
          onClick={() => void consulta.refetch()}
          className="rounded-full bg-[var(--cor-principal)] px-4 py-2 text-sm font-semibold text-[var(--cor-sobre-principal)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
        >
          Tentar de novo
        </button>
      </div>
    )
  } else if (consulta.data.length === 0) {
    conteudo = <p className="card m-0 text-sm text-[var(--cor-mutado)]">Nenhum lançamento neste mês.</p>
  } else {
    const receitas = consulta.data.filter((l) => l.tipo === 'RECEITA')
    const demais = consulta.data.filter((l) => l.tipo !== 'RECEITA')
    const idMudandoStatus = status.isPending ? (status.variables?.id ?? null) : null
    const aoMudarStatus = (id: number, novo: StatusLancamento) => status.mutate({ id, novo })
    conteudo = (
      <div className="item-entra grid gap-2.5 md:grid-cols-2 md:gap-3.5">
        <ReceitasCard
          lancamentos={receitas}
          busca={busca}
          idMudandoStatus={idMudandoStatus}
          aoMudarStatus={aoMudarStatus}
        />
        {agrupar(demais).map((grupo) => (
          <GrupoCategoria
            key={grupo.categoriaId}
            nome={grupo.nome}
            lancamentos={grupo.lancamentos}
            busca={busca}
            idMudandoStatus={idMudandoStatus}
            aoMudarStatus={aoMudarStatus}
          />
        ))}
      </div>
    )
  }

  return (
    <>
      {titulo}
      <FaixaSaldo ano={ano} mes={mes} />
      {status.isError && (
        <p role="alert" className="mb-3 rounded-xl border border-[var(--cor-negativo)] bg-[var(--cor-erro-fundo)] px-3 py-2 text-sm">
          {mensagemDoErro(status.error)}
        </p>
      )}
      {conteudo}
      <Outlet />
    </>
  )
}
