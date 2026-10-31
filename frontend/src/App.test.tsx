import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { AuthProvider } from './auth/AuthProvider'
import { comSessao, semSessao } from './teste/auth'
import { renderComApp } from './teste/render'

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1280 })
})

function renderizar(rota: string) {
  return renderComApp(
    <AuthProvider>
      <App />
    </AuthProvider>,
    rota,
  )
}

describe('rota inexistente', () => {
  it('logado_mostra_pagina_nao_encontrada_dentro_da_moldura', async () => {
    comSessao()
    renderizar('/rota-que-nao-existe')

    expect(await screen.findByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Menu principal' })).toBeInTheDocument()
  })

  it('o_link_voltar_para_o_inicio_leva_para_a_raiz', async () => {
    comSessao()
    renderizar('/lancamentos/1/algo-que-nao-existe')

    expect(await screen.findByRole('link', { name: 'Voltar para o início' })).toHaveAttribute('href', '/')
  })

  it('visitante_nunca_ve_tela_em_branco_e_cai_no_login', async () => {
    semSessao()
    renderizar('/rota-que-nao-existe')

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
  })
})
