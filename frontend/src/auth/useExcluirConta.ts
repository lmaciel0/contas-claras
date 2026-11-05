import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { endpoints } from '../api/endpoints'
import type { ExcluirContaRequest } from '../api/tipos'
import { useAuth } from './useAuth'

/**
 * Exclui a conta e todos os dados dela (`DELETE /api/auth/conta`), com reautenticação: `{ senha }` ou, para conta sem
 * senha, `{ credencialGoogle }`. Em sucesso o servidor já expirou o cookie: descarta o cache de consultas e a sessão
 * no front e leva a `/login`. Senha errada (401) só rejeita com `ErroApi`: não derruba a sessão (ver `semLogoutEm401`),
 * a tela segue aberta para a pessoa tentar de novo.
 */
export function useExcluirConta() {
  const queryClient = useQueryClient()
  const navegar = useNavigate()
  const { limparSessao } = useAuth()

  return useMutation<void, Error, ExcluirContaRequest>({
    mutationFn: (pedido) => endpoints.auth.excluirConta(pedido),
    onSuccess: () => {
      queryClient.clear()
      // Navega antes de zerar a sessão: com `usuario === null` a RotaProtegida mandaria a `/login?voltar=...`.
      navegar('/login', { replace: true })
      limparSessao()
    },
  })
}
