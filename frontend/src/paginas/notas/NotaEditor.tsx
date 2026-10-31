import { EditorContent, useEditor } from '@tiptap/react'
import type { ConteudoNota } from '../../api/tipos'
import { BarraFormatacao } from './BarraFormatacao'
import { extensoesNota } from './extensoesNota'
import './nota-editor.css'

interface Props {
  conteudo: ConteudoNota
  aoMudar: (conteudo: ConteudoNota) => void
}

/** O conteúdo inicial entra uma vez: durante a edição, o editor é a fonte da verdade. */
export function NotaEditor({ conteudo, aoMudar }: Props) {
  const editor = useEditor({
    extensions: extensoesNota,
    content: conteudo,
    onUpdate: ({ editor: e }) => aoMudar(e.getJSON() as ConteudoNota),
    editorProps: { attributes: { 'aria-label': 'Conteúdo da nota', 'aria-multiline': 'true', role: 'textbox' } },
  })

  if (!editor) return null
  return (
    <div className="flex flex-col gap-3">
      <BarraFormatacao editor={editor} />
      <EditorContent editor={editor} className="nota-editor" />
    </div>
  )
}
