import type { CategoriaNotaResponse, NotaResponse, NotaResumoResponse } from '../../api/tipos'

/** Fábricas de respostas da API de notas, só para os testes. */
export const resumo = (id: number, parcial: Partial<NotaResumoResponse> = {}): NotaResumoResponse => ({
  id,
  titulo: `Nota ${id}`,
  previa: `Prévia ${id}`,
  categoriaId: null,
  fixada: false,
  atualizadoEm: '2026-10-30T14:00:00',
  ...parcial,
})

export const categoriaNota = (id: number, parcial: Partial<CategoriaNotaResponse> = {}): CategoriaNotaResponse => ({
  id,
  nome: `Categoria ${id}`,
  cor: 'azul',
  totalNotas: 0,
  ...parcial,
})

export const notaCompleta = (id: number, parcial: Partial<NotaResponse> = {}): NotaResponse => ({
  id,
  titulo: `Nota ${id}`,
  conteudo: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Texto inicial' }] }] },
  categoriaId: null,
  fixada: false,
  criadoEm: '2026-10-29T10:00:00',
  atualizadoEm: '2026-10-30T14:00:00',
  ...parcial,
})
