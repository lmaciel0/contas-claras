import type { QueryClient } from '@tanstack/react-query'

/** Depois de salvar, excluir ou mudar o status: a lista dos lançamentos, as faturas dos cartões e o resumo do Início ficam velhos. */
export function invalidarLancamentos(queryClient: QueryClient): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['lancamentos'] }),
    queryClient.invalidateQueries({ queryKey: ['cartoes'] }),
    queryClient.invalidateQueries({ queryKey: ['resumo'] }),
  ])
}
