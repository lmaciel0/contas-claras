import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { App } from '../App'
import { comSessao, usuarioFicticio } from '../teste/auth'
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

  it('conta_so_com_google_nao_pede_senha_atual', async () => {
    comSessao({ ...usuarioFicticio, temSenha: false })
    let corpo: unknown
    servidor.use(
      http.put('/api/auth/senha', async ({ request }) => {
        corpo = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderizar()

    await userEvent.type(await screen.findByLabelText('Nova senha'), 'senha-nova-123')
    await userEvent.type(campoConfirmacao(), 'senha-nova-123')
    expect(screen.queryByLabelText('Senha atual')).not.toBeInTheDocument()
    await userEvent.click(salvar())

    expect(await screen.findByRole('status')).toHaveTextContent('Senha definida.')
    expect(corpo).toEqual({ senha: 'senha-nova-123' })
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
    comSessao({ ...usuarioFicticio, temSenha: false })
    renderizar()

    await userEvent.type(await screen.findByLabelText('Nova senha'), 'senha-nova-123')
    await userEvent.type(campoConfirmacao(), 'outra-senha-123')
    await userEvent.click(salvar())

    expect(await screen.findByRole('alert')).toHaveTextContent('A confirmação não confere com a nova senha.')
  })

  it('senha_nova_fora_de_8_a_72_caracteres_e_recusada_sem_chamar_a_api', async () => {
    comSessao({ ...usuarioFicticio, temSenha: false })
    renderizar()

    await userEvent.type(await screen.findByLabelText('Nova senha'), 'curta')
    await userEvent.type(campoConfirmacao(), 'curta')
    await userEvent.click(salvar())

    expect(await screen.findByRole('alert')).toHaveTextContent('A senha deve ter de 8 a 72 caracteres.')
  })

  it('depois_de_definir_a_primeira_senha_passa_a_pedir_a_senha_atual', async () => {
    comSessao({ ...usuarioFicticio, temSenha: false })
    servidor.use(http.put('/api/auth/senha', () => new HttpResponse(null, { status: 204 })))
    renderizar()
    await userEvent.type(await screen.findByLabelText('Nova senha'), 'senha-nova-123')
    await userEvent.type(campoConfirmacao(), 'senha-nova-123')

    // O servidor passa a devolver temSenha=true; a tela recarrega o usuário após salvar.
    comSessao({ ...usuarioFicticio, temSenha: true })
    await userEvent.click(salvar())

    expect(await screen.findByLabelText('Senha atual')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Senha definida.')
  })
})
