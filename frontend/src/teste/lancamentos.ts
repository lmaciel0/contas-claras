import { http, HttpResponse } from 'msw'
import type { CategoriaResponse, ItemResponse, LancamentoResponse } from '../api/tipos'
import { servidor } from './servidor'

// Dados fictícios para os testes das telas de lançamentos.

export const item = (parcial: Partial<ItemResponse> & Pick<ItemResponse, 'id' | 'nome'>): ItemResponse => ({
  diaVencimento: null,
  cartao: false,
  limite: null,
  arquivado: false,
  ...parcial,
})

/** Receitas (Salário), Moradia (Luz dia 10, Condomínio dia 31, Gás arquivado) e Lazer (Cinema sem dia). */
export function categoriasFicticias(): CategoriaResponse[] {
  return [
    { id: 1, nome: 'Receitas', tipo: 'RECEITA', ordem: 1, itens: [item({ id: 10, nome: 'Salário', diaVencimento: 5 })] },
    {
      id: 2,
      nome: 'Moradia',
      tipo: 'DESPESA',
      ordem: 2,
      itens: [
        item({ id: 20, nome: 'Luz', diaVencimento: 10 }),
        item({ id: 21, nome: 'Condomínio', diaVencimento: 31 }),
        item({ id: 22, nome: 'Gás', arquivado: true }),
      ],
    },
    { id: 3, nome: 'Lazer', tipo: 'DESPESA', ordem: 3, itens: [item({ id: 30, nome: 'Cinema' })] },
  ]
}

export const lancamento = (
  parcial: Partial<LancamentoResponse> & Pick<LancamentoResponse, 'id' | 'itemId' | 'itemNome'>,
): LancamentoResponse => ({
  categoriaId: 2,
  categoriaNome: 'Moradia',
  tipo: 'DESPESA',
  ano: 2026,
  mes: 10,
  valor: '100.00',
  status: 'PREVISTO',
  vencimento: null,
  ...parcial,
})

/** `GET /api/categorias` devolve a lista informada. */
export function responderCategorias(categorias: CategoriaResponse[] = categoriasFicticias()) {
  servidor.use(http.get('/api/categorias', () => HttpResponse.json(categorias)))
}

/** `GET /api/lancamentos` devolve o que `obter()` retornar (chamado a cada requisição). Guarda as consultas feitas. */
export function responderLancamentos(obter: () => LancamentoResponse[]) {
  const consultas: string[] = []
  servidor.use(
    http.get('/api/lancamentos', ({ request }) => {
      consultas.push(new URL(request.url).search)
      return HttpResponse.json(obter())
    }),
  )
  return consultas
}
