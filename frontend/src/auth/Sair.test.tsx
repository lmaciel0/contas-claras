import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { App } from '../App'
import { comSessao } from '../teste/auth'
import { renderComApp } from '../teste/render'
import { servidor } from '../teste/servidor'
import { AuthProvider } from './AuthProvider'

/** `/conta/senha` não faz consultas além de `/me`, então só o logout está em jogo. */
function renderizar() {
  return renderComApp(
    <AuthProvider>
      <App />
    </AuthProvider>,
    '/conta/senha',
  )
}

async function abrirMenuEClicarEmSair() {
  await userEvent.click(await screen.findByRole('button', { name: /Menu do usuário/ }))
  const opcoes = screen.getByRole('group', { name: 'Opções da conta' })
  await userEvent.click(within(opcoes).getByRole('button', { name: 'Sair' }))
}

describe('Sair', () => {
  it('sair_fecha_o_menu_mostra_saindo_e_ignora_clique_repetido', async () => {
    comSessao()
    let liberar: () => void = () => undefined
    const espera = new Promise<void>((resolver) => {
      liberar = resolver
    })
    let chamadas = 0
    servidor.use(
      http.post('/api/auth/logout', async () => {
        chamadas += 1
        await espera
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderizar()

    await abrirMenuEClicarEmSair()

    expect(screen.getByRole('status')).toHaveTextContent('Saindo…')
    expect(screen.getByRole('button', { name: /Menu do usuário/ })).toHaveAttribute('aria-expanded', 'false')

    await abrirMenuEClicarEmSair()

    expect(chamadas).toBe(1)
    liberar()
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('sair_com_falha_mostra_o_erro_e_aceita_novo_clique', async () => {
    comSessao()
    let chamadas = 0
    servidor.use(
      http.post('/api/auth/logout', () => {
        chamadas += 1
        return chamadas === 1
          ? HttpResponse.json({ erro: 'Erro interno.' }, { status: 500 })
          : new HttpResponse(null, { status: 204 })
      }),
    )
    renderizar()

    await abrirMenuEClicarEmSair()

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível sair. Tente de novo.')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    await abrirMenuEClicarEmSair()

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(chamadas).toBe(2)
  })
})
