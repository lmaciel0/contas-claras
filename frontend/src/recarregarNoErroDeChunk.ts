const CHAVE = 'aprumo:recarga-por-chunk'
/** Dentro dessa janela, um segundo erro de chunk não recarrega de novo (evita loop se o arquivo realmente não existe). */
const JANELA_MS = 30_000

interface Opcoes {
  alvo?: Window
  recarregar?: () => void
  agora?: () => number
}

function recargaRecente(agora: number): boolean {
  try {
    const ultima = Number(sessionStorage.getItem(CHAVE))
    return Number.isFinite(ultima) && ultima > 0 && agora - ultima < JANELA_MS
  } catch {
    return true
  }
}

function marcarRecarga(agora: number): boolean {
  try {
    sessionStorage.setItem(CHAVE, String(agora))
    return true
  } catch {
    return false
  }
}

/**
 * Depois de um deploy, uma aba antiga pede chunks com hash que não existem mais e o Vite emite `vite:preloadError`.
 * A primeira vez recarrega a página (pega o `index.html` novo); se acontecer de novo dentro da janela, ou se o
 * `sessionStorage` não funcionar (sem como garantir que não haverá loop), deixa o erro seguir para o `ErroDeCarregamento`.
 * Devolve a função que remove o ouvinte.
 */
export function instalarRecarregarNoErroDeChunk({
  alvo = window,
  recarregar = () => window.location.reload(),
  agora = Date.now,
}: Opcoes = {}) {
  const ouvinte = (evento: Event) => {
    const instante = agora()
    if (recargaRecente(instante) || !marcarRecarga(instante)) {
      return
    }
    evento.preventDefault()
    recarregar()
  }
  alvo.addEventListener('vite:preloadError', ouvinte)
  return () => alvo.removeEventListener('vite:preloadError', ouvinte)
}
