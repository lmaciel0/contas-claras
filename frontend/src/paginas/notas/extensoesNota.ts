import { TaskItem } from '@tiptap/extension-task-item'
import { TaskList } from '@tiptap/extension-task-list'
import StarterKit from '@tiptap/starter-kit'

/**
 * Só o que a barra oferece e o backend aceita (nós doc, paragraph, text, heading 1 a 3, bulletList, orderedList,
 * listItem, taskList, taskItem, hardBreak; marcas bold, italic, strike). No Tiptap 3 o StarterKit inclui `link` e
 * `underline`, que o backend recusa; os atalhos dos recursos desligados (`**x**`, `> `) também deixam de existir.
 */
export const extensoesNota = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: false,
    underline: false,
    blockquote: false,
    codeBlock: false,
    code: false,
    horizontalRule: false,
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
]
