import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { NotaResponse } from '../../api/tipos'
import { comSessao } from '../../teste/auth'
import { renderComApp } from '../../teste/render'
import { servidor } from '../../teste/servidor'
import { NotaFixada } from './NotaFixada'
import { categoriaVerde, notaComCaixinhas } from './notaFixadaTeste'

const item = (texto: string) => ({
  type: 'taskItem',
  attrs: { checked: false },
  content: [{ type: 'paragraph', content: [{ type: 'text', text: texto }] }],
})
const semMarcas = () =>
  notaComCaixinhas({
    conteudo: { type: 'doc', content: [{ type: 'taskList', content: [item('A'), item('B'), item('C')] }] },
  })
const marcas = (conteudo: unknown) =>
  ((conteudo as { content: { content: { attrs: { checked: boolean } }[] }[] }).content[0]!.content).map(
    (i) => i.attrs.checked,
  )
const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('NotaFixada, lotes concorrentes', () => {
  it('cliqueDuranteGravacaoNaoPerdeMarcacaoPendente', async () => {
    let servidorAtual: NotaResponse = semMarcas()
    const patches: { conteudo: NotaResponse['conteudo'] }[] = []
    servidor.use(
      http.get('/api/notas/fixada', () => HttpResponse.json({ nota: servidorAtual })),
      http.get('/api/categorias-nota', () => HttpResponse.json([categoriaVerde()])),
      http.patch('/api/notas/:id/conteudo', async ({ request }) => {
        const corpo = (await request.json()) as { conteudo: NotaResponse['conteudo'] }
        patches.push(corpo)
        await delay(120)
        servidorAtual = { ...servidorAtual, conteudo: corpo.conteudo }
        return HttpResponse.json(servidorAtual)
      }),
    )
    comSessao()
    renderComApp(<NotaFixada />)
    const u = userEvent.setup({ delay: null })
    const caixinhas = await screen.findAllByRole('checkbox')

    await u.click(caixinhas[0]!)
    await waitFor(() => expect(patches).toHaveLength(1))
    await u.click(caixinhas[1]!)
    await esperar(220) // o lote 1 termina e a releitura chega antes do lote 2 sair
    await u.click(caixinhas[2]!)
    await waitFor(() => expect(patches).toHaveLength(2))
    await esperar(300)

    expect(marcas(patches[1]!.conteudo)).toEqual([true, true, true])
    expect(servidorAtual.conteudo).toEqual(patches[1]!.conteudo)
    screen.getAllByRole('checkbox').forEach((c) => expect((c as HTMLInputElement).checked).toBe(true))
  })
})
