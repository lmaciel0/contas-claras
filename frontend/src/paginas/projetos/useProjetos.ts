import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { endpoints } from '../../api/endpoints'
import type {
  FiltroProjetos,
  Projeto,
  ProjetoCriacaoRequisicao,
  ProjetoEdicaoRequisicao,
  ProjetoMoverEstagioRequisicao,
  SubtarefaCriacaoRequisicao,
} from './tipos'

type ContextoMutacao = {
  previousProjetos?: [readonly unknown[], Projeto[] | undefined][]
}

function restaurarCacheProjetos(queryClient: QueryClient, context?: ContextoMutacao) {
  if (context?.previousProjetos) {
    for (const [key, data] of context.previousProjetos) {
      queryClient.setQueryData(key, data)
    }
  }
}

export function invalidarProjetos(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: ['projetos'] })
}

export function useProjetos(filtro?: FiltroProjetos) {
  return useQuery({
    queryKey: ['projetos', filtro],
    queryFn: () => endpoints.projetos.listar(filtro),
    placeholderData: keepPreviousData,
  })
}

export function useProjeto(id: number) {
  return useQuery({
    queryKey: ['projeto', id],
    queryFn: () => endpoints.projetos.obterPorId(id),
  })
}

export function useCriarProjeto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (req: ProjetoCriacaoRequisicao) => endpoints.projetos.criar(req),
    onSuccess: () => invalidarProjetos(queryClient),
  })
}

export function useAtualizarProjeto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...req }: ProjetoEdicaoRequisicao & { id: number }) =>
      endpoints.projetos.atualizar(id, req),
    onSuccess: () => invalidarProjetos(queryClient),
  })
}

export function useMoverEstagioProjeto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...req }: ProjetoMoverEstagioRequisicao & { id: number }) =>
      endpoints.projetos.moverEstagio(id, req),
    onMutate: async ({ id, estagio, novaOrdem }) => {
      await queryClient.cancelQueries({ queryKey: ['projetos'] })
      const previousProjetos = queryClient.getQueriesData<Projeto[]>({ queryKey: ['projetos'] })

      queryClient.setQueriesData<Projeto[]>({ queryKey: ['projetos'] }, (antigos) => {
        if (!antigos) return antigos
        return antigos.map((p) => {
          if (p.id !== id) return p
          return {
            ...p,
            estagio,
            ...(novaOrdem !== undefined ? { ordem: novaOrdem } : {}),
          }
        })
      })

      return { previousProjetos }
    },
    onError: (_err, _vars, context) => restaurarCacheProjetos(queryClient, context),
    onSettled: () => invalidarProjetos(queryClient),
  })
}

export function useExcluirProjeto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => endpoints.projetos.excluir(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['projetos'] })
      const previousProjetos = queryClient.getQueriesData<Projeto[]>({ queryKey: ['projetos'] })

      queryClient.setQueriesData<Projeto[]>({ queryKey: ['projetos'] }, (antigos) => {
        if (!antigos) return antigos
        return antigos.filter((p) => p.id !== id)
      })

      return { previousProjetos }
    },
    onError: (_err, _vars, context) => restaurarCacheProjetos(queryClient, context),
    onSettled: () => invalidarProjetos(queryClient),
  })
}

export function useAdicionarSubtarefa() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ projetoId, ...req }: SubtarefaCriacaoRequisicao & { projetoId: number }) =>
      endpoints.projetos.adicionarSubtarefa(projetoId, req),
    onSettled: () => invalidarProjetos(queryClient),
  })
}

export function useAlternarSubtarefa() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ projetoId, subtarefaId }: { projetoId: number; subtarefaId: number }) =>
      endpoints.projetos.alternarSubtarefa(projetoId, subtarefaId),
    onMutate: async ({ projetoId, subtarefaId }) => {
      await queryClient.cancelQueries({ queryKey: ['projetos'] })
      const previousProjetos = queryClient.getQueriesData<Projeto[]>({ queryKey: ['projetos'] })

      queryClient.setQueriesData<Projeto[]>({ queryKey: ['projetos'] }, (antigos) => {
        if (!antigos) return antigos
        return antigos.map((p) => {
          if (p.id !== projetoId) return p
          const subtarefas = p.subtarefas.map((s) =>
            s.id === subtarefaId ? { ...s, concluida: !s.concluida } : s,
          )
          const totalSubtarefas = subtarefas.length
          const subtarefasConcluidas = subtarefas.filter((s) => s.concluida).length
          const porcentagemProgresso =
            totalSubtarefas > 0 ? Math.round((subtarefasConcluidas * 100) / totalSubtarefas) : 0
          return {
            ...p,
            subtarefas,
            totalSubtarefas,
            subtarefasConcluidas,
            porcentagemProgresso,
          }
        })
      })

      return { previousProjetos }
    },
    onError: (_err, _vars, context) => restaurarCacheProjetos(queryClient, context),
    onSettled: () => invalidarProjetos(queryClient),
  })
}

export function useExcluirSubtarefa() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ projetoId, subtarefaId }: { projetoId: number; subtarefaId: number }) =>
      endpoints.projetos.excluirSubtarefa(projetoId, subtarefaId),
    onSettled: () => invalidarProjetos(queryClient),
  })
}
