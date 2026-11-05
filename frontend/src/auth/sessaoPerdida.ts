import { ErroApi } from '../api/cliente'

/** Mensagem que a API devolve com 401 quando a sessão morreu (≠ 401 de reautenticação: "Senha incorreta."/"Login Google inválido."). */
const MENSAGEM_NAO_AUTENTICADO = 'Não autenticado.'

/**
 * `true` quando o erro é um 401 de sessão vencida. As chamadas com `semLogoutEm401` (excluir conta, definir senha)
 * não derrubam a sessão sozinhas, então quem as chama usa isto para chamar `limparSessao()` nesse caso.
 */
export function ehSessaoPerdida(erro: unknown): boolean {
  return erro instanceof ErroApi && erro.status === 401 && erro.mensagem === MENSAGEM_NAO_AUTENTICADO
}
