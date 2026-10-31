import { Navigate, Outlet, useLocation } from 'react-router'
import { TelaCarregando } from './TelaAuth'
import { useAuth } from './useAuth'

/**
 * Rota-layout: só mostra as rotas filhas com sessão. Sem usuário vai para `/login?voltar=<rota>`;
 * é o único ponto que reage à sessão perdida (inclusive por 401 no meio do uso).
 */
export function RotaProtegida() {
  const { usuario, carregando } = useAuth()
  const { pathname, search } = useLocation()

  if (carregando) {
    return <TelaCarregando />
  }
  if (usuario === null) {
    return <Navigate to={`/login?voltar=${encodeURIComponent(pathname + search)}`} replace />
  }
  return <Outlet />
}
