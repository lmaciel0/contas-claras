import { useSyncExternalStore } from 'react'

function assinarResize(aoMudar: () => void) {
  window.addEventListener('resize', aoMudar)
  return () => window.removeEventListener('resize', aoMudar)
}

/**
 * Lê `window.innerWidth` (e não CSS) e reavalia a cada `resize`, para renderizar só um dos layouts. `snapshotServidor`
 * é o valor usado onde não há `window`.
 */
export function useLarguraJanela(predicado: (largura: number) => boolean, snapshotServidor: boolean): boolean {
  return useSyncExternalStore(
    assinarResize,
    () => predicado(window.innerWidth),
    () => snapshotServidor,
  )
}
