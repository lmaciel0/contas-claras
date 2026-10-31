import type { QueryClient } from '@tanstack/react-query'

/**
 * Depois de salvar, excluir ou mudar o status: a lista dos lançamentos, as faturas dos cartões, o resumo do Início
 * e o relatório anual (todos os anos em cache) ficam velhos.
 */
export function invalidarLancamentos(queryClient: QueryClient): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['lancamentos'] }),
    queryClient.invalidateQueries({ queryKey: ['cartoes'] }),
    queryClient.invalidateQueries({ queryKey: ['resumo'] }),
    queryClient.invalidateQueries({ queryKey: ['relatorio'] }),
  ])
}
