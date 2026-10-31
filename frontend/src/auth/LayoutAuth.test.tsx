/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Link, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { semSessao } from '../teste/auth'
import { instalarGoogleFalso, removerGoogleFalso } from '../teste/google'
import { renderComApp } from '../teste/render'
import { servidor } from '../teste/servidor'
import { AuthProvider } from './AuthProvider'
import { LayoutAuth } from './LayoutAuth'

// O Vitest roda com `css: false`, que esvazia `import '...css?raw'`; por isso o arquivo é lido direto.
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

const CLIENT_ID = 'cliente-de-teste.apps.googleusercontent.com'

afterEach(() => {
  vi.unstubAllEnvs()
  removerGoogleFalso()
})

/** Telas stub: o layout é testado sem as páginas reais, só com links entre as quatro rotas de auth. */
function renderizar(rota: string) {
  return renderComApp(
    <AuthProvider>
      <Routes>
        <Route element={<LayoutAuth />}>
          <Route
            path="/login"
            element={
              <>
                <h1>Entrar</h1>
                <Link to="/cadastro">ir para cadastro</Link>
              </>
            }
          />
          <Route
            path="/cadastro"
            element={
              <>
                <h1>Criar conta</h1>
                <Link to="/login">voltar para login</Link>
              </>
            }
          />
          <Route path="/confirmar" element={<h1>Confirmar</h1>} />
          <Route path="/esqueci-senha" element={<h1>Esqueci a senha</h1>} />
        </Route>
      </Routes>
    </AuthProvider>,
    rota,
  )
}

const areaAnimada = () => screen.getByTestId('area-animada')

describe('LayoutAuth: animação', () => {
  it('avancar_de_login_para_cadastro_anima_para_a_direita', async () => {
    semSessao()
    renderizar('/login')
    await userEvent.click(await screen.findByRole('link', { name: 'ir para cadastro' }))

    expect(await screen.findByRole('heading', { name: 'Criar conta' })).toBeInTheDocument()
    expect(areaAnimada()).toHaveClass('auth-entra-direita')
    expect(areaAnimada()).not.toHaveClass('auth-entra-esquerda')
  })

  it('voltar_de_cadastro_para_login_anima_para_a_esquerda', async () => {
    semSessao()
    renderizar('/cadastro')
    await userEvent.click(await screen.findByRole('link', { name: 'voltar para login' }))

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(areaAnimada()).toHaveClass('auth-entra-esquerda')
    expect(areaAnimada()).not.toHaveClass('auth-entra-direita')
  })

  it('primeira_tela_nao_anima', async () => {
    semSessao()
    renderizar('/login')

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(areaAnimada()).not.toHaveClass('auth-entra-direita')
    expect(areaAnimada()).not.toHaveClass('auth-entra-esquerda')
  })

  it('a_direcao_nao_some_quando_a_mesma_tela_renderiza_de_novo', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', CLIENT_ID)
    const { inicializar } = instalarGoogleFalso()
    semSessao()
    servidor.use(http.post('/api/auth/google', () => HttpResponse.json({ erro: 'Falhou.' }, { status: 403 })))
    renderizar('/login')
    await userEvent.click(await screen.findByRole('link', { name: 'ir para cadastro' }))
    await screen.findByRole('heading', { name: 'Criar conta' })

    inicializar.mock.calls[0]?.[0].callback({ credential: 'x' }) // muda o estado do layout, sem mudar de rota

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(areaAnimada()).toHaveClass('auth-entra-direita')
  })

  it('css_desliga_a_animacao_com_reduced_motion', () => {
    expect(css).toMatch(/prefers-reduced-motion[\s\S]*auth-entra/)
  })
})

describe('LayoutAuth: Google', () => {
  it('google_aparece_em_login_e_cadastro_e_nao_em_confirmar', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', CLIENT_ID)
    instalarGoogleFalso()
    semSessao()
    renderizar('/login')

    expect(await screen.findByTestId('botao-google')).toBeInTheDocument()
    expect(screen.getByText('ou continue com')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('link', { name: 'ir para cadastro' }))
    expect(await screen.findByRole('heading', { name: 'Criar conta' })).toBeInTheDocument()
    expect(screen.getByTestId('botao-google')).toBeInTheDocument()
  })

  it('google_nao_aparece_em_confirmar_nem_em_esqueci_senha', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', CLIENT_ID)
    instalarGoogleFalso()
    semSessao()
    renderizar('/confirmar')

    expect(await screen.findByRole('heading', { name: 'Confirmar' })).toBeInTheDocument()
    expect(screen.queryByTestId('botao-google')).not.toBeInTheDocument()
    expect(screen.queryByText('ou continue com')).not.toBeInTheDocument()
  })

  it('o_botao_nao_e_reinicializado_ao_trocar_de_login_para_cadastro', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', CLIENT_ID)
    const { inicializar, desenharBotao } = instalarGoogleFalso()
    semSessao()
    renderizar('/login')
    await waitFor(() => expect(desenharBotao).toHaveBeenCalledTimes(1))

    await userEvent.click(screen.getByRole('link', { name: 'ir para cadastro' }))
    await screen.findByRole('heading', { name: 'Criar conta' })

    expect(inicializar).toHaveBeenCalledTimes(1)
    expect(desenharBotao).toHaveBeenCalledTimes(1)
  })

  it('sem_client_id_nao_mostra_o_texto_ou_continue_com', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '')
    semSessao()
    renderizar('/login')

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.queryByText('ou continue com')).not.toBeInTheDocument()
    expect(screen.queryByTestId('botao-google')).not.toBeInTheDocument()
  })

  it('erro_do_google_aparece_no_card', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', CLIENT_ID)
    const { inicializar } = instalarGoogleFalso()
    semSessao()
    servidor.use(
      http.post('/api/auth/google', () =>
        HttpResponse.json({ erro: 'Não foi possível entrar com o Google.' }, { status: 403 }),
      ),
    )
    renderizar('/login')
    await waitFor(() => expect(inicializar).toHaveBeenCalled())

    inicializar.mock.calls[0]?.[0].callback({ credential: 'token-fictício' })

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível entrar com o Google.')
  })
})
