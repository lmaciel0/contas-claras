import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { AuthProvider } from './auth/AuthProvider'
import { comSessao } from './teste/auth'
import { renderComApp } from './teste/render'

// A página demora a carregar (como um chunk lento): se a rota fosse estática, o módulo já estaria pronto no render.
vi.mock('./paginas/projetos/ProjetosPage', async () => {
  await new Promise((resolver) => setTimeout(resolver, 300))
  return { ProjetosPage: () => <h1>Projetos carregada</h1> }
})

describe('rotas em lazy loading', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1280 })
  })

  it('enquanto_o_chunk_da_pagina_carrega_a_moldura_fica_e_um_status_acessivel_aparece', async () => {
    comSessao()
    renderComApp(
      <AuthProvider>
        <App />
      </AuthProvider>,
      '/projetos',
    )

    expect(await screen.findByRole('navigation', { name: 'Menu principal' })).toBeInTheDocument()
    expect(screen.getByText('Carregando…').closest('[role="status"]')).not.toBeNull()
    expect(screen.queryByRole('heading', { name: 'Projetos carregada' })).not.toBeInTheDocument()

    expect(await screen.findByRole('heading', { name: 'Projetos carregada' })).toBeInTheDocument()
    expect(screen.queryByText('Carregando…')).not.toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Menu principal' })).toBeInTheDocument()
  })
})
