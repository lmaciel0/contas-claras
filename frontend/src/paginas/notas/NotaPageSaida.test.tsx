import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import { servidor } from '../../teste/servidor'
import { notaCompleta } from './dadosTeste'
import { editorProseMirror, inserirTexto, montarNotaPage } from './montarNotaPage'

afterEach(async () => {
  cleanup()
  await new Promise((r) => setTimeout(r, 30))
})

async function carregada() {
  await screen.findByLabelText('Título da nota')
  await waitFor(() => expect(editorProseMirror()).toBeTruthy())
}

describe('NotaPage: saída e exclusão', () => {
  it('sairComTituloVazioGravaSemTituloComConteudoNovo', async () => {
    const { puts, unmount } = montarNotaPage(notaCompleta(1))
    await carregada()

    fireEvent.change(screen.getByLabelText('Título da nota'), { target: { value: '' } })
    await inserirTexto('texto novo')
    expect(await screen.findByText('Informe um título.')).toBeInTheDocument()
    expect(puts).toHaveLength(0)
    unmount()

    await waitFor(() => expect(puts).toHaveLength(1))
    expect(puts[0]?.titulo).toBe('Sem título')
    expect(JSON.stringify(puts[0]?.conteudo)).toContain('texto novo')
  })

  it('excluirAntesDoAutosaveNaoEnviaPutDepoisDoDelete', async () => {
    const user = userEvent.setup()
    const ordem: string[] = []
    servidor.use(
      http.delete('/api/notas/1', () => {
        ordem.push('DELETE')
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { puts } = montarNotaPage(notaCompleta(1))
    await carregada()

    await inserirTexto('edição que não vale mais')
    await user.click(screen.getByRole('button', { name: 'Excluir' }))
    await user.click(screen.getByRole('button', { name: 'Sim, excluir' }))
    expect(await screen.findByText('Lista de notas')).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 1300))

    expect(ordem).toEqual(['DELETE'])
    expect(puts).toHaveLength(0)
  })
})
