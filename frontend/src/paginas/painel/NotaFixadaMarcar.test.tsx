import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { montarNotaFixada, notaComCaixinhas } from './notaFixadaTeste'

type Lista = { content: { attrs: { checked: boolean } }[] }
const marcas = (conteudo: unknown) =>
  ((conteudo as { content: Lista[] }).content[1] as Lista).content.map((i) => i.attrs.checked)

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('NotaFixada, caixinhas', () => {
  it('marcarCaixinhaEnviaPatchConteudoComConteudoCompleto', async () => {
    const { patches } = montarNotaFixada()

    await userEvent.click((await screen.findAllByRole('checkbox'))[0]!)

    // Atualização otimista: a caixinha já aparece marcada antes da resposta.
    expect((screen.getAllByRole('checkbox')[0] as HTMLInputElement).checked).toBe(true)
    await waitFor(() => expect(patches).toHaveLength(1))
    expect(patches[0]!.conteudo).toEqual({
      ...notaComCaixinhas().conteudo,
      content: [
        (notaComCaixinhas().conteudo.content as unknown[])[0],
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: true }, content: expect.any(Array) },
            { type: 'taskItem', attrs: { checked: true }, content: expect.any(Array) },
            { type: 'taskItem', attrs: { checked: false }, content: expect.any(Array) },
          ],
        },
      ],
    })
  })

  it('doisCliquesSeguidosGeramUmaGravacaoComEstadoFinal', async () => {
    const { patches } = montarNotaFixada()
    const caixinhas = await screen.findAllByRole('checkbox')

    await userEvent.click(caixinhas[0]!)
    await userEvent.click(caixinhas[2]!)
    await waitFor(() => expect(patches).toHaveLength(1))
    await esperar(450)

    expect(patches).toHaveLength(1)
    expect(marcas(patches[0]!.conteudo)).toEqual([true, true, true])
  })

  it('erroAoSalvarDesfazAMarcacaoEMostraAviso', async () => {
    const { patches } = montarNotaFixada(notaComCaixinhas(), () =>
      HttpResponse.json({ mensagem: 'Falha' }, { status: 500 }),
    )

    await userEvent.click((await screen.findAllByRole('checkbox'))[0]!)

    expect(await screen.findByText('Não foi possível salvar a marcação.')).toBeInTheDocument()
    expect(patches).toHaveLength(1)
    await waitFor(() => expect((screen.getAllByRole('checkbox')[0] as HTMLInputElement).checked).toBe(false))
  })

  it('desmontarComMarcacaoPendenteGravaNaHora', async () => {
    const { patches, unmount } = montarNotaFixada()

    await userEvent.click((await screen.findAllByRole('checkbox'))[2]!)
    expect(patches).toHaveLength(0)
    unmount()

    await waitFor(() => expect(patches).toHaveLength(1))
    expect(marcas(patches[0]!.conteudo)).toEqual([false, true, true])
  })
})
