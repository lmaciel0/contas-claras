import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ConteudoNota } from '../../api/tipos'
import { NotaEditor } from './NotaEditor'

const vazio: ConteudoNota = { type: 'doc', content: [{ type: 'paragraph' }] }
const paragrafo = (texto: string) => ({ type: 'paragraph', content: [{ type: 'text', text: texto }] })

describe('NotaEditor: conteudo', () => {
  it('botaoCaixinhasInsereListaDeTarefas e clicar numa caixinha dispara aoMudar com checked true', async () => {
    const aoMudar = vi.fn()
    render(<NotaEditor conteudo={vazio} aoMudar={aoMudar} />)
    await userEvent.click(document.querySelector('.ProseMirror') as HTMLElement)
    await userEvent.click(await screen.findByRole('button', { name: 'Caixinhas de marcar' }))
    expect(document.querySelector('ul[data-type="taskList"]')).toBeInTheDocument()
    await userEvent.click(document.querySelector('ul[data-type="taskList"] input[type="checkbox"]') as HTMLElement)
    expect(JSON.stringify(aoMudar.mock.calls.at(-1)?.[0])).toContain('"checked":true')
  })

  it('renderizaConteudoInicial', async () => {
    const conteudo: ConteudoNota = {
      type: 'doc',
      content: [
        paragrafo('um paragrafo'),
        { type: 'bulletList', content: [{ type: 'listItem', content: [paragrafo('item')] }] },
        { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: true }, content: [paragrafo('tarefa')] }] },
      ],
    }
    render(<NotaEditor conteudo={conteudo} aoMudar={() => {}} />)
    expect(await screen.findByText('um paragrafo')).toBeInTheDocument()
    expect(document.querySelector('ul li')).toHaveTextContent('item')
    const caixa = document.querySelector('ul[data-type="taskList"] input[type="checkbox"]') as HTMLInputElement
    expect(caixa.checked).toBe(true)
  })

  it('textoComTagScriptApareceComoTexto', async () => {
    const conteudo: ConteudoNota = { type: 'doc', content: [paragrafo('<script>alert(1)</script>')] }
    render(<NotaEditor conteudo={conteudo} aoMudar={() => {}} />)
    expect(await screen.findByText('<script>alert(1)</script>')).toBeInTheDocument()
    expect(document.querySelector('script')).toBeNull()
  })
})
