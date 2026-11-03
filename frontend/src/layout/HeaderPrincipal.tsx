import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { BotaoTema } from '../tema/BotaoTema'

interface HeaderPrincipalProps {
  readonly nomeUsuario?: string
  readonly aoSair?: () => void
  readonly onAbrirBusca?: () => void
  readonly onAlternarPainelProdutividade?: () => void
  readonly painelProdutividadeAberto?: boolean
  readonly onAbrirPreferencias?: () => void
}

const foco = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]'

/**
 * Barra superior (Header) do layout moderno:
 * - Campo de busca central/esquerdo com atalho Ctrl+K
 * - Notificações (sino com indicador)
 * - Perfil do usuário (avatar, nome, papel Aprumo) com menu suspenso para tema, senha e sair.
 */
export function HeaderPrincipal({
  nomeUsuario,
  aoSair,
  onAbrirBusca,
  onAlternarPainelProdutividade,
  painelProdutividadeAberto = false,
  onAbrirPreferencias,
}: HeaderPrincipalProps) {
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
          className={`group flex h-10 w-full items-center justify-between gap-2.5 rounded-full border border-[var(--cor-linha)]/80 bg-[var(--cor-fundo)]/60 px-3.5 text-sm text-[var(--cor-mutado)] shadow-2xs backdrop-blur-xs transition-all duration-200 hover:border-[var(--cor-principal-clara)] hover:bg-[var(--cor-fundo)] hover:text-[var(--cor-texto)] ${foco}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="text-[var(--cor-mutado)] transition-colors group-hover:text-[var(--cor-principal)]"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <span className="truncate text-left text-sm text-[var(--cor-mutado)] transition-colors group-hover:text-[var(--cor-texto)]">
              Buscar…
            </span>
          </div>
          <kbd
            aria-hidden="true"
            className="hidden sm:inline-flex items-center gap-1 rounded-md border border-[var(--cor-linha)] bg-[var(--cor-card)] px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-[var(--cor-mutado)] shadow-2xs transition-colors group-hover:border-[var(--cor-principal-clara)]/60 group-hover:text-[var(--cor-principal)]"
          >
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Cluster à direita: Alternar Painel + Notificações + Perfil do Usuário */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Alternar Painel de Produtividade */}
        {onAlternarPainelProdutividade && (
          <button
            type="button"
            aria-label="Alternar painel de produtividade"
            aria-pressed={painelProdutividadeAberto}
            onClick={onAlternarPainelProdutividade}
            className={`grid size-10 place-items-center rounded-full text-[var(--cor-texto)] transition-colors hover:bg-[var(--cor-fundo)] 2xl:hidden ${
              painelProdutividadeAberto ? 'bg-[var(--cor-principal-clara)] text-[var(--cor-principal)] font-bold' : ''
            } ${foco}`}
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
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
        )}

        {/* Notificações */}
        <button
          type="button"
          aria-label="Notificações"
          className={`relative grid size-10 place-items-center rounded-full text-[var(--cor-texto)] transition-colors hover:bg-[var(--cor-fundo)] active:scale-95 ${foco}`}
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

        {/* Perfil e Menu Suspenso (Avatar Puro na Barra) */}
        <div ref={menuRef} className="relative">
          <button
            ref={botaoRef}
            type="button"
            aria-label="Perfil do usuário"
            title={nomeUsuario ? `Perfil de ${nomeUsuario}` : 'Perfil do usuário'}
            aria-expanded={menuAberto}
            aria-haspopup="menu"
            onClick={() => setMenuAberto((prev) => !prev)}
            className={`group relative grid size-10 shrink-0 place-items-center rounded-full transition-all duration-200 hover:scale-105 active:scale-95 ${foco}`}
          >
            {/* Informações acessíveis para leitores de tela e testes */}
            {nomeUsuario && <span className="sr-only">{nomeUsuario}</span>}
            <span className="sr-only">Aprumo</span>

            <span
              aria-hidden="true"
              className="grid size-9.5 place-items-center rounded-full bg-[var(--cor-principal)] text-sm font-bold text-[var(--cor-sobre-principal)] shadow-xs ring-2 ring-[var(--cor-linha)] transition-all duration-200 group-hover:ring-[var(--cor-principal-clara)] group-hover:shadow-sm"
            >
              {inicial}
            </span>
          </button>

          {/* Menu Suspenso (Dropdown Rico) */}
          {menuAberto && (
            <div
              role="menu"
              aria-label="Opções da conta"
              className="item-entra absolute top-full right-0 mt-2.5 w-64 rounded-2xl border border-[var(--cor-linha)] bg-[var(--cor-card)] p-2 shadow-xl backdrop-blur-md"
            >
              {/* Cabeçalho do Perfil */}
              <div className="flex items-center gap-3 border-b border-[var(--cor-linha)] p-2.5 pb-3 mb-1">
                <span
                  aria-hidden="true"
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--cor-principal)] text-base font-bold text-[var(--cor-sobre-principal)] ring-2 ring-[var(--cor-linha)]"
                >
                  {inicial}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--cor-texto)]">
                    {nomeUsuario || 'Usuário'}
                  </p>
                  <span className="inline-flex items-center rounded-md bg-[var(--cor-fundo)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--cor-mutado)]">
                    Conta Aprumo
                  </span>
                </div>
              </div>

              {/* Tema */}
              <div className="flex items-center justify-between rounded-xl px-3 py-2 transition-colors hover:bg-[var(--cor-fundo)]">
                <div className="flex items-center gap-2.5">
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
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                  <span className="text-xs font-semibold text-[var(--cor-mutado)]">Tema</span>
                </div>
                <BotaoTema />
              </div>

              {/* Divisória sutil */}
              <div className="my-1 border-t border-[var(--cor-linha)]" />

              {/* Preferências */}
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setMenuAberto(false)
                  onAbrirPreferencias?.()
                }}
                className={`flex w-full min-h-10 items-center gap-2.5 rounded-xl px-3 text-left text-sm text-[var(--cor-texto)] transition-colors hover:bg-[var(--cor-fundo)] ${foco}`}
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
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span>Preferências</span>
              </button>

              {/* Alterar senha */}
              <Link
                role="menuitem"
                to="/conta/senha"
                onClick={() => setMenuAberto(false)}
                className={`flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-sm text-[var(--cor-texto)] transition-colors hover:bg-[var(--cor-fundo)] ${foco}`}
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

              {/* Divisória sutil */}
              <div className="my-1 border-t border-[var(--cor-linha)]" />

              {/* Sair */}
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setMenuAberto(false)
                  aoSair?.()
                }}
                className={`flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 text-left text-sm text-[var(--cor-negativo-texto)] transition-colors hover:bg-[var(--cor-erro-fundo)] ${foco}`}
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
                  className="text-[var(--cor-negativo-texto)]"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span className="font-medium">Sair</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
