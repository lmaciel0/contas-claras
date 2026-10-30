import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import { endpoints } from '../../api/endpoints'
import type { LancamentoResponse, StatusLancamento } from '../../api/tipos'
import { mensagemDoErro } from '../../auth/mensagemDoErro'
import { useMesSelecionado } from '../../layout/useMesSelecionado'
import { GrupoCategoria } from './GrupoCategoria'
import { invalidarLancamentos } from './invalidar'

interface Grupo {
  categoriaId: number
  nome: string
  lancamentos: LancamentoResponse[]
}

/** Agrupa por categoria na ordem da API, com as de receita antes das de despesa. */
function agrupar(lancamentos: LancamentoResponse[]): Grupo[] {
  const grupos = new Map<number, Grupo & { tipo: LancamentoResponse['tipo'] }>()
  for (const l of lancamentos) {
    const grupo = grupos.get(l.categoriaId)
    if (grupo === undefined) {
      grupos.set(l.categoriaId, { categoriaId: l.categoriaId, nome: l.categoriaNome, tipo: l.tipo, lancamentos: [l] })
    } else {
      grupo.lancamentos.push(l)
    }
  }
  const todos = [...grupos.values()]
  return [...todos.filter((g) => g.tipo === 'RECEITA'), ...todos.filter((g) => g.tipo === 'DESPESA')]
}

/**
 * `/lancamentos`: lançamentos do mês agrupados por categoria (receitas primeiro), com total por grupo.
 * O formulário (`/lancamentos/novo` e `/lancamentos/:id`) é uma rota filha, desenhada por cima pelo `<Outlet />`.
 */
export function LancamentosPage() {
  const { ano, mes, busca } = useMesSelecionado()
  const queryClient = useQueryClient()
  const consulta = useQuery({
    queryKey: ['lancamentos', ano, mes],
    queryFn: () => endpoints.lancamentos.listar(ano, mes),
  })
  const status = useMutation({
    mutationFn: ({ id, novo }: { id: number; novo: StatusLancamento }) => endpoints.lancamentos.mudarStatus(id, novo),
    onSuccess: () => invalidarLancamentos(queryClient),
  })

  const titulo = (
    <div className="mb-3 sr-only md:not-sr-only md:mb-5">
      <h1 className="m-0 text-[28px] font-bold tracking-tight">Lançamentos</h1>
      <p className="m-0 mt-1 text-[13px] text-[var(--cor-mutado)]">Tudo o que entra e sai no mês, por categoria.</p>
    </div>
  )

  let conteudo: ReactNode
  if (consulta.isPending) {
    conteudo = (
      <p role="status" className="m-0 text-sm text-[var(--cor-mutado)]">
        Carregando os lançamentos…
      </p>
    )
  } else if (consulta.isError) {
    conteudo = (
      <div role="alert" className="card flex flex-wrap items-center gap-3 text-sm">
        <p className="m-0">{mensagemDoErro(consulta.error)}</p>
        <button
          type="button"
          onClick={() => void consulta.refetch()}
          className="rounded-full bg-[var(--cor-principal)] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
        >
          Tentar de novo
        </button>
      </div>
    )
  } else if (consulta.data.length === 0) {
    conteudo = <p className="card m-0 text-sm text-[var(--cor-mutado)]">Nenhum lançamento neste mês.</p>
  } else {
    conteudo = (
      <div className="grid gap-2.5 md:grid-cols-2 md:gap-3.5">
        {agrupar(consulta.data).map((grupo) => (
          <GrupoCategoria
            key={grupo.categoriaId}
            nome={grupo.nome}
            lancamentos={grupo.lancamentos}
            busca={busca}
            idMudandoStatus={status.isPending ? (status.variables?.id ?? null) : null}
            aoMudarStatus={(id, novo) => status.mutate({ id, novo })}
          />
        ))}
      </div>
    )
  }

  return (
    <>
      {titulo}
      {status.isError && (
        <p role="alert" className="mb-3 rounded-xl border border-[var(--cor-negativo)] bg-[#fdecec] px-3 py-2 text-sm">
          {mensagemDoErro(status.error)}
        </p>
      )}
      {conteudo}
      <Outlet />
    </>
  )
}
