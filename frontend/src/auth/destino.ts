/** Caracteres de controle (tab, quebra de linha, nulo...) e barra invertida: o navegador os remove ou troca por `/`. */
const CARACTERES_PROIBIDOS = /[\p{Cc}\\]/u

/**
 * Rotas que nunca viram destino: depois de entrar a pessoa não deve cair direto numa tela destrutiva. Um `voltar`
 * forjado ou antigo (ex.: `?voltar=%2Fconta%2Fexcluir`) iria direto à exclusão de conta.
 */
const ROTAS_RECUSADAS = ['/conta/excluir']

const LIMITE_DE_DECODIFICACOES = 5

/**
 * Forma comparável do caminho: decodifica o percent-encoding até estabilizar (cobre `%69`, `%2F` e `%2569`), resolve
 * `.`/`..`, ignora query e hash, barras finais e caixa. Devolve `null` se não der para decodificar ou se ainda mudar
 * depois do limite: nesses casos o chamador recusa o destino.
 */
function caminhoNormalizado(pathname: string): string | null {
  let atual = pathname
  for (let tentativa = 0; tentativa <= LIMITE_DE_DECODIFICACOES; tentativa++) {
    let resolvido: string
    try {
      resolvido = new URL(window.location.origin + atual).pathname
    } catch {
      return null
    }
    let decodificado: string
    try {
      decodificado = decodeURIComponent(resolvido)
    } catch {
      return null
    }
    if (decodificado === atual) {
      return atual.split(/[?#]/)[0]!.replace(/\/+$/, '').toLowerCase()
    }
    atual = decodificado
  }
  return null
}

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
  if (destino.startsWith('//')) {
    return '/'
  }
  // `/conta/exclu%69r` escapa de uma comparação com o texto bruto: compara o caminho decodificado e normalizado.
  const comparavel = caminhoNormalizado(url.pathname)
  return comparavel === null || ROTAS_RECUSADAS.includes(comparavel) ? '/' : destino
}
