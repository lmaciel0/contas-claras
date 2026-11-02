import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router'
import { usePreferencias } from '../preferencias/usePreferencias'
import { GRUPOS_MENU } from './itensMenu'
import { useMesSelecionado } from './useMesSelecionado'
import { Logo } from './Logo'

const iconeProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

const ICONES: Record<string, ReactNode> = {
  '/': (
    <svg {...iconeProps}>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  ),
  '/projetos': (
    <svg {...iconeProps}>
      <rect x="3" y="3" width="5" height="18" rx="1" />
      <rect x="11" y="3" width="5" height="12" rx="1" />
      <rect x="19" y="3" width="5" height="15" rx="1" />
    </svg>
  ),
  '/tarefas': (
    <svg {...iconeProps}>
      <path d="m9 11 3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  '/notas': (
    <svg {...iconeProps}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  ),
  '/financeiro': (
    <svg {...iconeProps}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  '/lancamentos': (
    <svg {...iconeProps}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  ),
  '/cartoes': (
    <svg {...iconeProps}>
      <rect x="2" y="5" width="20" height="14" rx="3" />
      <path d="M2 10h20" />
    </svg>
  ),
  '/categorias': (
    <svg {...iconeProps}>
      <path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
      <path d="M7.5 7.5h.01" />
    </svg>
  ),
  '/relatorios': (
    <svg {...iconeProps}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  ),
}

interface DockLateralProps {
  nomeUsuario?: string
  aoSair: () => void
  aoNavegar?: () => void
  aoAbrirPreferencias: () => void
  forcarExpandida?: boolean
}

const foco =
  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--cor-principal)]'
const linhaBase = `flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm no-underline transition-colors duration-150 ease-out ${foco}`

export function DockLateral({
  nomeUsuario,
  aoSair,
  aoNavegar,
  aoAbrirPreferencias,
  forcarExpandida = false,
}: DockLateralProps) {
  const { busca } = useMesSelecionado()
  const { preferencias, setDockRecolhida } = usePreferencias()

  const recolhida = forcarExpandida ? false : preferencias.dockRecolhida
  const inicial = nomeUsuario?.trim().charAt(0).toUpperCase() || '?'

  return (
    <aside
      className={`relative flex h-full flex-col transition-all duration-200 select-none ${
        recolhida ? 'w-[72px] px-2 py-4' : 'w-60 px-3 py-4'
      }`}
    >
      {/* Topo: Logo + Botão Colapsar/Expandir */}
      <div className={`flex items-center pb-3 border-b border-[var(--cor-linha)] ${
        recolhida ? 'justify-center flex-col gap-3' : 'justify-between px-1'
      }`}>
        {recolhida ? (
          <div
            title="Aprumo"
            className="grid size-10 place-items-center rounded-2xl bg-[var(--cor-principal)] text-[var(--cor-sobre-principal)] font-black text-lg shadow-sm"
          >
            A
          </div>
        ) : (
          <Logo />
        )}

        {!forcarExpandida && (
          <button
            type="button"
            aria-label={recolhida ? 'Expandir menu' : 'Recolher menu'}
            onClick={() => setDockRecolhida((v) => !v)}
            className={`grid size-8 place-items-center rounded-xl text-[var(--cor-mutado)] transition-colors hover:bg-[var(--cor-fundo)] hover:text-[var(--cor-texto)] ${foco}`}
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
              className={`transition-transform duration-200 ${recolhida ? 'rotate-180' : ''}`}
              aria-hidden="true"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M9 3v18" />
              <path d="m14 9-3 3 3 3" />
            </svg>
          </button>
        )}
      </div>

      {/* Navegação */}
      <nav aria-label="Menu principal" className="mt-3 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden">
        {GRUPOS_MENU.map((grupo) => (
          <div key={grupo.titulo ?? 'principal'} className="flex flex-col gap-1">
            {!recolhida && grupo.titulo && (
              <p className="m-0 px-3 pt-1 pb-1 text-xs font-semibold tracking-wide text-[var(--cor-mutado)] uppercase">
                {grupo.titulo}
              </p>
            )}
            {grupo.itens.map((item) => (
              <NavLink
                key={item.caminho}
                to={{ pathname: item.caminho, search: item.comMes ? busca : '' }}
                end={item.exata ?? false}
                onClick={aoNavegar}
                title={recolhida ? item.rotulo : undefined}
                className={({ isActive }) =>
                  recolhida
                    ? `group relative grid size-11 place-items-center rounded-2xl transition-all duration-150 ${foco} ` +
                      (isActive
                        ? 'bg-[var(--cor-principal)] text-[var(--cor-sobre-principal)] shadow-md font-semibold'
                        : 'text-[var(--cor-mutado)] hover:bg-[var(--cor-fundo)] hover:text-[var(--cor-texto)]')
                    : `${linhaBase} ` +
                      (isActive
                        ? 'bg-[var(--cor-principal)] font-semibold text-[var(--cor-sobre-principal)] shadow-xs'
                        : 'text-[var(--cor-texto)] hover:bg-[var(--cor-fundo)]')
                }
              >
                {ICONES[item.caminho]}
                {!recolhida && <span>{item.rotulo}</span>}

                {/* Tooltip flutuante quando recolhido */}
                {recolhida && (
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute left-full ml-3 z-30 hidden rounded-lg border border-[var(--cor-linha)] bg-[var(--cor-card)] px-2.5 py-1 text-xs font-semibold text-[var(--cor-texto)] shadow-lg whitespace-nowrap group-hover:block group-focus-visible:block"
                  >
                    {item.rotulo}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Rodapé da Dock */}
      <div className="mt-auto flex flex-col gap-1 border-t border-[var(--cor-linha)] pt-3">
        {/* Botão de Preferências */}
        <button
          type="button"
          aria-label="Preferências"
          title={recolhida ? 'Preferências' : undefined}
          onClick={() => {
            aoNavegar?.()
            aoAbrirPreferencias()
          }}
          className={
            recolhida
              ? `group relative grid size-11 place-items-center rounded-2xl text-[var(--cor-mutado)] hover:bg-[var(--cor-fundo)] hover:text-[var(--cor-texto)] transition-colors ${foco}`
              : `${linhaBase} text-[var(--cor-texto)] hover:bg-[var(--cor-fundo)]`
          }
        >
          <svg
            {...iconeProps}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          {!recolhida && <span>Preferências</span>}
          {recolhida && (
            <span
              role="tooltip"
              className="pointer-events-none absolute left-full ml-3 z-30 hidden rounded-lg border border-[var(--cor-linha)] bg-[var(--cor-card)] px-2.5 py-1 text-xs font-semibold text-[var(--cor-texto)] shadow-lg whitespace-nowrap group-hover:block group-focus-visible:block"
            >
              Preferências
            </span>
          )}
        </button>

        {/* Perfil do usuário */}
        {!recolhida ? (
          <div className="flex items-center gap-3 px-3 py-1">
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--cor-principal)] text-sm font-bold text-[var(--cor-sobre-principal)]"
            >
              {inicial}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--cor-texto)]" title={nomeUsuario}>
              {nomeUsuario}
            </span>
          </div>
        ) : (
          <div
            title={nomeUsuario}
            aria-label={nomeUsuario}
            className="group relative flex justify-center py-1"
          >
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--cor-principal)] text-sm font-bold text-[var(--cor-sobre-principal)]"
            >
              {inicial}
            </span>
            <span
              role="tooltip"
              className="pointer-events-none absolute left-full ml-3 z-30 hidden rounded-lg border border-[var(--cor-linha)] bg-[var(--cor-card)] px-2.5 py-1 text-xs font-semibold text-[var(--cor-texto)] shadow-lg whitespace-nowrap group-hover:block"
            >
              {nomeUsuario}
            </span>
          </div>
        )}

        {/* Links adicionais quando expandida */}
        {!recolhida && (
          <Link
            to="/conta/senha"
            onClick={aoNavegar}
            className={`${linhaBase} text-[var(--cor-texto)] hover:bg-[var(--cor-fundo)]`}
          >
            Alterar senha
          </Link>
        )}

        {/* Botão Sair */}
        <button
          type="button"
          aria-label="Sair"
          title={recolhida ? 'Sair' : undefined}
          onClick={() => {
            aoNavegar?.()
            aoSair()
          }}
          className={
            recolhida
              ? `group relative grid size-11 place-items-center rounded-2xl text-[var(--cor-negativo)] hover:bg-[var(--cor-erro-fundo)] transition-colors ${foco}`
              : `${linhaBase} cursor-pointer text-left text-[var(--cor-negativo)] hover:bg-[var(--cor-erro-fundo)]`
          }
        >
          <svg
            {...iconeProps}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {!recolhida && <span>Sair</span>}
          {recolhida && (
            <span
              role="tooltip"
              className="pointer-events-none absolute left-full ml-3 z-30 hidden rounded-lg border border-[var(--cor-linha)] bg-[var(--cor-card)] px-2.5 py-1 text-xs font-semibold text-[var(--cor-negativo)] shadow-lg whitespace-nowrap group-hover:block group-focus-visible:block"
            >
              Sair
            </span>
          )}
        </button>
      </div>
    </aside>
  )
}
