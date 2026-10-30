import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { aoNaoAutenticado } from '../api/cliente'
import { endpoints } from '../api/endpoints'
import type { UsuarioResponse } from '../api/tipos'
import { AuthContexto } from './useAuth'
import type { Auth } from './useAuth'

/**
 * Guarda quem está logado. Na montagem confere a sessão em `GET /api/auth/me`; depois disso o cookie
 * (HttpOnly) é a única prova de sessão: o token nunca passa pelo JavaScript.
 *
 * Sessão expirada: qualquer 401 da API só zera `usuario` (idempotente, inclusive o 401 de senha errada
 * em /login). Quem leva ao login é a `RotaProtegida`, ao ver `usuario === null`; por isso não há redirecionamento
 * imperativo aqui e, portanto, nenhum loop possível.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [usuario, setUsuario] = useState<UsuarioResponse | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    endpoints.auth
      .me()
      .then((atual) => {
        if (ativo) setUsuario(atual)
      })
      .catch(() => {
        // 401 = visitante; qualquer outra falha também cai na tela de login, onde o erro aparece ao enviar.
        if (ativo) setUsuario(null)
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [])

  useEffect(() => aoNaoAutenticado(() => setUsuario(null)), [])

  // Ao perder a sessão (sair ou 401), descarta os dados em cache: a próxima pessoa no aparelho não os vê.
  // Roda depois do commit, quando as telas protegidas já saíram da árvore e não refazem consultas.
  const teveUsuario = useRef(false)
  useEffect(() => {
    if (usuario !== null) {
      teveUsuario.current = true
    } else if (teveUsuario.current) {
      teveUsuario.current = false
      queryClient.clear()
    }
  }, [usuario, queryClient])

  const auth: Auth = {
    usuario,
    carregando,
    entrar: async (email, senha) => {
      setUsuario(await endpoints.auth.login({ email, senha }))
    },
    entrarComGoogle: async (credential) => {
      setUsuario(await endpoints.auth.google({ credential }))
    },
    cadastrar: async (nome, email, senha) => {
      setUsuario(await endpoints.auth.cadastro({ nome, email, senha }))
    },
    sair: async () => {
      try {
        await endpoints.auth.logout()
      } catch {
        // Cookie já expirado (a API responde 401) ou servidor fora do ar: a pessoa quis sair, então sai
        // do app de qualquer jeito. No segundo caso o cookie segue válido no servidor até expirar.
      }
      setUsuario(null)
    },
    recarregar: async () => {
      setUsuario(await endpoints.auth.me())
    },
  }

  return <AuthContexto value={auth}>{children}</AuthContexto>
}
