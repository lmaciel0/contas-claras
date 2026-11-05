import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { comSessao, usuarioFicticio } from '../teste/auth'
import { instalarGoogleFalso, removerGoogleFalso } from '../teste/google'
import type { ConfiguracaoGoogle } from '../teste/google'
import { renderComApp, renderComBrowserRouter } from '../teste/render'
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
    '/conta/excluir',
  )
}

const botaoExcluir = () => screen.getByRole('button', { name: 'Excluir minha conta' })
const caixaDeCiencia = () => screen.getByRole('checkbox', { name: 'Entendo que é definitivo' })

describe('ExcluirContaPage', () => {
  it('tem_o_h1_Excluir_conta_e_avisa_o_que_e_apagado', async () => {
    comSessao()
    renderizar()

    expect(await screen.findByRole('heading', { level: 1, name: 'Excluir conta' })).toBeInTheDocument()
    expect(screen.getByText(/definitiva/i)).toBeInTheDocument()
  })

  it('o_botao_fica_desabilitado_ate_marcar_a_ciencia', async () => {
    comSessao()
    renderizar()
    await screen.findByRole('heading', { name: 'Excluir conta' })

    expect(botaoExcluir()).toBeDisabled()

    await userEvent.click(caixaDeCiencia())
    expect(botaoExcluir()).toBeEnabled()

    await userEvent.click(caixaDeCiencia())
    expect(botaoExcluir()).toBeDisabled()
  })

  it('senha_vazia_mostra_erro_e_nao_chama_a_api', async () => {
    comSessao()
    let chamadas = 0
    servidor.use(
      http.delete('/api/auth/conta', () => {
        chamadas += 1
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderizar()
    await screen.findByRole('heading', { name: 'Excluir conta' })

    await userEvent.click(caixaDeCiencia())
    await userEvent.click(botaoExcluir())

    expect(await screen.findByRole('alert')).toHaveTextContent('Informe a sua senha.')
    expect(chamadas).toBe(0)
  })

  it('senha_errada_mostra_a_mensagem_continua_logado_e_nao_navega', async () => {
    comSessao()
    servidor.use(http.delete('/api/auth/conta', () => HttpResponse.json({ erro: 'x' }, { status: 401 })))
    renderizar()
    await userEvent.type(await screen.findByLabelText('Senha'), 'errada')
    await userEvent.click(caixaDeCiencia())

    await userEvent.click(botaoExcluir())

    expect(await screen.findByRole('alert')).toHaveTextContent('Senha incorreta.')
    expect(screen.getByRole('heading', { level: 1, name: 'Excluir conta' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Entrar' })).not.toBeInTheDocument()
  })

  it('sucesso_envia_a_senha_e_navega_para_login', async () => {
    comSessao()
    let corpo: unknown
    servidor.use(
      http.delete('/api/auth/conta', async ({ request }) => {
        corpo = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderizar()
    await userEvent.type(await screen.findByLabelText('Senha'), 'minha-senha')
    await userEvent.click(caixaDeCiencia())

    await userEvent.click(botaoExcluir())

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(corpo).toEqual({ senha: 'minha-senha' })
  })

  it('sucesso_com_BrowserRouter_termina_em_login_sem_voltar', async () => {
    comSessao()
    servidor.use(http.delete('/api/auth/conta', () => new HttpResponse(null, { status: 204 })))
    renderComBrowserRouter(
      <AuthProvider>
        <App />
      </AuthProvider>,
      '/conta/excluir',
    )
    await userEvent.type(await screen.findByLabelText('Senha'), 'minha-senha')
    await userEvent.click(caixaDeCiencia())

    await userEvent.click(botaoExcluir())

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    // Sem `?voltar=%2Fconta%2Fexcluir`: quem se recadastrar e entrar não pode cair direto na tela de excluir conta.
    expect(window.location.pathname).toBe('/login')
    expect(window.location.search).toBe('')
  })

  it('conta_so_google_mostra_o_botao_do_google_em_vez_do_campo_de_senha', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'cliente-de-teste.apps.googleusercontent.com')
    instalarGoogleFalso()
    comSessao({ ...usuarioFicticio, temSenha: false })
    renderizar()

    expect(await screen.findByTestId('botao-google')).toBeInTheDocument()
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Excluir minha conta' })).not.toBeInTheDocument()
  })

  it('conta_so_google_envia_a_credencial_e_navega_para_login', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'cliente-de-teste.apps.googleusercontent.com')
    const { inicializar } = instalarGoogleFalso()
    comSessao({ ...usuarioFicticio, temSenha: false })
    let corpo: unknown
    servidor.use(
      http.delete('/api/auth/conta', async ({ request }) => {
        corpo = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderizar()
    await screen.findByTestId('botao-google')
    await userEvent.click(caixaDeCiencia())
    await waitFor(() => expect(inicializar).toHaveBeenCalled())
    const configuracao = inicializar.mock.calls.at(-1)?.[0] as ConfiguracaoGoogle

    configuracao.callback({ credential: 'id-token-do-google' })

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(corpo).toEqual({ credencialGoogle: 'id-token-do-google' })
  })

  it('o_botao_do_google_fica_inerte_ate_marcar_a_ciencia', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'cliente-de-teste.apps.googleusercontent.com')
    instalarGoogleFalso()
    comSessao({ ...usuarioFicticio, temSenha: false })
    renderizar()
    const botao = await screen.findByTestId('botao-google')

    expect(botao.closest('[inert]')).not.toBeNull()

    await userEvent.click(caixaDeCiencia())

    expect(botao.closest('[inert]')).toBeNull()
  })

  it('google_de_outra_conta_mostra_erro_e_continua_logado', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'cliente-de-teste.apps.googleusercontent.com')
    const { inicializar } = instalarGoogleFalso()
    comSessao({ ...usuarioFicticio, temSenha: false })
    servidor.use(http.delete('/api/auth/conta', () => HttpResponse.json({ erro: 'x' }, { status: 401 })))
    renderizar()
    await screen.findByTestId('botao-google')
    await userEvent.click(caixaDeCiencia())
    await waitFor(() => expect(inicializar).toHaveBeenCalled())
    const configuracao = inicializar.mock.calls.at(-1)?.[0] as ConfiguracaoGoogle

    configuracao.callback({ credential: 'token-de-outra-conta' })

    expect(await screen.findByRole('alert')).toHaveTextContent(/conta Google/i)
    expect(screen.getByRole('heading', { level: 1, name: 'Excluir conta' })).toBeInTheDocument()
  })
})
