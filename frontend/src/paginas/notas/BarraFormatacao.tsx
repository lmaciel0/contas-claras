import type { Editor } from '@tiptap/core'
import { useEditorState } from '@tiptap/react'

interface Acao {
  rotulo: string
  texto: string
  ativo: (e: Editor) => boolean
  executar: (e: Editor) => void
}

const ACOES: Acao[] = [
  { rotulo: 'Negrito', texto: 'N', ativo: (e) => e.isActive('bold'), executar: (e) => e.chain().focus().toggleBold().run() },
  { rotulo: 'Itálico', texto: 'I', ativo: (e) => e.isActive('italic'), executar: (e) => e.chain().focus().toggleItalic().run() },
  { rotulo: 'Riscado', texto: 'S', ativo: (e) => e.isActive('strike'), executar: (e) => e.chain().focus().toggleStrike().run() },
  { rotulo: 'Título', texto: 'T', ativo: (e) => e.isActive('heading'), executar: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { rotulo: 'Lista com marcadores', texto: '•', ativo: (e) => e.isActive('bulletList'), executar: (e) => e.chain().focus().toggleBulletList().run() },
  { rotulo: 'Lista numerada', texto: '1.', ativo: (e) => e.isActive('orderedList'), executar: (e) => e.chain().focus().toggleOrderedList().run() },
  { rotulo: 'Caixinhas de marcar', texto: '☐', ativo: (e) => e.isActive('taskList'), executar: (e) => e.chain().focus().toggleTaskList().run() },
]

const ESTILO_TEXTO: Record<string, string> = { Negrito: 'font-bold', Itálico: 'italic', Riscado: 'line-through' }

const BASE =
  'inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border px-3 text-base ' +
  'transition-colors duration-200 ease-out motion-reduce:transition-none ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]'
const INATIVO =
  'border-[var(--cor-linha)] bg-[var(--cor-card)] text-[var(--cor-texto)] hover:bg-[var(--cor-principal-clara)]'
const ATIVO = 'border-[var(--cor-principal)] bg-[var(--cor-principal)] text-[var(--cor-sobre-principal)]'

export function BarraFormatacao({ editor }: { editor: Editor }) {
  // Reavalia o estado ativo a cada transação (seleção ou conteúdo) para manter `aria-pressed` correto.
  const ativos = useEditorState({
    editor,
    selector: ({ editor: e }) => ACOES.map((a) => a.ativo(e)),
  })

  return (
    <div role="toolbar" aria-label="Formatação" className="flex flex-wrap gap-2">
      {ACOES.map((a, i) => (
        <button
          key={a.rotulo}
          type="button"
          aria-label={a.rotulo}
          aria-pressed={ativos[i] ?? false}
          onMouseDown={(ev) => ev.preventDefault()}
          onClick={() => a.executar(editor)}
          className={`${BASE} ${ativos[i] ? ATIVO : INATIVO} ${ESTILO_TEXTO[a.rotulo] ?? ''}`}
        >
          <span aria-hidden="true">{a.texto}</span>
        </button>
      ))}
    </div>
  )
}
