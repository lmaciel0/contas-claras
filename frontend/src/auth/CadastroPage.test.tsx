import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { App } from '../App'
import { semSessao, usuarioFicticio } from '../teste/auth'
import { renderComApp } from '../teste/render'
import { servidor } from '../teste/servidor'
import { AuthProvider } from './AuthProvider'

function renderizar() {
  return renderComApp(
    <AuthProvider>
      <App />
    </AuthProvider>,
    '/cadastro',
  )
}

async function preencher(nome: string, email: string, senha: string) {
  await userEvent.type(await screen.findByLabelText('Nome'), nome)
  await userEvent.type(screen.getByLabelText('E-mail'), email)
  await userEvent.type(screen.getByLabelText('Senha'), senha)
}

const botaoCriar = () => screen.getByRole('button', { name: 'Criar conta' })

describe('CadastroPage', () => {
  it('cadastro_nao_liberado_mostra_mensagem_da_api', async () => {
    const me = semSessao()
    servidor.use(
      http.post('/api/auth/cadastro', () =>
        HttpResponse.json({ erro: 'Não foi possível criar a conta com este e-mail.' }, { status: 403 }),
      ),
    )
    renderizar()

    await preencher('Ana', 'ana@exemplo.com', 'senha-segura')
    await userEvent.click(botaoCriar())

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível criar a conta com este e-mail.')
    expect(screen.getByRole('heading', { name: 'Criar conta' })).toBeInTheDocument()
    expect(me.chamadas).toBe(1)
  })

  it('cadastro_com_sucesso_entra_e_vai_para_inicio', async () => {
    semSessao()
    let corpo: unknown
    servidor.use(
      http.post('/api/auth/cadastro', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json(usuarioFicticio, { status: 201 })
      }),
    )
    renderizar()

    await preencher('Ana', 'ana@exemplo.com', 'senha-segura')
    await userEvent.click(botaoCriar())

    expect(await screen.findByRole('heading', { name: 'Início' })).toBeInTheDocument()
    expect(corpo).toEqual({ nome: 'Ana', email: 'ana@exemplo.com', senha: 'senha-segura' })
  })

  it('senha_curta_e_recusada_sem_chamar_a_api', async () => {
    semSessao() // sem handler de cadastro: qualquer chamada falharia o teste
    renderizar()

    await preencher('Ana', 'ana@exemplo.com', 'curta')
    await userEvent.click(botaoCriar())

    expect(await screen.findByRole('alert')).toHaveTextContent('A senha deve ter de 8 a 72 caracteres.')
  })

  it('tem_link_para_entrar', async () => {
    semSessao()
    renderizar()

    expect(await screen.findByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
  })
})
