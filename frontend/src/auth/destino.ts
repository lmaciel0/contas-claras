/** Caracteres de controle (tab, quebra de linha, nulo...) e barra invertida: o navegador os remove ou troca por `/`. */
const CARACTERES_PROIBIDOS = /[\p{Cc}\\]/u

/**
 * Rota para onde ir depois de entrar (parâmetro `voltar`). Só aceita caminho interno; qualquer outra coisa
 * vira `/`, para o parâmetro não servir de redirecionamento aberto.
 *
 * Conferir o texto não basta: `/<tab>/evil.com` passa em `startsWith('/')` e não começa com `//`, mas o
 * navegador remove o tab ao interpretar a URL e sobra `//evil.com`. Por isso rejeita controle e `\` e depois
 * interpreta a URL como o navegador faz, exigindo a mesma origem; devolve o caminho já normalizado.
 */
export function destinoAposEntrar(voltar: string | null): string {
  if (voltar === null || !voltar.startsWith('/') || CARACTERES_PROIBIDOS.test(voltar)) {
    return '/'
  }
  let url: URL
  try {
    url = new URL(voltar, window.location.origin)
  } catch {
    return '/'
  }
  if (url.origin !== window.location.origin) {
    return '/'
  }
  const destino = url.pathname + url.search + url.hash
  // `/.//evil.com` vira o caminho `//evil.com` depois de normalizado; outra vez uma URL de outro site.
  return destino.startsWith('//') ? '/' : destino
}
