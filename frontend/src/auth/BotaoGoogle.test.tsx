import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { saudacaoDaTelaInicial, semSessao, usuarioFicticio } from '../teste/auth'
import { instalarGoogleFalso, removerGoogleFalso } from '../teste/google'
import { renderComApp } from '../teste/render'
import { servidor } from '../teste/servidor'
import { AuthProvider } from './AuthProvider'

afterEach(() => {
  vi.unstubAllEnvs()
  removerGoogleFalso()
})

function renderizar() {
  return renderComApp(
    <AuthProvider>
      <App />
    </AuthProvider>,
    '/login',
  )
}

describe('BotaoGoogle', () => {
  it('sem_client_id_nao_aparece_e_nao_carrega_o_script', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '')
    semSessao()
    renderizar()

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.queryByTestId('botao-google')).not.toBeInTheDocument()
    expect(document.querySelector('script[src*="accounts.google.com"]')).toBeNull()
  })

  it('com_client_id_inicializa_o_google_e_desenha_o_botao', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'cliente-de-teste.apps.googleusercontent.com')
    const { inicializar, desenharBotao } = instalarGoogleFalso()
    semSessao()
    renderizar()

    await waitFor(() => expect(desenharBotao).toHaveBeenCalledTimes(1))
    expect(inicializar).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'cliente-de-teste.apps.googleusercontent.com' }),
    )
    expect(screen.getByTestId('botao-google')).toBeInTheDocument()
  })

  it('renderiza_o_icone_redondo', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'cliente-de-teste.apps.googleusercontent.com')
    const { desenharBotao } = instalarGoogleFalso()
    semSessao()
    renderizar()

    await waitFor(() => expect(desenharBotao).toHaveBeenCalledTimes(1))
    expect(desenharBotao).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ type: 'icon', shape: 'circle', theme: 'outline', size: 'large' }),
    )
  })

  it('o_callback_envia_a_credential_para_a_api_e_entra', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'cliente-de-teste.apps.googleusercontent.com')
    const { inicializar } = instalarGoogleFalso()
    semSessao()
    let corpo: unknown
    servidor.use(
      http.post('/api/auth/google', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json(usuarioFicticio)
      }),
    )
    renderizar()
    await waitFor(() => expect(inicializar).toHaveBeenCalled())

    inicializar.mock.calls[0]?.[0].callback({ credential: 'token-fictício' })

    expect(await screen.findByRole('heading', { name: saudacaoDaTelaInicial })).toBeInTheDocument()
    expect(corpo).toEqual({ credential: 'token-fictício' })
  })

  it('google_nao_liberado_mostra_a_mensagem_da_api', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'cliente-de-teste.apps.googleusercontent.com')
    const { inicializar } = instalarGoogleFalso()
    semSessao()
    servidor.use(
      http.post('/api/auth/google', () =>
        HttpResponse.json({ erro: 'Não foi possível criar a conta com este e-mail.' }, { status: 403 }),
      ),
    )
    renderizar()
    await waitFor(() => expect(inicializar).toHaveBeenCalled())

    inicializar.mock.calls[0]?.[0].callback({ credential: 'token-fictício' })

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível criar a conta com este e-mail.')
  })
})
