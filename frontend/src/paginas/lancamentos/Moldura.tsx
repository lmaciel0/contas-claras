import { useEffect, useId, useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'

interface Props {
  titulo: string
  aoFechar: () => void
  children: ReactNode
}

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'

/**
 * Moldura do formulário: tela cheia abaixo de 768 px e janela modal com fundo escurecido a partir daí (só CSS,
 * o mesmo HTML nos dois). `Esc` fecha, `Tab` não sai da janela e o foco volta para onde estava ao fechar.
 */
export function Moldura({ titulo, aoFechar, children }: Props) {
  const idTitulo = useId()
  const janela = useRef<HTMLDivElement>(null)
  const fecharRef = useRef(aoFechar)

  // Guarda a versão mais nova de `aoFechar` sem reinstalar o ouvinte de `Esc` a cada render.
  useEffect(() => {
    fecharRef.current = aoFechar
  })

  useEffect(() => {
    const anterior = document.activeElement
    janela.current?.focus()
    const aoApertarEsc = (evento: globalThis.KeyboardEvent) => {
      if (evento.key === 'Escape') {
        fecharRef.current()
      }
    }
    document.addEventListener('keydown', aoApertarEsc)
    return () => {
      document.removeEventListener('keydown', aoApertarEsc)
      if (anterior instanceof HTMLElement) {
        anterior.focus()
      }
    }
  }, [])

  function prenderFoco(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key !== 'Tab' || janela.current === null) {
      return
    }
    const focaveis = [...janela.current.querySelectorAll<HTMLElement>(FOCAVEIS)]
    const primeiro = focaveis[0]
    const ultimo = focaveis[focaveis.length - 1]
    if (primeiro === undefined || ultimo === undefined) {
      return
    }
    if (evento.shiftKey && (document.activeElement === primeiro || document.activeElement === janela.current)) {
      evento.preventDefault()
      ultimo.focus()
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault()
      primeiro.focus()
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[var(--cor-fundo)] md:grid md:place-items-center md:bg-black/40 md:p-6">
      <div
        ref={janela}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        onKeyDown={prenderFoco}
        className="h-full overflow-y-auto px-4 pt-4 pb-8 outline-none md:h-auto md:max-h-full md:w-full md:max-w-lg md:rounded-3xl md:bg-[var(--cor-fundo)] md:p-6 md:shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={idTitulo} className="m-0 text-xl font-bold">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="grid size-11 place-items-center rounded-full bg-[var(--cor-card)] text-xl leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
