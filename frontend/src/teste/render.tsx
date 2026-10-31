import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { BrowserRouter, MemoryRouter } from 'react-router'
import type { InitialEntry } from 'react-router'

function novoQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

/**
 * Renderiza com roteador em memória e um QueryClient novo (sem retentativas) por chamada; devolve o client.
 * `rota` pode levar estado do roteador: `{ pathname: '/confirmar', state: { email } }`.
 */
export function renderComApp(ui: ReactElement, rota: InitialEntry = '/') {
  const queryClient = novoQueryClient()
  const resultado = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[rota]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
  return { ...resultado, queryClient }
}

/**
 * Igual a `renderComApp`, mas com `BrowserRouter` sobre o `window.history` do jsdom (como em produção), para provar o
 * que fica de fato na barra de endereço. `url` inclui a consulta (`/confirmar?token=abc`).
 */
export function renderComBrowserRouter(ui: ReactElement, url = '/') {
  window.history.pushState(null, '', url)
  const queryClient = novoQueryClient()
  const resultado = render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>,
  )
  return { ...resultado, queryClient }
}
