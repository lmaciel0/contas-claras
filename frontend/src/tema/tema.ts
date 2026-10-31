export type Tema = 'claro' | 'escuro'

export const CHAVE_TEMA = 'aprumo-tema'

export const CONSULTA_ESCURO = '(prefers-color-scheme: dark)'

/** Tema gravado pelo usuário; `null` se ausente, inválido ou se o navegador bloquear o `localStorage`. */
export function lerTemaSalvo(): Tema | null {
  try {
    const valor = localStorage.getItem(CHAVE_TEMA)
    return valor === 'claro' || valor === 'escuro' ? valor : null
  } catch {
    return null
  }
}

/** Grava a escolha do usuário. Se o `localStorage` estiver bloqueado, a escolha vale só nesta sessão. */
export function gravarTema(tema: Tema): void {
  try {
    localStorage.setItem(CHAVE_TEMA, tema)
  } catch {
    // Modo privativo ou cota cheia: o tema continua aplicado, só não persiste.
  }
}

/** Tema preferido pelo sistema operacional; `claro` quando o ambiente não tem `matchMedia`. */
export function temaDoSistema(): Tema {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'claro'
  return window.matchMedia(CONSULTA_ESCURO).matches ? 'escuro' : 'claro'
}
