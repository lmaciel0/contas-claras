import { Link, Outlet, useLocation } from 'react-router'
import { AbasTopo } from './AbasTopo'
import { AvisoServidor } from './AvisoServidor'
import { MenuUsuario } from './MenuUsuario'
import { NavbarInferior } from './NavbarInferior'
import { SeletorMes } from './SeletorMes'
import { useEhDesktop } from './useEhDesktop'
import { useMesSelecionado } from './useMesSelecionado'

interface Props {
  nomeUsuario?: string
  aoSair?: () => void
}

function Logo() {
  return (
    <Link
      to="/"
      className="flex items-center gap-2 rounded-full bg-white py-1.5 pr-4 pl-1.5 font-bold text-[var(--cor-texto)] no-underline shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
    >
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-full bg-[var(--cor-principal)] font-extrabold text-white"
      >
        C
      </span>
      <span className="hidden sm:inline">Contas Claras</span>
    </Link>
  )
}

/** Telas que não dependem do mês em foco: o relatório é do ano e as categorias não têm período. */
const ROTAS_SEM_MES = ['/relatorios', '/categorias']

/**
 * Moldura das telas logadas: abas no topo em ≥ 768 px, navbar inferior fixa abaixo disso. O seletor de mês só aparece
 * onde o mês importa (nas rotas de `ROTAS_SEM_MES` ele some).
 */
export function AppShell({ nomeUsuario, aoSair = () => undefined }: Props) {
  const ehDesktop = useEhDesktop()
  const { busca } = useMesSelecionado()
  const { pathname } = useLocation()
  const comMes = !ROTAS_SEM_MES.some((rota) => pathname === rota || pathname.startsWith(`${rota}/`))

  return (
    <div className="min-h-dvh bg-[var(--cor-fundo)]">
      <AvisoServidor />
      <header className="mx-auto flex max-w-6xl items-center gap-3 px-4 pt-4 md:px-6">
        <Logo />
        {ehDesktop && (
          <div className="mx-auto">
            <AbasTopo />
          </div>
        )}
        {!ehDesktop && <div className="ml-auto">{comMes && <SeletorMes />}</div>}
        {ehDesktop && (
          <>
            {comMes && <SeletorMes />}
            <Link
              to={{ pathname: '/lancamentos/novo', search: busca }}
              className="rounded-full bg-[var(--cor-principal)] px-4 py-2.5 text-sm font-semibold text-white no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
            >
              + Lançar
            </Link>
          </>
        )}
        <MenuUsuario nomeUsuario={nomeUsuario} comCategorias={!ehDesktop} aoSair={aoSair} />
      </header>
      <main className={`mx-auto max-w-6xl px-4 py-5 md:px-6 ${ehDesktop ? '' : 'pb-28'}`}>
        <Outlet />
      </main>
      {!ehDesktop && <NavbarInferior />}
    </div>
  )
}
