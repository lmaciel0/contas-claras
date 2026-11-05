import { Link, NavLink } from 'react-router'
import { BotaoTema } from '../tema/BotaoTema'
import { ICONES } from './icones'
import { GRUPOS_MENU } from './itensMenu'
import { useMesSelecionado } from './useMesSelecionado'

interface Props {
  nomeUsuario?: string
  aoSair: () => void
  /** Roda ao ativar um link (o painel do celular usa para fechar). */
  aoNavegar?: () => void
}

const foco =
  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--cor-principal)]'
const linhaBase = `flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm no-underline transition-colors duration-150 ease-out ${foco}`

/** Menu lateral: itens agrupados e, no pé, o bloco do usuário (inicial, nome, tema, Alterar senha, Sair). */
export function Sidebar({ nomeUsuario, aoSair, aoNavegar }: Props) {
  const { busca } = useMesSelecionado()
  const inicial = nomeUsuario?.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="flex h-full flex-col gap-4">
      <nav aria-label="Menu principal" className="flex flex-col gap-4">
        {GRUPOS_MENU.map((grupo) => (
          <div key={grupo.titulo ?? 'principal'} className="flex flex-col gap-0.5">
            {grupo.titulo && (
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
                className={({ isActive }) =>
                  `${linhaBase} ` +
                  (isActive
                    ? 'bg-[var(--cor-principal)] font-semibold text-[var(--cor-sobre-principal)]'
                    : 'text-[var(--cor-texto)] hover:bg-[var(--cor-fundo)]')
                }
              >
                {ICONES[item.caminho]}
                <span>{item.rotulo}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-[var(--cor-linha)] pt-3">
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
        <div className="flex px-1">
          <BotaoTema />
        </div>
        <Link
          to="/conta/senha"
          onClick={aoNavegar}
          className={`${linhaBase} text-[var(--cor-texto)] hover:bg-[var(--cor-fundo)]`}
        >
          Alterar senha
        </Link>
        <button
          type="button"
          onClick={() => {
            aoNavegar?.()
            aoSair()
          }}
          className={`${linhaBase} cursor-pointer text-left text-[var(--cor-texto)] hover:bg-[var(--cor-fundo)]`}
        >
          Sair
        </button>
      </div>
    </div>
  )
}
