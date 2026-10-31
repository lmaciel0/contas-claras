import type { TarefaResponse, TarefasResponse } from '../api/tipos'

export const HOJE_PADRAO = '2026-10-31'

export const tarefaFicticia = (
  id: number,
  parcial: Partial<TarefaResponse> = {},
): TarefaResponse => ({
  id,
  titulo: `Tarefa ${id}`,
  data: HOJE_PADRAO,
  concluida: false,
  concluidaEm: null,
  ...parcial,
})

export const tarefasRespostaFicticia = (
  parcial: Partial<TarefasResponse> = {},
): TarefasResponse => ({
  hoje: HOJE_PADRAO,
  atrasadas: [],
  deHoje: [],
  proximas: [],
  concluidasHoje: [],
  concluidas: [],
  totalConcluidas: 0,
  ...parcial,
})
