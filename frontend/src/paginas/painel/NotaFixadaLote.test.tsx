import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
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

/**
 * Janela do lote bem maior que o padrão (300 ms): o cenário exige que o 3º clique chegue antes de o lote 2 sair, e
 * sob carga (suíte inteira em paralelo) um clique do jsdom pode passar de 300 ms. A gravação do lote 1 fica presa
 * até o teste liberar, então nenhum passo depende de relógio, só dessa janela folgada.
 */
const ATRASO_LOTE_MS = 1500

describe('NotaFixada, lotes concorrentes', () => {
  it('cliqueDuranteGravacaoNaoPerdeMarcacaoPendente', async () => {
    let servidorAtual: NotaResponse = semMarcas()
    const patches: { conteudo: NotaResponse['conteudo'] }[] = []
    let liberarLote1: () => void = () => {}
    const lote1Liberado = new Promise<void>((resolve) => {
      liberarLote1 = resolve
    })
    servidor.use(
      http.get('/api/notas/fixada', () => HttpResponse.json({ nota: servidorAtual })),
      http.get('/api/categorias-nota', () => HttpResponse.json([categoriaVerde()])),
      http.patch('/api/notas/:id/conteudo', async ({ request }) => {
        const corpo = (await request.json()) as { conteudo: NotaResponse['conteudo'] }
        patches.push(corpo)
        if (patches.length === 1) await lote1Liberado
        servidorAtual = { ...servidorAtual, conteudo: corpo.conteudo }
        return HttpResponse.json(servidorAtual)
      }),
    )
    comSessao()
    renderComApp(<NotaFixada atrasoGravacaoMs={ATRASO_LOTE_MS} />)
    const u = userEvent.setup({ delay: null })
    const caixinhas = await screen.findAllByRole('checkbox')

    await u.click(caixinhas[0]!)
    await waitFor(() => expect(patches).toHaveLength(1), { timeout: 5000 })
    await u.click(caixinhas[1]!)
    liberarLote1() // o lote 1 termina antes do lote 2 sair
    await esperar(100)
    await u.click(caixinhas[2]!)
    await waitFor(() => expect(patches).toHaveLength(2), { timeout: 5000 })
    await waitFor(() => expect(servidorAtual.conteudo).toEqual(patches[1]!.conteudo), { timeout: 5000 })

    expect(marcas(patches[1]!.conteudo)).toEqual([true, true, true])
    expect(servidorAtual.conteudo).toEqual(patches[1]!.conteudo)
    screen.getAllByRole('checkbox').forEach((c) => expect((c as HTMLInputElement).checked).toBe(true))
  }, 20_000)
})
