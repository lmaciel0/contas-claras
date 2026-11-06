import { useOutletContext } from 'react-router'

/** O que o AppShell entrega às páginas dentro dele pelo `<Outlet context>` (hoje só a página Mais usa). */
export interface ContextoShell {
  nomeUsuario?: string
  aoSair: () => void
  aoAbrirPreferencias: () => void
}

/** `useOutletContext` tipado. Só funciona dentro de uma rota renderizada pelo AppShell; fora dele lança erro. */
export function useContextoShell(): ContextoShell {
  const contexto = useOutletContext<ContextoShell | undefined>()
  if (contexto === undefined || contexto === null) {
    throw new Error('useContextoShell precisa estar dentro do AppShell.')
  }
  return contexto
}
