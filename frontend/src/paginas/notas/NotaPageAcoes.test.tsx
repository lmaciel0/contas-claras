import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { servidor } from '../../teste/servidor'
import { categoriaNota, notaCompleta } from './dadosTeste'
import { editorProseMirror, inserirTexto, montarNotaPage, passarMs } from './montarNotaPage'

// Desmonta antes de o próximo teste registrar seus handlers: o autosave grava o pendente ao sair da rota.
afterEach(async () => {
  vi.useRealTimers()
  cleanup()
  await new Promise((r) => setTimeout(r, 30))
})

async function carregada() {
  await screen.findByLabelText('Título da nota')
  await waitFor(() => expect(editorProseMirror()).toBeTruthy())
}

describe('NotaPage: ações', () => {
  it('trocarCategoriaGravaComNovoCategoriaId', async () => {
    const { puts } = montarNotaPage(notaCompleta(1), [categoriaNota(5, { nome: 'Trabalho' })])
    await carregada()
    await screen.findByRole('option', { name: 'Trabalho' })

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: '5' } })
    await passarMs(1000)
    vi.useRealTimers()

    await waitFor(() => expect(puts).toHaveLength(1))
    expect(puts[0]?.categoriaId).toBe(5)
    expect(screen.getByRole('option', { name: 'Sem categoria' })).toBeInTheDocument()
  })

  it('excluirPedeConfirmacaoEEnviaDelete', async () => {
    const user = userEvent.setup()
    let apagou = false
    servidor.use(
      http.delete('/api/notas/1', () => {
        apagou = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    montarNotaPage(notaCompleta(1))
    await carregada()

    await user.click(screen.getByRole('button', { name: 'Excluir' }))
    expect(apagou).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Sim, excluir' }))

    expect(await screen.findByText('Lista de notas')).toBeInTheDocument()
    expect(apagou).toBe(true)
  })

  it('fixarEnviaPatch', async () => {
    const user = userEvent.setup()
    let corpo: unknown
    servidor.use(
      http.patch('/api/notas/1/fixada', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json(notaCompleta(1, { fixada: true }))
      }),
    )
    montarNotaPage(notaCompleta(1))
    await carregada()

    await user.click(screen.getByRole('button', { name: 'Fixar na tela inicial' }))

    await waitFor(() => expect(corpo).toEqual({ fixada: true }))
    expect(await screen.findByRole('button', { name: 'Tirar da tela inicial' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('sairDaRotaComPendenteGravaAntes', async () => {
    const user = userEvent.setup()
    const { puts } = montarNotaPage(notaCompleta(1))
    await carregada()

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await inserirTexto(' ultima')
    await passarMs(200)
    vi.useRealTimers()
    expect(puts).toHaveLength(0)

    await user.click(screen.getByRole('link', { name: 'Voltar às notas' }))

    await waitFor(() => expect(puts).toHaveLength(1))
    expect(JSON.stringify(puts[0]?.conteudo)).toContain('ultima')
  })

  it('notaAlheiaMostraNaoEncontrada', async () => {
    montarNotaPage(notaCompleta(9))
    // O handler mais recente vence: sobrepõe o 200 de `montarNotaPage`.
    servidor.use(http.get('/api/notas/9', () => HttpResponse.json({ erro: 'Nota não encontrada.' }, { status: 404 })))

    expect(await screen.findByText('Nota não encontrada.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar às notas' })).toHaveAttribute('href', '/notas')
    expect(screen.queryByLabelText('Título da nota')).not.toBeInTheDocument()
  })
})
