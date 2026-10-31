import { NavLink } from 'react-router'
import { useMesSelecionado } from './useMesSelecionado'

const ABAS = [
  { rotulo: 'Início', caminho: '/', exata: true },
  { rotulo: 'Lançamentos', caminho: '/lancamentos', exata: false },
  { rotulo: 'Cartões', caminho: '/cartoes', exata: false },
  { rotulo: 'Categorias', caminho: '/categorias', exata: false },
  { rotulo: 'Relatórios', caminho: '/relatorios', exata: false },
] as const

/** Abas do topo (computador): Início · Lançamentos · Cartões · Categorias · Relatórios. */
export function AbasTopo() {
  const { busca } = useMesSelecionado()

  return (
    <nav aria-label="Abas" className="flex gap-1 rounded-full bg-white p-1.5 shadow-sm">
      {ABAS.map((aba) => (
        <NavLink
          key={aba.caminho}
          to={{ pathname: aba.caminho, search: busca }}
          end={aba.exata}
          className={({ isActive }) =>
            'rounded-full px-4 py-2 text-sm font-medium no-underline focus-visible:outline-2 ' +
            'focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)] ' +
            (isActive
              ? 'bg-[var(--cor-principal)] text-white'
              : 'text-[var(--cor-texto)] hover:bg-[var(--cor-fundo)]')
          }
        >
          {aba.rotulo}
        </NavLink>
      ))}
    </nav>
  )
}
