import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { comSessao, usuarioFicticio } from '../teste/auth'
import { instalarGoogleFalso, removerGoogleFalso } from '../teste/google'
import type { ConfiguracaoGoogle } from '../teste/google'
import { renderComApp } from '../teste/render'
import { servidor } from '../teste/servidor'
import { AuthProvider } from './AuthProvider'

function renderizar() {
  return renderComApp(
    <AuthProvider>
      <App />
    </AuthProvider>,
    '/conta/senha',
  )
}

afterEach(() => {
  vi.unstubAllEnvs()
  removerGoogleFalso()
})

/** Conta só-Google: liga o Google falso e devolve quem simula o Google devolvendo a credencial. */
async function prepararGoogle() {
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'cliente-de-teste.apps.googleusercontent.com')
  const { inicializar } = instalarGoogleFalso()
  renderizar()
  await screen.findByTestId('botao-google')
  await waitFor(() => expect(inicializar).toHaveBeenCalled())
  return (credential: string) => {
    const configuracao = inicializar.mock.calls.at(-1)?.[0] as ConfiguracaoGoogle
    configuracao.callback({ credential })
  }
}

const campoNovaSenha = () => screen.getByLabelText('Nova senha')
const campoConfirmacao = () => screen.getByLabelText('Confirmar nova senha')
const salvar = () => screen.getByRole('button', { name: 'Salvar senha' })

describe('DefinirSenhaPage', () => {
  it('quem_ja_tem_senha_informa_a_senha_atual', async () => {
    comSessao({ ...usuarioFicticio, temSenha: true })
    let corpo: unknown
    servidor.use(
      http.put('/api/auth/senha', async ({ request }) => {
        corpo = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderizar()

    await userEvent.type(await screen.findByLabelText('Senha atual'), 'senha-antiga')
    await userEvent.type(campoNovaSenha(), 'senha-nova-123')
    await userEvent.type(campoConfirmacao(), 'senha-nova-123')
    await userEvent.click(salvar())

    expect(await screen.findByRole('status')).toHaveTextContent('Senha alterada.')
    expect(corpo).toEqual({ senhaAtual: 'senha-antiga', senha: 'senha-nova-123' })
  })

  it('conta_so_com_google_nao_pede_senha_atual_e_explica_a_confirmacao_pelo_google', async () => {
    comSessao({ ...usuarioFicticio, temSenha: false })
    await prepararGoogle()

    expect(screen.queryByLabelText('Senha atual')).not.toBeInTheDocument()
    expect(screen.getByText(/Google confirma/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salvar senha' })).not.toBeInTheDocument()
  })

  it('conta_so_com_google_sem_credencial_do_google_nao_envia_nada', async () => {
    comSessao({ ...usuarioFicticio, temSenha: false })
    let chamadas = 0
    servidor.use(
      http.put('/api/auth/senha', () => {
        chamadas += 1
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await prepararGoogle()

    await userEvent.type(campoNovaSenha(), 'senha-nova-123')
    await userEvent.type(campoConfirmacao(), 'senha-nova-123')
    await userEvent.keyboard('{Enter}')

    expect(chamadas).toBe(0)
  })

  it('conta_so_com_google_envia_senha_e_credencial_quando_o_google_devolve', async () => {
    comSessao({ ...usuarioFicticio, temSenha: false })
    let corpo: unknown
    servidor.use(
      http.put('/api/auth/senha', async ({ request }) => {
        corpo = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const devolverCredencial = await prepararGoogle()
    await userEvent.type(campoNovaSenha(), 'senha-nova-123')
    await userEvent.type(campoConfirmacao(), 'senha-nova-123')

    devolverCredencial('id-token-novo')

    expect(await screen.findByText('Senha definida.')).toBeInTheDocument()
    expect(corpo).toEqual({ senha: 'senha-nova-123', credencialGoogle: 'id-token-novo' })
  })

  it('conta_so_com_google_com_senha_invalida_mostra_o_erro_e_nao_envia', async () => {
    comSessao({ ...usuarioFicticio, temSenha: false })
    let chamadas = 0
    servidor.use(
      http.put('/api/auth/senha', () => {
        chamadas += 1
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const devolverCredencial = await prepararGoogle()
    await userEvent.type(campoNovaSenha(), 'curta')
    await userEvent.type(campoConfirmacao(), 'curta')

    devolverCredencial('id-token-novo')

    expect(await screen.findByRole('alert')).toHaveTextContent('A senha deve ter de 8 a 72 caracteres.')
    expect(chamadas).toBe(0)
  })

  it('conta_so_com_google_com_confirmacao_diferente_mostra_o_erro_e_nao_envia', async () => {
    comSessao({ ...usuarioFicticio, temSenha: false })
    let chamadas = 0
    servidor.use(
      http.put('/api/auth/senha', () => {
        chamadas += 1
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const devolverCredencial = await prepararGoogle()
    await userEvent.type(campoNovaSenha(), 'senha-nova-123')
    await userEvent.type(campoConfirmacao(), 'outra-senha-123')

    devolverCredencial('id-token-novo')

    expect(await screen.findByRole('alert')).toHaveTextContent('A confirmação não confere com a nova senha.')
    expect(chamadas).toBe(0)
  })

  it('login_google_invalido_mostra_a_mensagem_e_nao_desloga', async () => {
    comSessao({ ...usuarioFicticio, temSenha: false })
    servidor.use(
      http.put('/api/auth/senha', () => HttpResponse.json({ erro: 'Login Google inválido.' }, { status: 401 })),
    )
    const devolverCredencial = await prepararGoogle()
    await userEvent.type(campoNovaSenha(), 'senha-nova-123')
    await userEvent.type(campoConfirmacao(), 'senha-nova-123')

    devolverCredencial('token-de-outra-conta')

    expect(await screen.findByRole('alert')).toHaveTextContent('Login Google inválido.')
    expect(screen.getByRole('heading', { level: 1, name: 'Definir senha' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Entrar' })).not.toBeInTheDocument()
  })

  it('sessao_perdida_401_nao_autenticado_leva_ao_login', async () => {
    comSessao({ ...usuarioFicticio, temSenha: false })
    servidor.use(
      http.put('/api/auth/senha', () => HttpResponse.json({ erro: 'Não autenticado.' }, { status: 401 })),
    )
    const devolverCredencial = await prepararGoogle()
    await userEvent.type(campoNovaSenha(), 'senha-nova-123')
    await userEvent.type(campoConfirmacao(), 'senha-nova-123')

    devolverCredencial('id-token-novo')

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('conta_com_senha_e_sessao_perdida_401_nao_autenticado_leva_ao_login', async () => {
    comSessao({ ...usuarioFicticio, temSenha: true })
    servidor.use(
      http.put('/api/auth/senha', () => HttpResponse.json({ erro: 'Não autenticado.' }, { status: 401 })),
    )
    renderizar()
    await userEvent.type(await screen.findByLabelText('Senha atual'), 'senha-antiga')
    await userEvent.type(campoNovaSenha(), 'senha-nova-123')
    await userEvent.type(campoConfirmacao(), 'senha-nova-123')
    await userEvent.click(salvar())

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('senha_atual_errada_mostra_a_mensagem_da_api', async () => {
    comSessao()
    servidor.use(
      http.put('/api/auth/senha', () => HttpResponse.json({ erro: 'Senha atual incorreta.' }, { status: 400 })),
    )
    renderizar()

    await userEvent.type(await screen.findByLabelText('Senha atual'), 'errada')
    await userEvent.type(campoNovaSenha(), 'senha-nova-123')
    await userEvent.type(campoConfirmacao(), 'senha-nova-123')
    await userEvent.click(salvar())

    expect(await screen.findByRole('alert')).toHaveTextContent('Senha atual incorreta.')
  })

  it('confirmacao_diferente_e_recusada_sem_chamar_a_api', async () => {
    comSessao({ ...usuarioFicticio, temSenha: true })
    renderizar()

    await userEvent.type(await screen.findByLabelText('Nova senha'), 'senha-nova-123')
    await userEvent.type(campoConfirmacao(), 'outra-senha-123')
    await userEvent.click(salvar())

    expect(await screen.findByRole('alert')).toHaveTextContent('A confirmação não confere com a nova senha.')
  })

  it('senha_nova_fora_de_8_a_72_caracteres_e_recusada_sem_chamar_a_api', async () => {
    comSessao({ ...usuarioFicticio, temSenha: true })
    renderizar()

    await userEvent.type(await screen.findByLabelText('Nova senha'), 'curta')
    await userEvent.type(campoConfirmacao(), 'curta')
    await userEvent.click(salvar())

    expect(await screen.findByRole('alert')).toHaveTextContent('A senha deve ter de 8 a 72 caracteres.')
  })

  it('depois_de_definir_a_primeira_senha_passa_a_pedir_a_senha_atual', async () => {
    comSessao({ ...usuarioFicticio, temSenha: false })
    servidor.use(http.put('/api/auth/senha', () => new HttpResponse(null, { status: 204 })))
    const devolverCredencial = await prepararGoogle()
    await userEvent.type(campoNovaSenha(), 'senha-nova-123')
    await userEvent.type(campoConfirmacao(), 'senha-nova-123')

    // O servidor passa a devolver temSenha=true; a tela recarrega o usuário após salvar.
    comSessao({ ...usuarioFicticio, temSenha: true })
    devolverCredencial('id-token-novo')

    expect(await screen.findByLabelText('Senha atual')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Senha definida.')
  })
})
