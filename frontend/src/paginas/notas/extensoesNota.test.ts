import { Editor } from '@tiptap/core'
import { afterEach, describe, expect, it } from 'vitest'
import { extensoesNota } from './extensoesNota'

// Cópia da lista permitida do backend (Global Constraints do plano).
const NODOS_PERMITIDOS = ['doc', 'paragraph', 'text', 'heading', 'bulletList', 'orderedList', 'listItem', 'taskList', 'taskItem', 'hardBreak']
const MARCAS_PERMITIDAS = ['bold', 'italic', 'strike']
const ATRIBUTOS_PERMITIDOS: Record<string, string[]> = {
  heading: ['level'],
  orderedList: ['start', 'type'],
  taskItem: ['checked'],
}

type No = { type: string; attrs?: Record<string, unknown>; marks?: { type: string }[]; content?: No[] }

function validar(no: No) {
  expect(NODOS_PERMITIDOS).toContain(no.type)
  const attrs = Object.keys(no.attrs ?? {})
  for (const a of attrs) expect(ATRIBUTOS_PERMITIDOS[no.type] ?? []).toContain(a)
  if (no.type === 'heading') expect([1, 2, 3]).toContain(no.attrs?.level)
  if (no.type === 'orderedList') {
    expect(no.attrs?.start as number).toBeGreaterThanOrEqual(1)
    expect(no.attrs?.type ?? null).toBeNull()
  }
  if (no.type === 'taskItem') expect(typeof no.attrs?.checked).toBe('boolean')
  for (const m of no.marks ?? []) expect(MARCAS_PERMITIDAS).toContain(m.type)
  no.content?.forEach(validar)
}

let editor: Editor
function criar(content = '<p>texto</p>') {
  editor = new Editor({ extensions: extensoesNota, content })
  return editor
}
afterEach(() => editor?.destroy())

function digitar(e: Editor, texto: string) {
  const { from, to } = e.state.selection
  const tratou = e.view.someProp('handleTextInput', (f) => f(e.view, from, to, texto, () => e.state.tr.insertText(texto, from, to)))
  if (!tratou) e.view.dispatch(e.state.tr.insertText(texto, from, to))
}

describe('extensoesNota', () => {
  it('jsonDoEditorSoTemTiposPermitidos', () => {
    const e = criar()
    const acoes = [
      () => e.chain().selectAll().toggleBold().run(),
      () => e.chain().selectAll().toggleItalic().run(),
      () => e.chain().selectAll().toggleStrike().run(),
      () => e.chain().selectAll().toggleHeading({ level: 1 }).run(),
      () => e.chain().selectAll().toggleHeading({ level: 2 }).run(),
      () => e.chain().selectAll().toggleHeading({ level: 3 }).run(),
      () => e.chain().selectAll().toggleHeading({ level: 3 }).toggleBulletList().run(),
      () => e.chain().selectAll().toggleOrderedList().run(),
      () => e.chain().selectAll().toggleTaskList().run(),
      () => {
        e.commands.focus('end')
        e.view.dom.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }))
      },
    ]
    for (const acao of acoes) {
      acao()
      validar(e.getJSON() as No)
    }
    expect(JSON.stringify(e.getJSON())).toContain('hardBreak')
  })

  it('atalhosDeRecursosDesligadosNaoGeramNosForaDaLista', () => {
    const e = criar('<p></p>')
    e.commands.focus()
    digitar(e, '> ')
    digitar(e, 'citação')
    validar(e.getJSON() as No)
    e.commands.setContent('<p></p>')
    e.commands.focus()
    digitar(e, '`código`')
    digitar(e, ' ')
    validar(e.getJSON() as No)
    e.commands.setContent('<p></p>')
    e.commands.focus()
    digitar(e, '```')
    digitar(e, ' ')
    validar(e.getJSON() as No)
    expect(e.getJSON().content?.[0]?.type).toBe('paragraph')
  })
})
