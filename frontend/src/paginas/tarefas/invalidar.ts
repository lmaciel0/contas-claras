import type { QueryClient } from '@tanstack/react-query'

/** Depois de criar, editar, concluir, reabrir ou excluir uma tarefa: a lista agrupada (página e card do Início) fica velha. */
export function invalidarTarefas(queryClient: QueryClient): Promise<unknown> {
  return queryClient.invalidateQueries({ queryKey: ['tarefas'] })
}
