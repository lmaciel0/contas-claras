import type { QueryClient } from '@tanstack/react-query'
import { invalidarLancamentos } from '../lancamentos/invalidar'

/**
 * Depois de criar, renomear, reordenar, arquivar ou apagar categorias e itens: a própria lista e tudo o que
 * mostra nomes, ordem ou limite deles (lançamentos, faturas dos cartões e resumo) ficam velhos.
 */
export function invalidarCadastro(queryClient: QueryClient): Promise<unknown> {
  return Promise.all([queryClient.invalidateQueries({ queryKey: ['categorias'] }), invalidarLancamentos(queryClient)])
}
