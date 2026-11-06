import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { App } from './App'
import { AuthProvider } from './auth/AuthProvider'
import { LimiteDeErro } from './componentes/LimiteDeErro'
import { instalarRecarregarNoErroDeChunk } from './recarregarNoErroDeChunk'
import { registrarServiceWorker } from './registrarServiceWorker'
import '@fontsource-variable/inter'
import './index.css'

instalarRecarregarNoErroDeChunk()
registrarServiceWorker()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // O cold start da API pode levar ~1 min; o próprio cliente já limita a espera em 90 s.
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LimiteDeErro>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </LimiteDeErro>
  </StrictMode>,
)
