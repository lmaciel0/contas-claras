import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { endpoints } from '../api/endpoints'
import type { ExcluirContaRequest } from '../api/tipos'
import { ehSessaoPerdida } from './sessaoPerdida'
import { useAuth } from './useAuth'

/**
 * Exclui a conta e todos os dados dela (`DELETE /api/auth/conta`), com reautenticação: `{ senha }` ou, para conta sem
 * senha, `{ credencialGoogle }`. Em sucesso o servidor já expirou o cookie: descarta o cache de consultas e a sessão
 * no front e leva a `/login`. Senha errada (401) só rejeita com `ErroApi`: não derruba a sessão (ver `semLogoutEm401`),
 * a tela segue aberta para a pessoa tentar de novo. Exceção: 401 "Não autenticado." é sessão perdida e zera a sessão.
 */
export function useExcluirConta() {
  const queryClient = useQueryClient()
  const navegar = useNavigate()
  const { limparSessao } = useAuth()

  return useMutation<void, Error, ExcluirContaRequest>({
    mutationFn: (pedido) => endpoints.auth.excluirConta(pedido),
    onSuccess: () => {
      queryClient.clear()
      // Com a sessão zerada a `RotaProtegida` também leva a `/login` (sem `voltar` em `/conta/excluir`); o `navegar`
      // garante o destino mesmo se esta página sair de baixo dela.
      navegar('/login', { replace: true })
      limparSessao()
    },
    // 401 "Não autenticado." = sessão vencida (≠ senha/Google errados): zera a sessão e a `RotaProtegida` leva a `/login`.
    onError: (erro) => {
      if (ehSessaoPerdida(erro)) {
        limparSessao()
      }
    },
  })
}
