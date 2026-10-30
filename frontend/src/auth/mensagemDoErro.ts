import { ErroApi } from '../api/cliente'

/** Texto pt-BR para mostrar na tela: a mensagem da API quando houver, senão uma genérica. */
export function mensagemDoErro(erro: unknown): string {
  return erro instanceof ErroApi ? erro.mensagem : 'Algo deu errado. Tente de novo.'
}
