import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ConteudoNota } from '../../api/tipos'
import { ConteudoSomenteLeitura } from './ConteudoSomenteLeitura'

const paragrafo = (texto: string) => ({ type: 'paragraph', content: [{ type: 'text', text: texto }] })
const item = (texto: string, checked: boolean) => ({
  type: 'taskItem',
  attrs: { checked },
  content: [paragrafo(texto)],
})

const conteudo: ConteudoNota = {
  type: 'doc',
  content: [
    paragrafo('Um parágrafo'),
    {
      type: 'bulletList',
      content: [{ type: 'listItem', content: [paragrafo('Item de lista')] }],
    },
    {
      type: 'orderedList',
      attrs: { start: 1 },
      content: [{ type: 'listItem', content: [paragrafo('Passo um')] }],
    },
    { type: 'taskList', content: [item('Pão', false), item('Leite', true), item('Café', false)] },
  ],
}

describe('ConteudoSomenteLeitura', () => {
  it('renderizaParagrafosListasECaixinhas', async () => {
    render(<ConteudoSomenteLeitura conteudo={conteudo} aoMarcarCaixinha={() => {}} />)

    expect(await screen.findByText('Um parágrafo')).toBeInTheDocument()
    expect(screen.getByText('Item de lista').closest('ul')).toBeInTheDocument()
    expect(screen.getByText('Passo um').closest('ol')).toBeInTheDocument()
    const caixinhas = screen.getAllByRole('checkbox')
    expect(caixinhas.map((c) => (c as HTMLInputElement).checked)).toEqual([false, true, false])
  })

  it('clicarNaCaixinhaDevolveConteudoComCheckedAlterado', async () => {
    const aoMarcar = vi.fn()
    render(<ConteudoSomenteLeitura conteudo={conteudo} aoMarcarCaixinha={aoMarcar} />)

    await userEvent.click((await screen.findAllByRole('checkbox'))[2]!)

    expect(aoMarcar).toHaveBeenCalledTimes(1)
    const esperado = structuredClone(conteudo) as unknown as { content: { content: { attrs: { checked: boolean } }[] }[] }
    esperado.content[3]!.content[2]!.attrs.checked = true
    expect(aoMarcar.mock.calls[0]![0]).toEqual(esperado)
    // O original não foi mutado e as outras caixinhas não mudaram.
    expect((conteudo as unknown as typeof esperado).content[3]!.content[2]!.attrs.checked).toBe(false)
    expect((screen.getAllByRole('checkbox')[2] as HTMLInputElement).checked).toBe(true)
  })

  it('textoNaoEEditavel', async () => {
    const aoMarcar = vi.fn()
    render(<ConteudoSomenteLeitura conteudo={conteudo} aoMarcarCaixinha={aoMarcar} />)

    const texto = await screen.findByText('Um parágrafo')
    await userEvent.click(texto)
    await userEvent.keyboard('abc')

    expect(screen.getByText('Um parágrafo')).toBeInTheDocument()
    expect(document.querySelector('.ProseMirror')).toHaveAttribute('contenteditable', 'false')
    expect(aoMarcar).not.toHaveBeenCalled()
  })

  it('scriptEmTextoNaoViraElemento', async () => {
    const hostil: ConteudoNota = {
      type: 'doc',
      content: [paragrafo('<script>window.invadido = true</script><img src=x onerror="window.invadido = true">')],
    }
    const { container } = render(<ConteudoSomenteLeitura conteudo={hostil} aoMarcarCaixinha={() => {}} />)

    expect(await screen.findByText(/<script>window\.invadido/)).toBeInTheDocument()
    expect(container.querySelector('script, img')).toBeNull()
    expect((window as unknown as { invadido?: boolean }).invadido).toBeUndefined()
  })
})
