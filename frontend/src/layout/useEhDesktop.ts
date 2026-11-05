import { useLarguraJanela } from './useLarguraJanela'

/**
 * A partir desta largura (px) o layout troca a barra fina do topo (com o menu deslizante) pela dock lateral e pelo
 * cabeçalho completo. É o `xl` do Tailwind: abas, seletor de mês, "+ Lançar" e menu do usuário somam ~1072 px, e o
 * cabeçalho (`max-w-6xl`) só dá 1104 px úteis a partir daqui. Abaixo disso vale o layout compacto; só abaixo de
 * `LARGURA_CELULAR` (768 px) entra também a dock inferior.
 */
export const LARGURA_DESKTOP = 1280

/** `true` em telas de 1280 px ou mais. Lê `window.innerWidth` (e não CSS) para renderizar só um dos layouts. */
export function useEhDesktop(): boolean {
  return useLarguraJanela((largura) => largura >= LARGURA_DESKTOP, true)
}
