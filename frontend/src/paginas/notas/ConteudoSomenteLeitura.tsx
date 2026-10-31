import type { Editor } from '@tiptap/react'
import { EditorContent, useEditor } from '@tiptap/react'
import { type MouseEvent, useEffect, useState } from 'react'
import type { ConteudoNota } from '../../api/tipos'
import { extensoesNota } from './extensoesNota'
import './nota-leitura.css'

interface Props {
  conteudo: ConteudoNota
  /** Recebe o conteúdo inteiro, igual ao anterior exceto pelo `checked` do item clicado. */
  aoMarcarCaixinha: (novo: ConteudoNota) => void
}

type No = { type?: string; attrs?: Record<string, unknown>; content?: No[]; [chave: string]: unknown }

/** Cópia do JSON com o `checked` do n-ésimo item de checklist (ordem do documento) trocado; o resto fica idêntico. */
function comItemMarcado(conteudo: ConteudoNota, indice: number, checked: boolean): ConteudoNota {
  let visto = -1
  const copiar = (no: No): No => {
    const copia: No = { ...no }
    if (no.type === 'taskItem') {
      visto += 1
      if (visto === indice) copia.attrs = { ...no.attrs, checked }
    }
    if (no.content) copia.content = no.content.map(copiar)
    return copia
  }
  return copiar(conteudo as No) as ConteudoNota
}

/** Posição do item de checklist cujo `<li>` é este elemento, e a ordem dele entre todos os itens do documento. */
function localizarItem(editor: Editor, li: Element): { pos: number; indice: number } | null {
  let indice = -1
  let achado: { pos: number; indice: number } | null = null
  editor.state.doc.descendants((no, pos) => {
    if (no.type.name !== 'taskItem') return true
    indice += 1
    if (achado === null && editor.view.nodeDOM(pos) === li) achado = { pos, indice }
    return true
  })
  return achado
}

/** Estado mutável fora do ciclo de renderização: o Tiptap chama `marcar` direto do DOM, sem passar pelo React. */
class Leitura {
  private editor: Editor | null = null
  /** Caixinha clicada, guardada na captura do clique antes de o Tiptap tratar a mudança. */
  private alvo: Element | null = null
  /** O conteúdo mais novo que se conhece: a prop ou o último emitido (dois cliques seguidos partem dele). */
  private base: ConteudoNota
  private emitido: ConteudoNota | null = null
  private aplicado: ConteudoNota

  private aoMarcar: (novo: ConteudoNota) => void

  constructor(conteudo: ConteudoNota, aoMarcar: (novo: ConteudoNota) => void) {
    this.base = conteudo
    this.aplicado = conteudo
    this.aoMarcar = aoMarcar
  }

  usar(editor: Editor | null, aoMarcar: (novo: ConteudoNota) => void) {
    this.editor = editor
    this.aoMarcar = aoMarcar
  }

  guardarAlvo(alvo: Element) {
    this.alvo = alvo
  }

  /** Conteúdo vindo de fora; devolve se o editor precisa trocá-lo (o que o próprio componente emitiu já está na tela). */
  receber(conteudo: ConteudoNota): boolean {
    this.base = conteudo
    if (conteudo === this.aplicado) return false
    this.aplicado = conteudo
    return conteudo !== this.emitido
  }

  /** Atualiza o DOM do editor (transição) e entrega o JSON novo, feito a partir do original. */
  marcar(checked: boolean): boolean {
    const li = this.alvo?.closest('li')
    if (!this.editor || !li) return false
    const item = localizarItem(this.editor, li)
    if (item === null) return false
    const atual = this.editor.state.doc.nodeAt(item.pos)
    this.editor.view.dispatch(this.editor.state.tr.setNodeMarkup(item.pos, undefined, { ...atual?.attrs, checked }))
    this.base = comItemMarcado(this.base, item.indice, checked)
    this.emitido = this.base
    this.aoMarcar(this.base)
    return true
  }
}

/**
 * Mostra o conteúdo da nota sem permitir edição (Tiptap com `editable: false`), com as caixinhas clicáveis. Nada de
 * HTML bruto: o Tiptap monta o DOM só com os nós da lista permitida e o texto entra como texto.
 */
export function ConteudoSomenteLeitura({ conteudo, aoMarcarCaixinha }: Props) {
  const [leitura] = useState(() => new Leitura(conteudo, aoMarcarCaixinha))
  const [extensoes] = useState(() =>
    extensoesNota.map((extensao) =>
      extensao.name === 'taskItem'
        ? extensao.configure({ onReadOnlyChecked: (_no: unknown, checked: boolean) => leitura.marcar(checked) })
        : extensao,
    ),
  )

  const editor = useEditor({
    editable: false,
    content: conteudo,
    extensions: extensoes,
    editorProps: { attributes: { 'aria-label': 'Conteúdo da nota', role: 'document' } },
  })

  useEffect(() => {
    leitura.usar(editor, aoMarcarCaixinha)
  })

  useEffect(() => {
    if (leitura.receber(conteudo)) editor?.commands.setContent(conteudo, { emitUpdate: false })
  }, [conteudo, editor, leitura])

  return (
    <div className="nota-leitura" onClickCapture={(evento: MouseEvent) => leitura.guardarAlvo(evento.target as Element)}>
      <EditorContent editor={editor} />
    </div>
  )
}
