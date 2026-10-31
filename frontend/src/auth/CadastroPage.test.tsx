import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { App } from '../App'
import { semSessao } from '../teste/auth'
import { renderComBrowserRouter } from '../teste/render'
import { servidor } from '../teste/servidor'
import { AuthProvider } from './AuthProvider'

function renderizar() {
  return renderComBrowserRouter(
    <AuthProvider>
      <App />
    </AuthProvider>,
    '/cadastro',
  )
}

async function preencher(nome: string, email: string, senha: string, repetir = senha) {
  await userEvent.type(await screen.findByLabelText('Nome'), nome)
  await userEvent.type(screen.getByLabelText('E-mail'), email)
  await userEvent.type(screen.getByLabelText('Senha'), senha)
  await userEvent.type(screen.getByLabelText('Repetir senha'), repetir)
}

const botaoCriar = () => screen.getByRole('button', { name: 'Criar conta' })

describe('CadastroPage', () => {
  it('muitos_pedidos_mostra_a_mensagem_da_api', async () => {
    const me = semSessao()
    servidor.use(
      http.post('/api/auth/cadastro', () =>
        HttpResponse.json({ erro: 'Muitos pedidos agora. Tente de novo mais tarde.' }, { status: 429 }),
      ),
    )
    renderizar()

    await preencher('Ana', 'ana@exemplo.com', 'senha-segura')
    await userEvent.click(botaoCriar())

    expect(await screen.findByRole('alert')).toHaveTextContent('Muitos pedidos agora. Tente de novo mais tarde.')
    expect(screen.getByRole('heading', { name: 'Criar conta' })).toBeInTheDocument()
    expect(botaoCriar()).toBeEnabled()
    expect(me.chamadas).toBe(1)
  })

  it('sucesso_vai_para_confirmar_com_o_email_preenchido_e_fora_da_url', async () => {
    semSessao()
    let corpo: unknown
    servidor.use(
      http.post('/api/auth/cadastro', async ({ request }) => {
        corpo = await request.json()
        return new HttpResponse(null, { status: 202 })
      }),
    )
    renderizar()

    await preencher('Ana', 'ana@exemplo.com', 'senha-segura')
    await userEvent.click(botaoCriar())

    expect(await screen.findByRole('heading', { name: 'Confirme seu e-mail' })).toBeInTheDocument()
    expect(corpo).toEqual({ nome: 'Ana', email: 'ana@exemplo.com', senha: 'senha-segura' })
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@exemplo.com')
    expect(screen.getByText(/Enviamos um e-mail para ana@exemplo\.com\./)).toBeInTheDocument()
    expect(window.location.pathname).toBe('/confirmar')
    expect(window.location.search).toBe('')
    expect(window.location.href).not.toContain('exemplo')
  })

  it('senhas_diferentes_bloqueiam_o_envio', async () => {
    semSessao() // sem handler de cadastro: qualquer chamada falharia o teste
    renderizar()

    await preencher('Ana', 'ana@exemplo.com', 'senha-segura', 'senha-segurA')
    await userEvent.click(botaoCriar())

    expect(await screen.findByRole('alert')).toHaveTextContent('As senhas não são iguais.')
    expect(screen.getByRole('heading', { name: 'Criar conta' })).toBeInTheDocument()
  })

  it('senha_curta_e_recusada_sem_chamar_a_api', async () => {
    semSessao()
    renderizar()

    await preencher('Ana', 'ana@exemplo.com', 'curta')
    await userEvent.click(botaoCriar())

    expect(await screen.findByRole('alert')).toHaveTextContent('A senha deve ter de 8 a 72 caracteres.')
  })

  it('botao_mostra_espera_e_nao_envia_de_novo', async () => {
    semSessao()
    let liberar: () => void = () => undefined
    const espera = new Promise<void>((resolver) => {
      liberar = resolver
    })
    let chamadas = 0
    servidor.use(
      http.post('/api/auth/cadastro', async () => {
        chamadas += 1
        await espera
        return new HttpResponse(null, { status: 202 })
      }),
    )
    renderizar()
    await preencher('Ana', 'ana@exemplo.com', 'senha-segura')

    await userEvent.click(botaoCriar())

    const enviando = await screen.findByRole('button', { name: 'Enviando…' })
    expect(enviando).toBeDisabled()
    await userEvent.click(enviando)
    await userEvent.type(screen.getByLabelText('Repetir senha'), '{Enter}')
    liberar()
    expect(await screen.findByRole('heading', { name: 'Confirme seu e-mail' })).toBeInTheDocument()
    expect(chamadas).toBe(1)
  })

  it('tem_link_para_entrar', async () => {
    semSessao()
    renderizar()

    expect(await screen.findByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
  })
})
