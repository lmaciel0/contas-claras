import { NavLink } from 'react-router'
import { ICONES } from './icones'
import { ITENS_DOCK } from './itensMenu'
import { useMesSelecionado } from './useMesSelecionado'

const foco = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]'

const baseItem = `flex min-h-11 min-w-11 items-center justify-center rounded-full text-xs font-bold no-underline transition-colors duration-200 ease-out motion-safe:active:scale-95 motion-reduce:transition-none ${foco}`

/**
 * Dock flutuante do celular (menos de 768 px): pílula fixa embaixo com os quatro destinos principais. Só o item ativo
 * mostra o rótulo; os outros ficam só com o ícone (o `aria-label` vale para todos). O rótulo entra com fade e leve deslocamento
 * (`.dock-rotulo`, desligado em `prefers-reduced-motion`). Só cor, opacidade e transform animam.
 */
export function DockInferior() {
  const { busca } = useMesSelecionado()

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-2.5 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md items-center justify-between gap-0.5 rounded-full border border-[var(--cor-linha)] bg-[color-mix(in_srgb,var(--cor-card)_88%,transparent)] p-1.5 shadow-[0_10px_24px_color-mix(in_srgb,var(--cor-principal)_18%,transparent)] backdrop-blur-[10px]"
    >
      {ITENS_DOCK.map((item) => (
        <NavLink
          key={item.caminho}
          to={{ pathname: item.caminho, search: item.comMes ? busca : '' }}
          end={item.exata ?? false}
          aria-label={item.rotulo}
          className={({ isActive }) =>
            `${baseItem} ${
              isActive
                ? 'gap-1.5 bg-[var(--cor-principal)] pr-3.5 pl-3 text-[var(--cor-sobre-principal)]'
                : 'text-[var(--cor-mutado)] hover:bg-[var(--cor-fundo)] hover:text-[var(--cor-texto)]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {ICONES[item.caminho]}
              {isActive && <span className="dock-rotulo">{item.rotulo}</span>}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
