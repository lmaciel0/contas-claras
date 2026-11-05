import { useSyncExternalStore } from 'react'

/** Abaixo desta largura (px) vale o layout de celular, com a dock inferior flutuante. É o `md` do Tailwind. */
export const LARGURA_CELULAR = 768

function assinar(aoMudar: () => void) {
  window.addEventListener('resize', aoMudar)
  return () => window.removeEventListener('resize', aoMudar)
}

/** `true` em telas de menos de 768 px. Mesmo padrão do `useEhDesktop`; no servidor vale `false`. */
export function useEhCelular(): boolean {
  return useSyncExternalStore(
    assinar,
    () => window.innerWidth < LARGURA_CELULAR,
    () => false,
  )
}
