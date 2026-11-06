import { useOutletContext } from 'react-router'

/** O que o AppShell entrega às páginas dentro dele pelo `<Outlet context>` (hoje só a página Mais usa). */
export interface ContextoShell {
  nomeUsuario?: string
  aoSair: () => void
  aoAbrirPreferencias: () => void
}

/** `useOutletContext` tipado. Só funciona dentro de uma rota renderizada pelo AppShell. */
export function useContextoShell(): ContextoShell {
  return useOutletContext<ContextoShell>()
}
