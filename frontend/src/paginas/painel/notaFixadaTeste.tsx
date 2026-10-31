import { http, HttpResponse } from 'msw'
import type { CategoriaNotaResponse, NotaResponse } from '../../api/tipos'
import { comSessao } from '../../teste/auth'
import { renderComApp } from '../../teste/render'
import { servidor } from '../../teste/servidor'
import { categoriaNota, notaCompleta } from '../notas/dadosTeste'
import { NotaFixada } from './NotaFixada'

const item = (texto: string, checked: boolean) => ({
  type: 'taskItem',
  attrs: { checked },
  content: [{ type: 'paragraph', content: [{ type: 'text', text: texto }] }],
})

/** Nota fixada de teste: um parágrafo e uma lista com três caixinhas (a segunda já marcada). */
export const notaComCaixinhas = (parcial: Partial<NotaResponse> = {}): NotaResponse =>
  notaCompleta(7, {
    titulo: 'Compras da semana',
    fixada: true,
    categoriaId: 3,
    conteudo: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Lembrar da lista' }] },
        { type: 'taskList', content: [item('Pão', false), item('Leite', true), item('Café', false)] },
      ],
    },
    ...parcial,
  })

export const categoriaVerde = (): CategoriaNotaResponse => categoriaNota(3, { nome: 'Casa', cor: 'verde' })

/** Registra a API (nota fixada, categorias e PATCH do conteúdo) e monta o card; devolve os corpos dos PATCH. */
export function montarNotaFixada(nota: NotaResponse | null = notaComCaixinhas(), patch?: () => Response) {
  const patches: { conteudo: NotaResponse['conteudo'] }[] = []
  servidor.use(
    http.get('/api/notas/fixada', () => HttpResponse.json({ nota })),
    http.get('/api/categorias-nota', () => HttpResponse.json([categoriaVerde()])),
    http.patch('/api/notas/:id/conteudo', async ({ request }) => {
      const corpo = (await request.json()) as { conteudo: NotaResponse['conteudo'] }
      patches.push(corpo)
      return patch ? patch() : HttpResponse.json({ ...nota, conteudo: corpo.conteudo })
    }),
  )
  comSessao()
  return { ...renderComApp(<NotaFixada />), patches }
}
