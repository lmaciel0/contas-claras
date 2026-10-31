import { act } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router'
import { vi } from 'vitest'
import type { CategoriaNotaResponse, NotaRequest, NotaResponse } from '../../api/tipos'
import { renderComApp } from '../../teste/render'
import { servidor } from '../../teste/servidor'
import { notaCompleta } from './dadosTeste'
import { NotaPage } from './NotaPage'

/** Monta `/notas/:id` com a API de notas respondendo e guarda os corpos dos PUT. */
export function montarNotaPage(
  nota: NotaResponse = notaCompleta(1),
  categorias: CategoriaNotaResponse[] = [],
  aoEditar: (req: NotaRequest) => Response | Promise<Response> = (req) => HttpResponse.json({ ...nota, ...req }),
) {
  const puts: NotaRequest[] = []
  servidor.use(
    http.get(`/api/notas/${nota.id}`, () => HttpResponse.json(nota)),
    http.get('/api/categorias-nota', () => HttpResponse.json(categorias)),
    http.get('/api/notas', () => HttpResponse.json([])),
    http.put(`/api/notas/${nota.id}`, async ({ request }) => {
      const req = (await request.json()) as NotaRequest
      puts.push(req)
      return aoEditar(req)
    }),
  )
  const resultado = renderComApp(
    <Routes>
      <Route path="/notas" element={<p>Lista de notas</p>} />
      <Route path="/notas/:id" element={<NotaPage />} />
    </Routes>,
    `/notas/${nota.id}`,
  )
  return { ...resultado, puts }
}

export function editorProseMirror(): HTMLElement {
  return document.querySelector('.ProseMirror') as HTMLElement
}

/** Insere texto pelo comando do Tiptap (digitar no jsdom não passa pelo ProseMirror). */
export async function inserirTexto(texto: string) {
  const ed = (editorProseMirror() as unknown as { editor: { commands: { insertContent: (t: string) => void } } }).editor
  await act(async () => ed.commands.insertContent(texto))
}

/** Relógios falsos só para setTimeout: o autosave espera 1 s sem atrasar o msw nem o waitFor. */
export async function passarMs(ms: number) {
  await act(() => vi.advanceTimersByTimeAsync(ms))
}
