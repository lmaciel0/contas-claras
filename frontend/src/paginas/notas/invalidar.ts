import type { QueryClient } from '@tanstack/react-query'

/** Depois de criar, editar, fixar ou excluir uma nota: a lista, a nota fixada e o total por categoria ficam velhos. */
export function invalidarNotas(queryClient: QueryClient): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['notas'] }),
    queryClient.invalidateQueries({ queryKey: ['nota-fixada'] }),
    queryClient.invalidateQueries({ queryKey: ['categorias-nota'] }),
  ])
}

/** Criar, renomear, recolorir ou excluir categoria: a lista de notas também muda (a categoria da nota some ou troca). */
export function invalidarCategoriasNota(queryClient: QueryClient): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['categorias-nota'] }),
    queryClient.invalidateQueries({ queryKey: ['notas'] }),
  ])
}
