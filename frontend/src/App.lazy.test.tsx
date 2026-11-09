import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { AuthProvider } from './auth/AuthProvider'
import { comSessao } from './teste/auth'
import { renderComApp } from './teste/render'

// A página demora a carregar (como um chunk lento): se a rota fosse estática, o módulo já estaria pronto no render.
vi.mock('./paginas/notas/NotasPage', async () => {
  await new Promise((resolver) => setTimeout(resolver, 300))
  return { NotasPage: () => <h1>Notas carregada</h1> }
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
      '/notas',
    )

    expect(await screen.findByRole('navigation', { name: 'Menu principal' })).toBeInTheDocument()
    expect(screen.getByText('Carregando…').closest('[role="status"]')).not.toBeNull()
    expect(screen.queryByRole('heading', { name: 'Notas carregada' })).not.toBeInTheDocument()

    expect(await screen.findByRole('heading', { name: 'Notas carregada' })).toBeInTheDocument()
    expect(screen.queryByText('Carregando…')).not.toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Menu principal' })).toBeInTheDocument()
  })
})
