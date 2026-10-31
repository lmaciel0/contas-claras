export type Tema = 'claro' | 'escuro'

export const CHAVE_TEMA = 'aprumo-tema'

/** Tema de quem ainda não escolheu: sempre o claro, sem olhar o sistema operacional. */
export const TEMA_PADRAO: Tema = 'claro'

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

/** Cor da barra do navegador (`<meta name="theme-color">`) em cada tema: o roxo da marca e o `--cor-fundo` escuro. */
export const COR_BARRA: Record<Tema, string> = { claro: '#27187E', escuro: '#0f0b2b' }

/** Aplica o tema em `<html data-tema>` e na cor da barra do navegador, respeitando a escolha explícita. */
export function aplicarTema(tema: Tema): void {
  document.documentElement.dataset.tema = tema
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COR_BARRA[tema])
}
