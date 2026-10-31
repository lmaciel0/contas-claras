import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

describe('NotaPage', () => {
  it('carregaTituloConteudoECategoria', async () => {
    montarNotaPage(notaCompleta(1, { titulo: 'Reunião', categoriaId: 5 }), [categoriaNota(5, { nome: 'Trabalho' })])

    expect(await screen.findByLabelText('Título da nota')).toHaveValue('Reunião')
    await waitFor(() => expect(editorProseMirror()).toHaveTextContent('Texto inicial'))
    await waitFor(() => expect(screen.getByLabelText('Categoria')).toHaveValue('5'))
    expect(screen.getByRole('link', { name: 'Voltar às notas' })).toHaveAttribute('href', '/notas')
  })

  it('editarOTextoGravaUmSegundoDepoisComPutCompleto', async () => {
    const { puts } = montarNotaPage(notaCompleta(1, { titulo: 'Reunião', categoriaId: null }))
    await carregada()

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await inserirTexto(' novo')
    await passarMs(999)
    expect(puts).toHaveLength(0)
    await passarMs(1)
    vi.useRealTimers()

    await waitFor(() => expect(puts).toHaveLength(1))
    expect(puts[0]?.titulo).toBe('Reunião')
    expect(puts[0]?.categoriaId).toBeNull()
    expect(JSON.stringify(puts[0]?.conteudo)).toContain('novo')
  })

  it('indicadorPassaPorSalvandoESalvo', async () => {
    let liberar: () => void = () => {}
    const portao = new Promise<void>((r) => (liberar = r))
    montarNotaPage(notaCompleta(1), [], async (req) => {
      await portao
      return HttpResponse.json({ ...notaCompleta(1), ...req })
    })
    await carregada()
    const indicador = screen.getByRole('status')
    expect(indicador).toHaveTextContent('Salvo')

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await inserirTexto(' x')
    await passarMs(1000)
    vi.useRealTimers()
    await waitFor(() => expect(indicador).toHaveTextContent('Salvando…'))

    liberar()
    await waitFor(() => expect(indicador).toHaveTextContent('Salvo'))
  })

  it('falhaDeRedeMantemOTextoEMostraAviso', async () => {
    montarNotaPage(notaCompleta(1), [], () => HttpResponse.json({ erro: 'Falha.' }, { status: 500 }))
    await carregada()

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await inserirTexto(' perdido?')
    await passarMs(1000)
    vi.useRealTimers()

    expect(await screen.findByText('Não foi possível salvar. Tentando de novo na próxima alteração.')).toBeInTheDocument()
    expect(editorProseMirror()).toHaveTextContent('perdido?')
  })

  it('tituloVazioNaoEnviaEMostraAviso', async () => {
    const { puts } = montarNotaPage(notaCompleta(1, { titulo: 'Reunião' }))
    await carregada()

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    fireEvent.change(screen.getByLabelText('Título da nota'), { target: { value: '   ' } })
    await passarMs(1500)
    vi.useRealTimers()

    expect(await screen.findByText('Informe um título.')).toBeInTheDocument()
    expect(screen.queryByText('Salvo')).not.toBeInTheDocument()
    expect(puts).toHaveLength(0)
  })
})
