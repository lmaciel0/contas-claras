import { Navigate, Outlet, useLocation } from 'react-router'
import { TelaCarregando } from './TelaAuth'
import { useAuth } from './useAuth'

/**
 * Rotas que nunca viram destino de `voltar`: depois de entrar a pessoa não deve cair direto numa tela destrutiva.
 * É o caso de `/conta/excluir`: ao excluir a conta a sessão é zerada com a pessoa ainda nela, e sem esta regra o
 * redirecionamento levaria `?voltar=%2Fconta%2Fexcluir` (quem se recadastrasse cairia na tela de excluir conta).
 */
const SEM_VOLTAR = ['/conta/excluir']

/** Sem barras finais e em minúsculas: o roteador aceita `/conta/excluir/` e `/Conta/Excluir`, então a comparação também. */
const normalizar = (caminho: string) => caminho.replace(/\/+$/, '').toLowerCase()

/**
 * Rota-layout: só mostra as rotas filhas com sessão. Sem usuário vai para `/login?voltar=<rota>` (só `/login` nas
 * rotas de `SEM_VOLTAR`); é o único ponto que reage à sessão perdida (inclusive por 401 no meio do uso).
 */
export function RotaProtegida() {
  const { usuario, carregando } = useAuth()
  const { pathname, search } = useLocation()

  if (carregando) {
    return <TelaCarregando />
  }
  if (usuario === null) {
    const destino = SEM_VOLTAR.includes(normalizar(pathname)) ? '/login' : `/login?voltar=${encodeURIComponent(pathname + search)}`
    return <Navigate to={destino} replace />
  }
  return <Outlet />
}
