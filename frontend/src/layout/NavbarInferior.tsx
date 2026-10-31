import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router'
import { useMesSelecionado } from './useMesSelecionado'

const iconeProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

const ICONES: Record<string, ReactNode> = {
  inicio: (
    <svg {...iconeProps}>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  ),
  lancamentos: (
    <svg {...iconeProps}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  ),
  cartoes: (
    <svg {...iconeProps}>
      <rect x="2" y="5" width="20" height="14" rx="3" />
      <path d="M2 10h20" />
    </svg>
  ),
  relatorios: (
    <svg {...iconeProps}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  ),
}

interface ItemNav {
  rotulo: string
  caminho: string
  icone: keyof typeof ICONES
  exata?: boolean
}

const ANTES: ItemNav[] = [
  { rotulo: 'Início', caminho: '/', icone: 'inicio', exata: true },
  { rotulo: 'Lançamentos', caminho: '/lancamentos', icone: 'lancamentos' },
]
const DEPOIS: ItemNav[] = [
  { rotulo: 'Cartões', caminho: '/cartoes', icone: 'cartoes' },
  { rotulo: 'Relatórios', caminho: '/relatorios', icone: 'relatorios' },
]

/** Navbar fixa do celular: Início · Lançamentos · (+) · Cartões · Relatórios. */
export function NavbarInferior() {
  const { busca } = useMesSelecionado()

  const renderizar = (item: ItemNav) => (
    <NavLink
      key={item.caminho}
      to={{ pathname: item.caminho, search: busca }}
      end={item.exata ?? false}
      className={({ isActive }) =>
        'flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] no-underline ' +
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--cor-principal)] ' +
        (isActive ? 'font-bold text-[var(--cor-principal)]' : 'text-[var(--cor-mutado)]')
      }
    >
      {ICONES[item.icone]}
      <span>{item.rotulo}</span>
    </NavLink>
  )

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center border-t border-[var(--cor-linha)] bg-white pb-[env(safe-area-inset-bottom)]"
    >
      {ANTES.map(renderizar)}
      <div className="flex flex-1 justify-center">
        <Link
          to={{ pathname: '/lancamentos/novo', search: busca }}
          aria-label="Novo lançamento"
          className="-mt-7 grid size-14 place-items-center rounded-full bg-[var(--cor-principal)] text-3xl leading-none text-white no-underline shadow-[0_6px_16px_rgba(39,24,126,0.4)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
        >
          <span aria-hidden="true">+</span>
        </Link>
      </div>
      {DEPOIS.map(renderizar)}
    </nav>
  )
}
