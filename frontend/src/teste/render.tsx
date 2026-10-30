import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'

/** Renderiza com roteador em memória e um QueryClient novo (sem retentativas) por chamada; devolve o client. */
export function renderComApp(ui: ReactElement, rota = '/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const resultado = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[rota]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
  return { ...resultado, queryClient }
}
