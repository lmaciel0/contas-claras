import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { AuthProvider } from './auth/AuthProvider'
import { comSessao } from './teste/auth'
import { renderComApp } from './teste/render'

// Simula o chunk que sumiu depois de um deploy: o import da página rejeita.
vi.mock('./paginas/projetos/ProjetosPage', () => {
  throw new Error('Failed to fetch dynamically imported module')
})

describe('falha ao carregar o chunk de uma rota', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1280 })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('mostra_alerta_com_recarregar_e_a_moldura_continua', async () => {
    comSessao()
    renderComApp(
      <AuthProvider>
        <App />
      </AuthProvider>,
      '/projetos',
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar esta tela')
    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Menu principal' })).toBeInTheDocument()
  })
})
