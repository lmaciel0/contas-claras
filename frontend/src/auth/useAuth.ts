import { createContext, useContext } from 'react'
import type { UsuarioResponse } from '../api/tipos'

export interface Auth {
  /** `null` enquanto não há sessão (visitante) ou antes da primeira conferência (`carregando`). */
  usuario: UsuarioResponse | null
  /** `true` até `GET /api/auth/me` responder pela primeira vez. */
  carregando: boolean
  /** Rejeitam com `ErroApi` (a tela mostra `mensagem`); em sucesso `usuario` já vale o novo usuário. */
  entrar: (email: string, senha: string) => Promise<void>
  entrarComGoogle: (credential: string) => Promise<void>
  cadastrar: (nome: string, email: string, senha: string) => Promise<void>
  /** Sempre deixa o app deslogado, mesmo que a API recuse (cookie já expirado). */
  sair: () => Promise<void>
  /** Relê `GET /api/auth/me` sem voltar a `carregando` (ex.: `temSenha` mudou). */
  recarregar: () => Promise<void>
}

export const AuthContexto = createContext<Auth | null>(null)

export function useAuth(): Auth {
  const auth = useContext(AuthContexto)
  if (auth === null) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>.')
  }
  return auth
}
