/** Regra de tamanho da API para senha nova (8 a 72 caracteres). */
export function senhaValida(senha: string): boolean {
  return senha.length >= 8 && senha.length <= 72
}

export const MENSAGEM_SENHA_FORA_DO_TAMANHO = 'A senha deve ter de 8 a 72 caracteres.'
