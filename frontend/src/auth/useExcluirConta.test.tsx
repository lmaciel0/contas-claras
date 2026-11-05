import { useQueryClient } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { comSessao } from '../teste/auth'
import { renderComApp } from '../teste/render'
import { servidor } from '../teste/servidor'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './useAuth'
import { useExcluirConta } from './useExcluirConta'

function TelaDeLogin() {
  const { pathname, search } = useLocation()
  return <p data-testid="login">{`Tela de login ${pathname}${search}`}</p>
}

/** Botão que dispara a exclusão com `{ senha }`; mostra o usuário da sessão e o erro, se houver. */
function Sonda() {
  const { usuario } = useAuth()
  const queryClient = useQueryClient()
  const excluir = useExcluirConta()
  return (
    <div>
      <p data-testid="usuario">{usuario?.nome ?? 'ninguem'}</p>
      <p data-testid="erro">{excluir.error?.message ?? ''}</p>
      <p data-testid="cache">{String(queryClient.getQueryData(['dado-do-usuario']) ?? 'vazio')}</p>
      <button onClick={() => excluir.mutate({ senha: 'minha-senha' })}>excluir</button>
    </div>
  )
}

function renderizar() {
  const resultado = renderComApp(
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<TelaDeLogin />} />
        <Route path="*" element={<Sonda />} />
      </Routes>
    </AuthProvider>,
    '/conta/excluir',
  )
  resultado.queryClient.setQueryData(['dado-do-usuario'], 'dados')
  return resultado
}

describe('useExcluirConta', () => {
  it('chama_DELETE_conta_com_o_corpo_recebido', async () => {
    comSessao()
    let corpo: unknown
    let metodo = ''
    servidor.use(
      http.delete('/api/auth/conta', async ({ request }) => {
        metodo = request.method
        corpo = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'excluir' }))

    expect(await screen.findByTestId('login')).toBeInTheDocument()
    expect(metodo).toBe('DELETE')
    expect(corpo).toEqual({ senha: 'minha-senha' })
  })

  it('em_sucesso_limpa_o_cache_e_o_estado_de_auth_e_vai_para_login', async () => {
    comSessao()
    servidor.use(http.delete('/api/auth/conta', () => new HttpResponse(null, { status: 204 })))
    const { queryClient } = renderizar()
    expect(await screen.findByTestId('usuario')).toHaveTextContent('Ana')

    await userEvent.click(screen.getByRole('button', { name: 'excluir' }))

    // Exatamente `/login`: sem `?voltar=/conta/excluir`, que a RotaProtegida poria ao ver a sessão zerada.
    expect(await screen.findByTestId('login')).toHaveTextContent(/^Tela de login \/login$/)
    expect(queryClient.getQueryData(['dado-do-usuario'])).toBeUndefined()
  })

  it('em_401_expoe_o_erro_e_nao_derruba_a_sessao', async () => {
    comSessao()
    servidor.use(
      http.delete('/api/auth/conta', () => HttpResponse.json({ erro: 'Senha incorreta.' }, { status: 401 })),
    )
    renderizar()
    expect(await screen.findByTestId('usuario')).toHaveTextContent('Ana')

    await userEvent.click(screen.getByRole('button', { name: 'excluir' }))

    expect(await screen.findByTestId('erro')).toHaveTextContent('Senha incorreta.')
    expect(screen.getByTestId('usuario')).toHaveTextContent('Ana')
    expect(screen.getByTestId('cache')).toHaveTextContent('dados')
    expect(screen.queryByTestId('login')).not.toBeInTheDocument()
  })
})
