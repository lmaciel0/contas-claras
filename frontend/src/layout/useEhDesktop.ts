import { useSyncExternalStore } from 'react'

/**
 * A partir desta largura (px) o layout troca a navbar inferior pelas abas do topo. É o `xl` do Tailwind: abas, seletor
 * de mês, "+ Lançar" e menu do usuário somam ~1072 px, e o cabeçalho (`max-w-6xl`) só dá 1104 px úteis a partir daqui.
 * Abaixo disso, inclusive em tablet, vale o layout de celular.
 */
export const LARGURA_DESKTOP = 1280

function assinar(aoMudar: () => void) {
  window.addEventListener('resize', aoMudar)
  return () => window.removeEventListener('resize', aoMudar)
}

/** `true` em telas de 1280 px ou mais. Lê `window.innerWidth` (e não CSS) para renderizar só um dos layouts. */
export function useEhDesktop(): boolean {
  return useSyncExternalStore(
    assinar,
    () => window.innerWidth >= LARGURA_DESKTOP,
    () => true,
  )
}
