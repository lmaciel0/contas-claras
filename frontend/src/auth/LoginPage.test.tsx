import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { App } from '../App'
import { semSessao, usuarioFicticio } from '../teste/auth'
import { renderComApp } from '../teste/render'
import { servidor } from '../teste/servidor'
import { AuthProvider } from './AuthProvider'

function renderizar(rota = '/login') {
  return renderComApp(
    <AuthProvider>
      <App />
    </AuthProvider>,
    rota,
  )
}

async function preencherEEnviar(email: string, senha: string) {
  await userEvent.type(await screen.findByLabelText('E-mail'), email)
  await userEvent.type(screen.getByLabelText('Senha'), senha)
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('LoginPage', () => {
  it('login_com_sucesso_vai_para_inicio', async () => {
    semSessao()
    let corpo: unknown
    servidor.use(
      http.post('/api/auth/login', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json(usuarioFicticio)
      }),
    )
    renderizar()

    await preencherEEnviar('ana@exemplo.com', 'senha-correta')

    expect(await screen.findByRole('heading', { name: 'Início' })).toBeInTheDocument()
    expect(corpo).toEqual({ email: 'ana@exemplo.com', senha: 'senha-correta' })
    expect(screen.queryByRole('heading', { name: 'Entrar' })).not.toBeInTheDocument()
  })

  it('login_invalido_mostra_mensagem_da_api', async () => {
    const me = semSessao()
    let tentativas = 0
    servidor.use(
      http.post('/api/auth/login', () => {
        tentativas += 1
        return HttpResponse.json({ erro: 'E-mail ou senha inválidos.' }, { status: 401 })
      }),
    )
    renderizar()

    await preencherEEnviar('ana@exemplo.com', 'senha-errada')

    // O 401 do próprio login também aciona o tratador global; a tela fica no login, sem loop e sem redirecionar.
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.')
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@exemplo.com')
    await new Promise((resolver) => setTimeout(resolver, 50))
    expect(tentativas).toBe(1)
    expect(me.chamadas).toBe(1)
  })

  it('mostra_a_mensagem_de_muitas_tentativas', async () => {
    semSessao()
    servidor.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ erro: 'Muitas tentativas. Tente de novo em alguns minutos.' }, { status: 429 }),
      ),
    )
    renderizar()

    await preencherEEnviar('ana@exemplo.com', 'qualquer-coisa')

    expect(await screen.findByRole('alert')).toHaveTextContent('Muitas tentativas. Tente de novo em alguns minutos.')
  })

  it('volta_para_a_rota_pedida_depois_de_entrar', async () => {
    semSessao()
    servidor.use(http.post('/api/auth/login', () => HttpResponse.json(usuarioFicticio)))
    renderizar('/login?voltar=%2Fcartoes')

    await preencherEEnviar('ana@exemplo.com', 'senha-correta')

    expect(await screen.findByRole('heading', { name: 'Cartões' })).toBeInTheDocument()
  })

  it('ignora_voltar_para_outro_site', async () => {
    semSessao()
    servidor.use(http.post('/api/auth/login', () => HttpResponse.json(usuarioFicticio)))
    renderizar('/login?voltar=%2F%2Fmalicioso.example')

    await preencherEEnviar('ana@exemplo.com', 'senha-correta')

    expect(await screen.findByRole('heading', { name: 'Início' })).toBeInTheDocument()
  })

  it.each([
    ['tab', '%2F%09%2Fevil.example'],
    ['quebra de linha', '%2F%0a%2Fevil.example'],
    ['barra invertida', '%2F%5Cevil.example'],
  ])('ignora_voltar_com_%s_escondendo_outro_site', async (_nome, voltar) => {
    semSessao()
    servidor.use(http.post('/api/auth/login', () => HttpResponse.json(usuarioFicticio)))
    renderizar(`/login?voltar=${voltar}`)

    await preencherEEnviar('ana@exemplo.com', 'senha-correta')

    expect(await screen.findByRole('heading', { name: 'Início' })).toBeInTheDocument()
  })

  it('desabilita_o_botao_enquanto_envia', async () => {
    semSessao()
    let liberar: () => void = () => undefined
    const espera = new Promise<void>((resolver) => {
      liberar = resolver
    })
    servidor.use(
      http.post('/api/auth/login', async () => {
        await espera
        return HttpResponse.json(usuarioFicticio)
      }),
    )
    renderizar()

    await preencherEEnviar('ana@exemplo.com', 'senha-correta')

    expect(await screen.findByRole('button', { name: 'Entrando…' })).toBeDisabled()
    liberar()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Início' })).toBeInTheDocument())
  })

  it('tem_link_para_criar_conta_e_o_botao_do_google_some_sem_client_id', async () => {
    semSessao()
    renderizar()

    expect(await screen.findByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/cadastro')
    expect(screen.queryByTestId('botao-google')).not.toBeInTheDocument()
  })

  it('login_tem_link_esqueci_a_senha', async () => {
    semSessao()
    renderizar()

    const link = await screen.findByRole('link', { name: 'Esqueci a senha' })
    expect(link).toHaveAttribute('href', '/esqueci-senha')
    // Logo abaixo do campo de senha e antes do botão Entrar.
    const senha = screen.getByLabelText('Senha')
    const entrar = screen.getByRole('button', { name: 'Entrar' })
    expect(senha.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(link.compareDocumentPosition(entrar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('o_link_esqueci_a_senha_leva_para_a_recuperacao', async () => {
    semSessao()
    renderizar()

    await userEvent.click(await screen.findByRole('link', { name: 'Esqueci a senha' }))

    expect(await screen.findByRole('heading', { name: 'Esqueci a senha' })).toBeInTheDocument()
  })
})
