import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'
import { GRUPOS_MENU } from './itensMenu'
import { normalizar } from './paleta'
import { travarRolagem } from './travaRolagem'
import { useMesSelecionado } from './useMesSelecionado'

interface Props {
  aberta: boolean
  aoFechar: () => void
}

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
const TODAS_AS_PAGINAS = GRUPOS_MENU.flatMap((grupo) => grupo.itens)

/**
 * Paleta "Ir para…": diálogo com campo de busca e a lista das páginas do menu (só navega). Setas movem a opção ativa
 * (o foco fica no campo, via `aria-activedescendant`), Enter vai, Esc fecha e devolve o foco a quem o tinha antes.
 */
export function PaletaNavegacao({ aberta, aoFechar }: Props) {
  const [consulta, setConsulta] = useState('')
  const [ativo, setAtivo] = useState(0)
  const navegar = useNavigate()
  const { busca } = useMesSelecionado()
  const dialogo = useRef<HTMLDivElement>(null)
  const campo = useRef<HTMLInputElement>(null)
  const idBase = useId()
  const idLista = `${idBase}-lista`

  const resultados = useMemo(() => {
    const termo = normalizar(consulta.trim())
    return TODAS_AS_PAGINAS.filter((item) => normalizar(item.rotulo).includes(termo))
  }, [consulta])

  useEffect(() => {
    if (!aberta) {
      return
    }
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
    campo.current?.focus()
    const soltarRolagem = travarRolagem()
    return () => {
      soltarRolagem()
      setConsulta('')
      setAtivo(0)
      if (anterior?.isConnected) {
        anterior.focus()
      }
    }
  }, [aberta])

  if (!aberta) {
    return null
  }

  const indiceAtivo = Math.min(ativo, Math.max(resultados.length - 1, 0))
  const idOpcao = (indice: number) => `${idBase}-opcao-${indice}`

  const ir = (indice: number) => {
    const item = resultados[indice]
    if (!item) {
      return
    }
    aoFechar()
    void navegar({ pathname: item.caminho, search: item.comMes ? busca : '' })
  }

  const aoTeclar = (evento: KeyboardEvent<HTMLDivElement>) => {
    const total = resultados.length
    // Setas e Enter valem só no campo de busca; em "Fechar" (ou outro botão) o Enter faz o que o botão faz.
    const noCampo = evento.target === campo.current
    switch (evento.key) {
      case 'Escape':
        evento.preventDefault()
        evento.stopPropagation()
        aoFechar()
        break
      case 'ArrowDown':
        if (!noCampo) break
        evento.preventDefault()
        if (total > 0) {
          setAtivo((indiceAtivo + 1) % total)
        }
        break
      case 'ArrowUp':
        if (!noCampo) break
        evento.preventDefault()
        if (total > 0) {
          setAtivo((indiceAtivo - 1 + total) % total)
        }
        break
      case 'Enter':
        // Enter que confirma uma composição (IME) não é "ir".
        if (!noCampo || evento.nativeEvent.isComposing) break
        evento.preventDefault()
        ir(indiceAtivo)
        break
      case 'Tab': {
        const itens = dialogo.current?.querySelectorAll<HTMLElement>(FOCAVEIS)
        const primeiro = itens?.[0]
        const ultimo = itens?.[itens.length - 1]
        if (evento.shiftKey && document.activeElement === primeiro) {
          evento.preventDefault()
          ultimo?.focus()
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
          evento.preventDefault()
          primeiro?.focus()
        }
        break
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]">
      <div
        data-testid="fundo-da-paleta"
        aria-hidden="true"
        onClick={aoFechar}
        className="menu-fundo absolute inset-0 bg-[var(--cor-texto)]/50"
      />
      <div
        ref={dialogo}
        role="dialog"
        aria-modal="true"
        aria-label="Ir para"
        onKeyDown={aoTeclar}
        className="paleta-entra relative flex max-h-[min(30rem,80dvh)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--cor-linha)] bg-[var(--cor-card)] text-[var(--cor-texto)] shadow-xl"
      >
        <div className="flex items-center gap-2 border-b border-[var(--cor-linha)] px-3">
          <input
            ref={campo}
            type="text"
            role="combobox"
            aria-label="Buscar página"
            aria-expanded={resultados.length > 0}
            aria-controls={resultados.length > 0 ? idLista : undefined}
            aria-activedescendant={resultados.length > 0 ? idOpcao(indiceAtivo) : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            placeholder="Ir para…"
            value={consulta}
            onChange={(evento) => {
              setConsulta(evento.target.value)
              setAtivo(0)
            }}
            className="min-h-12 min-w-0 flex-1 bg-transparent text-base text-[var(--cor-texto)] outline-none placeholder:text-[var(--cor-mutado)]"
          />
          <button
            type="button"
            onClick={aoFechar}
            className="min-h-11 shrink-0 cursor-pointer rounded-xl px-3 text-sm font-semibold text-[var(--cor-texto)] hover:bg-[var(--cor-fundo)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
          >
            Fechar
          </button>
        </div>

        <div className="overflow-y-auto p-2">
          {resultados.length === 0 ? (
            <p role="status" className="m-0 px-3 py-6 text-center text-sm text-[var(--cor-mutado)]">
              Nenhum resultado
            </p>
          ) : (
            <ul id={idLista} role="listbox" aria-label="Páginas" className="m-0 flex list-none flex-col gap-0.5 p-0">
              {resultados.map((item, indice) => (
                <li
                  key={item.caminho}
                  id={idOpcao(indice)}
                  role="option"
                  aria-selected={indice === indiceAtivo}
                  onClick={() => ir(indice)}
                  // Os itens normalmente não recebem foco (o foco fica no campo, via aria-activedescendant);
                  // este handler cobre o caso de algum item receber foco.
                  onKeyDown={(evento) => {
                    if (evento.key === 'Enter' || evento.key === ' ') {
                      evento.preventDefault()
                      ir(indice)
                    }
                  }}
                  onMouseMove={() => setAtivo(indice)}
                  className={
                    'flex min-h-11 cursor-pointer items-center rounded-xl px-3 text-sm transition-colors duration-150 ease-out ' +
                    (indice === indiceAtivo
                      ? 'bg-[var(--cor-principal)] font-semibold text-[var(--cor-sobre-principal)]'
                      : 'text-[var(--cor-texto)] hover:bg-[var(--cor-fundo)]')
                  }
                >
                  {item.rotulo}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
