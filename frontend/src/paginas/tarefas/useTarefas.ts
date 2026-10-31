import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '../../api/endpoints'
import type { TarefaRequest } from '../../api/tipos'
import { invalidarTarefas } from './invalidar'

export function useTarefas() {
  return useQuery({ queryKey: ['tarefas'], queryFn: endpoints.tarefas.listar })
}

export function useCriarTarefa() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (req: TarefaRequest) => endpoints.tarefas.criar(req),
    onSuccess: () => invalidarTarefas(queryClient),
  })
}

export function useEditarTarefa() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...req }: TarefaRequest & { id: number }) => endpoints.tarefas.editar(id, req),
    onSuccess: () => invalidarTarefas(queryClient),
  })
}

export function useConcluirTarefa() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, concluida }: { id: number; concluida: boolean }) => endpoints.tarefas.concluir(id, concluida),
    onSuccess: () => invalidarTarefas(queryClient),
  })
}

export function useExcluirTarefa() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => endpoints.tarefas.excluir(id),
    onSuccess: () => invalidarTarefas(queryClient),
  })
}
