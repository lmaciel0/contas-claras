import { useLarguraJanela } from './useLarguraJanela'

/** Abaixo desta largura (px) vale o layout de celular, com a dock inferior flutuante. É o `md` do Tailwind. */
export const LARGURA_CELULAR = 768

/** `true` em telas de menos de 768 px. Mesmo padrão do `useEhDesktop`; no servidor vale `false`. */
export function useEhCelular(): boolean {
  return useLarguraJanela((largura) => largura < LARGURA_CELULAR, false)
}
