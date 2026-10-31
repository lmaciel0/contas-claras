import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { BotaoTema } from '../tema/BotaoTema'

interface HeaderPrincipalProps {
  nomeUsuario?: string
  aoSair?: () => void
  onAbrirBusca?: () => void
}

const foco = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]'

/**
 * Barra superior (Header) do layout moderno:
 * - Campo de busca central/esquerdo com atalho Ctrl+K
 * - Notificações (sino com indicador)
 * - Perfil do usuário (avatar, nome, papel Aprumo) com menu suspenso para tema, senha e sair.
 */
export function HeaderPrincipal({ nomeUsuario, aoSair, onAbrirBusca }: HeaderPrincipalProps) {
  const [menuAberto, setMenuAberto] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const botaoRef = useRef<HTMLButtonElement>(null)

  const inicial = nomeUsuario?.trim().charAt(0).toUpperCase() || '?'

  // Fecha o menu ao clicar fora ou pressionar Escape
  useEffect(() => {
    if (!menuAberto) {
      return
    }

    const lidarCliqueFora = (evento: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(evento.target as Node)) {
        setMenuAberto(false)
      }
    }

    const lidarTeclado = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        setMenuAberto(false)
        botaoRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', lidarCliqueFora)
    document.addEventListener('keydown', lidarTeclado)
    return () => {
      document.removeEventListener('mousedown', lidarCliqueFora)
      document.removeEventListener('keydown', lidarTeclado)
    }
  }, [menuAberto])

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-[var(--cor-linha)] bg-[var(--cor-card)] px-4 md:px-6 shadow-xs">
      {/* Campo de busca conectado à paleta rápida (Ctrl+K) */}
      <div className="flex-1 max-w-md">
        <button
          type="button"
          aria-label="Buscar páginas e atalhos"
          onClick={onAbrirBusca}
          className={`group flex h-10 w-full items-center gap-2.5 rounded-full border border-[var(--cor-linha)] bg-[var(--cor-fundo)] px-3.5 text-sm text-[var(--cor-mutado)] shadow-xs transition-colors hover:border-[var(--cor-principal-clara)] ${foco}`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="text-[var(--cor-mutado)] group-hover:text-[var(--cor-principal)] transition-colors"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <span className="flex-1 text-left">Search…</span>
          <kbd className="hidden rounded-md border border-[var(--cor-linha)] bg-[var(--cor-card)] px-1.5 py-0.5 text-xs font-semibold text-[var(--cor-mutado)] sm:inline-block">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Cluster à direita: Notificações + Perfil do Usuário */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notificações */}
        <button
          type="button"
          aria-label="Notificações"
          className={`relative grid size-10 place-items-center rounded-full text-[var(--cor-texto)] transition-colors hover:bg-[var(--cor-fundo)] ${foco}`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span
            className="absolute top-2.5 right-2.5 size-2 rounded-full bg-[var(--cor-negativo)] ring-2 ring-[var(--cor-card)]"
            aria-hidden="true"
          />
        </button>

        {/* Perfil e Menu Suspenso */}
        <div ref={menuRef} className="relative">
          <button
            ref={botaoRef}
            type="button"
            aria-label="Perfil do usuário"
            aria-expanded={menuAberto}
            aria-haspopup="menu"
            onClick={() => setMenuAberto((prev) => !prev)}
            className={`flex items-center gap-2.5 rounded-full p-1 pl-2 text-left transition-colors hover:bg-[var(--cor-fundo)] ${foco}`}
          >
            <div className="hidden flex-col text-right sm:flex">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--cor-mutado)]">
                Aprumo
              </span>
              <span className="max-w-[140px] truncate text-sm font-semibold text-[var(--cor-texto)]">
                {nomeUsuario}
              </span>
            </div>
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--cor-principal)] text-sm font-bold text-[var(--cor-sobre-principal)] ring-2 ring-[var(--cor-linha)]"
            >
              {inicial}
            </span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={`text-[var(--cor-mutado)] transition-transform duration-200 ${menuAberto ? 'rotate-180' : ''}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {/* Menu Suspenso (Dropdown) */}
          {menuAberto && (
            <div
              role="menu"
              aria-label="Opções da conta"
              className="item-entra absolute top-full right-0 mt-2 w-60 rounded-2xl border border-[var(--cor-linha)] bg-[var(--cor-card)] p-2 shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-[var(--cor-linha)] px-3 py-2.5 mb-1">
                <span className="text-xs font-semibold text-[var(--cor-mutado)]">Tema</span>
                <BotaoTema />
              </div>
              <Link
                role="menuitem"
                to="/conta/senha"
                onClick={() => setMenuAberto(false)}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-[var(--cor-texto)] transition-colors hover:bg-[var(--cor-fundo)] ${foco}`}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="text-[var(--cor-mutado)]"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Alterar senha</span>
              </Link>
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setMenuAberto(false)
                  aoSair?.()
                }}
                className={`flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-sm text-[var(--cor-texto)] transition-colors hover:bg-[var(--cor-fundo)] ${foco}`}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="text-[var(--cor-mutado)]"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Sair</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
