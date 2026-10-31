import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ConteudoNota } from '../../api/tipos'
import { NotaEditor } from './NotaEditor'

const vazio: ConteudoNota = { type: 'doc', content: [{ type: 'paragraph' }] }
const comTexto = (texto: string): ConteudoNota => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: texto }] }],
})

const ROTULOS = ['Negrito', 'Itálico', 'Riscado', 'Título', 'Lista com marcadores', 'Lista numerada', 'Caixinhas de marcar']

function editorVisivel() {
  return document.querySelector('.ProseMirror') as HTMLElement
}

describe('NotaEditor: barra', () => {
  it('botoesDaBarraTemNomesAcessiveis', async () => {
    render(<NotaEditor conteudo={vazio} aoMudar={() => {}} />)
    for (const r of ROTULOS) expect(await screen.findByRole('button', { name: r })).toBeInTheDocument()
  })

  it('clicarEmNegritoMarcaOTextoSelecionado e aoMudarRecebeJsonComMarcaBold', async () => {
    const aoMudar = vi.fn()
    render(<NotaEditor conteudo={comTexto('ola')} aoMudar={aoMudar} />)
    const botao = await screen.findByRole('button', { name: 'Negrito' })
    await userEvent.click(editorVisivel())
    await act(async () => {
      const ed = (editorVisivel() as unknown as { editor: { commands: { selectAll: () => void } } }).editor
      ed.commands.selectAll()
    })
    await userEvent.click(botao)
    expect(editorVisivel().querySelector('strong')).toHaveTextContent('ola')
    const ultimo = aoMudar.mock.calls.at(-1)?.[0]
    expect(JSON.stringify(ultimo)).toContain('"type":"bold"')
  })

  it('ariaPressedRefleteEstadoAtivo', async () => {
    render(<NotaEditor conteudo={comTexto('ola')} aoMudar={() => {}} />)
    const botao = await screen.findByRole('button', { name: 'Negrito' })
    expect(botao).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(editorVisivel())
    await userEvent.click(botao)
    expect(botao).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(botao)
    expect(botao).toHaveAttribute('aria-pressed', 'false')
  })
})
