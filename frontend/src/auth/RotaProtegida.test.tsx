import { useQuery } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { Route, Routes, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { api } from '../api/cliente'
import { comSessao, semSessao } from '../teste/auth'
import { renderComApp } from '../teste/render'
import { servidor } from '../teste/servidor'
import { AuthProvider } from './AuthProvider'
import { LoginPage } from './LoginPage'
import { RotaProtegida } from './RotaProtegida'

function LocalAtual() {
  const { pathname, search } = useLocation()
  return <p data-testid="local">{`${pathname}${search}`}</p>
}

function renderizar(rota: string, filho = <p>Conteúdo protegido</p>) {
  return renderComApp(
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LocalAtual />} />
        <Route element={<RotaProtegida />}>
          <Route path="/cartoes" element={filho} />
        </Route>
      </Routes>
    </AuthProvider>,
    rota,
  )
}

describe('RotaProtegida', () => {
  it('rota_protegida_sem_sessao_redireciona_para_login', async () => {
    semSessao()
    renderizar('/cartoes?ano=2026&mes=10')

    expect(await screen.findByTestId('local')).toHaveTextContent('/login?voltar=%2Fcartoes%3Fano%3D2026%26mes%3D10')
    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument()
  })

  it('com_sessao_mostra_o_conteudo', async () => {
    comSessao()
    renderizar('/cartoes')

    expect(await screen.findByText('Conteúdo protegido')).toBeInTheDocument()
  })

  it('enquanto_confere_a_sessao_mostra_carregando_e_nao_redireciona', async () => {
    servidor.use(
      http.get('/api/auth/me', async () => {
        await delay(30)
        return HttpResponse.json({ id: 1, nome: 'Ana', email: 'ana@exemplo.com', temSenha: true })
      }),
    )
    renderizar('/cartoes')

    expect(screen.getByRole('status')).toHaveTextContent('Carregando…')
    expect(screen.queryByTestId('local')).not.toBeInTheDocument()
    expect(await screen.findByText('Conteúdo protegido')).toBeInTheDocument()
  })

  it('sessao_expirada_em_chamada_qualquer_volta_para_login_sem_loop', async () => {
    const me = comSessao()
    let chamadasAoResumo = 0
    servidor.use(
      http.get('/api/resumo', () => {
        chamadasAoResumo += 1
        return HttpResponse.json({ erro: 'Não autenticado.' }, { status: 401 })
      }),
    )
    function PaginaQueConsultaOResumo() {
      const consulta = useQuery({ queryKey: ['resumo'], queryFn: () => api('/api/resumo') })
      return <p>{consulta.isPending ? 'Buscando resumo' : 'Resumo pronto'}</p>
    }
    renderComApp(
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RotaProtegida />}>
            <Route path="/cartoes" element={<PaginaQueConsultaOResumo />} />
          </Route>
        </Routes>
      </AuthProvider>,
      '/cartoes',
    )

    // A sessão cai no meio do uso: a tela de login aparece (nunca uma tela em branco) ...
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: 'Entrar' })).toHaveLength(1)

    // ... e nada fica em loop: deixa o tempo passar e conta as chamadas.
    await new Promise((resolver) => setTimeout(resolver, 200))
    expect(screen.getAllByRole('heading', { name: 'Entrar' })).toHaveLength(1)
    expect(chamadasAoResumo).toBe(1)
    expect(me.chamadas).toBeLessThanOrEqual(2)
  })
})
