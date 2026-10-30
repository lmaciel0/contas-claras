import { useSyncExternalStore } from 'react'

/** A partir desta largura (px) o layout troca a navbar inferior pelas abas do topo. */
export const LARGURA_DESKTOP = 768

function assinar(aoMudar: () => void) {
  window.addEventListener('resize', aoMudar)
  return () => window.removeEventListener('resize', aoMudar)
}

/** `true` em telas de 768 px ou mais. Lê `window.innerWidth` (e não CSS) para renderizar só um dos layouts. */
export function useEhDesktop(): boolean {
  return useSyncExternalStore(
    assinar,
    () => window.innerWidth >= LARGURA_DESKTOP,
    () => true,
  )
}
