import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useMesSelecionado } from './useMesSelecionado'

interface Props {
  nomeUsuario?: string
  /** No celular a navbar não tem Categorias; ela vai para este menu. */
  comCategorias: boolean
  aoSair: () => void
}

const itemClasse =
  'block w-full rounded-xl px-3 py-2.5 text-left text-sm text-[var(--cor-texto)] no-underline ' +
  'hover:bg-[var(--cor-fundo)] focus-visible:outline-2 focus-visible:-outline-offset-2 ' +
  'focus-visible:outline-[var(--cor-principal)]'

/** Botão do perfil com as opções da conta (padrão disclosure: abre/fecha, Esc devolve o foco ao botão). */
export function MenuUsuario({ nomeUsuario, comCategorias, aoSair }: Props) {
  const [aberto, setAberto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const idPainel = useId()
  const { busca } = useMesSelecionado()

  useEffect(() => {
    if (!aberto) {
      return
    }
    const fecharAoClicarFora = (evento: PointerEvent) => {
      if (raiz.current && !raiz.current.contains(evento.target as Node)) {
        setAberto(false)
      }
    }
    const fecharComEsc = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        setAberto(false)
        botao.current?.focus()
      }
    }
    document.addEventListener('pointerdown', fecharAoClicarFora)
    document.addEventListener('keydown', fecharComEsc)
    return () => {
      document.removeEventListener('pointerdown', fecharAoClicarFora)
      document.removeEventListener('keydown', fecharComEsc)
    }
  }, [aberto])

  const fechar = () => setAberto(false)
  const inicial = nomeUsuario?.trim().charAt(0).toUpperCase() || '?'

  return (
    <div ref={raiz} className="relative">
      <button
        ref={botao}
        type="button"
        aria-label="Menu do usuário"
        aria-expanded={aberto}
        aria-controls={idPainel}
        onClick={() => setAberto((valor) => !valor)}
        className="flex min-h-10 items-center gap-2 rounded-full bg-white py-1 pr-3 pl-1 text-sm shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
      >
        <span
          aria-hidden="true"
          className="grid size-8 place-items-center rounded-full bg-[var(--cor-principal)] text-sm font-bold text-white"
        >
          {inicial}
        </span>
        {nomeUsuario && <span className="hidden md:inline">{nomeUsuario}</span>}
        <span aria-hidden="true" className="text-[var(--cor-mutado)]">
          ▾
        </span>
      </button>

      <div
        id={idPainel}
        role="group"
        aria-label="Opções da conta"
        hidden={!aberto}
        className="absolute right-0 z-50 mt-2 w-52 rounded-2xl border border-[var(--cor-linha)] bg-white p-1.5 shadow-lg"
      >
        {comCategorias && (
          <Link to={{ pathname: '/categorias', search: busca }} className={itemClasse} onClick={fechar}>
            Categorias
          </Link>
        )}
        <Link to="/conta/senha" className={itemClasse} onClick={fechar}>
          Alterar senha
        </Link>
        <button type="button" className={itemClasse} onClick={aoSair}>
          Sair
        </button>
      </div>
    </div>
  )
}
