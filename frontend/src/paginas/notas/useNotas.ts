import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { endpoints, type FiltroNotas } from '../../api/endpoints'
import type { CategoriaNotaRequest, ConteudoNota, NotaRequest } from '../../api/tipos'
import { invalidarCategoriasNota, invalidarNotas } from './invalidar'

export function useNotas(filtro: FiltroNotas) {
  return useQuery({
    queryKey: ['notas', filtro],
    queryFn: () => endpoints.notas.listar(filtro),
    // Trocar o filtro mantém a lista anterior na tela até a nova chegar (sem piscar).
    placeholderData: keepPreviousData,
  })
}

export function useNota(id: number) {
  return useQuery({ queryKey: ['nota', id], queryFn: () => endpoints.notas.buscar(id) })
}

/** Refaz a leitura ao voltar o foco: a nota fixada pode ter sido alterada em outra aba ou dispositivo. */
export function useNotaFixada() {
  return useQuery({ queryKey: ['nota-fixada'], queryFn: endpoints.notas.fixada, refetchOnWindowFocus: true })
}

export function useCategoriasNota() {
  return useQuery({ queryKey: ['categorias-nota'], queryFn: endpoints.categoriasNota.listar })
}

export function useCriarNota() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (categoriaId: number | null) => endpoints.notas.criar(categoriaId),
    onSuccess: () => invalidarNotas(queryClient),
  })
}

/**
 * Autosave do editor. Grava a resposta em `['nota', id]` e NÃO invalida essa chave: recarregar a nota aberta
 * jogaria o servidor por cima do que a pessoa digitou durante o salvamento. Só a lista, a fixada e as categorias.
 */
export function useSalvarNota() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, opcoes, ...req }: NotaRequest & { id: number; opcoes?: RequestInit }) =>
      endpoints.notas.editar(id, req, opcoes),
    onSuccess: (nota, { id }) => {
      queryClient.setQueryData(['nota', id], nota)
      return invalidarNotas(queryClient)
    },
  })
}

export function useExcluirNota() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => endpoints.notas.excluir(id),
    onSuccess: (_vazio, id) => {
      queryClient.removeQueries({ queryKey: ['nota', id] })
      return invalidarNotas(queryClient)
    },
  })
}

export function useFixarNota() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, fixada }: { id: number; fixada: boolean }) => endpoints.notas.fixar(id, fixada),
    onSuccess: (nota, { id }) => {
      queryClient.setQueryData(['nota', id], nota)
      return invalidarNotas(queryClient)
    },
  })
}

/** Marcar item de checklist fora do editor (card do Início): a nota aberta, se houver em cache, fica velha. */
export function useSalvarConteudoNota() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, conteudo }: { id: number; conteudo: ConteudoNota }) =>
      endpoints.notas.salvarConteudo(id, conteudo),
    onSuccess: (_nota, { id }) =>
      Promise.all([invalidarNotas(queryClient), queryClient.invalidateQueries({ queryKey: ['nota', id] })]),
  })
}

export function useCriarCategoriaNota() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (req: CategoriaNotaRequest) => endpoints.categoriasNota.criar(req),
    onSuccess: () => invalidarCategoriasNota(queryClient),
  })
}

export function useEditarCategoriaNota() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...req }: CategoriaNotaRequest & { id: number }) => endpoints.categoriasNota.editar(id, req),
    onSuccess: () => invalidarCategoriasNota(queryClient),
  })
}

export function useExcluirCategoriaNota() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => endpoints.categoriasNota.excluir(id),
    onSuccess: () => invalidarCategoriasNota(queryClient),
  })
}
