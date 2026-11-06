import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes, useLocation, useNavigate } from 'react-router'
import { App } from '../App'
import { ErroApi } from '../api/cliente'
import { endpoints } from '../api/endpoints'
import { comSessao, saudacaoDaTelaInicial, semSessao, usuarioFicticio } from '../teste/auth'
import { renderComApp } from '../teste/render'
import { servidor } from '../teste/servidor'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './useAuth'
import { CHAVE_ULTIMA_ATIVIDADE } from './useTimeoutInatividade'

// Em 1280 px ou mais a sidebar fica fixa e o "Sair" está sempre à mão (abaixo disso ele fica no painel do menu).
beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1280 })
})

afterEach(() => {
  vi.restoreAllMocks()
})

const MENSAGEM_NAO_SAIU = 'Não foi possível sair. Tente de novo.'

function renderizar(rota = '/') {
  return renderComApp(
    <AuthProvider>
      <App />
    </AuthProvider>,
    rota,
  )
}

async function clicarEmSair() {
  await userEvent.click(await screen.findByRole('button', { name: 'Sair' }))
}

describe('AuthProvider', () => {
  it('mostra_o_nome_do_usuario_no_menu_lateral', async () => {
    comSessao()
    renderizar()

    expect(await screen.findByRole('heading', { name: saudacaoDaTelaInicial })).toBeInTheDocument()
    expect(screen.getByTitle('Ana')).toBeInTheDocument()
  })

  it('sair_chama_logout_e_volta_para_o_login', async () => {
    comSessao()
    let saiu = false
    servidor.use(
      http.post('/api/auth/logout', () => {
        saiu = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderizar()

    await clicarEmSair()

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(saiu).toBe(true)
  })

  it('sair_com_cookie_expirado_(401_no_logout)_tambem_desloga', async () => {
    comSessao()
    servidor.use(
      http.post('/api/auth/logout', () => HttpResponse.json({ erro: 'Não autenticado.' }, { status: 401 })),
    )
    renderizar()

    await clicarEmSair()

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('sair_com_erro_500_mantem_logado_e_avisa', async () => {
    comSessao()
    servidor.use(http.post('/api/auth/logout', () => HttpResponse.json({ erro: 'Erro interno.' }, { status: 500 })))
    renderizar()

    await clicarEmSair()

    expect(await screen.findByRole('alert')).toHaveTextContent(MENSAGEM_NAO_SAIU)
    expect(screen.getByRole('heading', { name: saudacaoDaTelaInicial })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Entrar' })).not.toBeInTheDocument()
    expect(screen.getByTitle('Ana')).toBeInTheDocument()
  })

  it('sair_sem_resposta_do_servidor_mantem_logado_e_avisa', async () => {
    comSessao()
    // Falha de rede: depois de 90 s de tentativas o cliente rejeita com ErroApi de status 0.
    vi.spyOn(endpoints.auth, 'logout').mockRejectedValueOnce(new ErroApi(0, 'Servidor não respondeu. Tente de novo.'))
    renderizar()

    await clicarEmSair()

    expect(await screen.findByRole('alert')).toHaveTextContent(MENSAGEM_NAO_SAIU)
    expect(screen.getByRole('heading', { name: saudacaoDaTelaInicial })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Entrar' })).not.toBeInTheDocument()
  })

  it('depois_de_falhar_ao_sair_tenta_de_novo_e_sai', async () => {
    comSessao()
    let chamadas = 0
    servidor.use(
      http.post('/api/auth/logout', () => {
        chamadas += 1
        return chamadas === 1
          ? HttpResponse.json({ erro: 'Erro interno.' }, { status: 500 })
          : new HttpResponse(null, { status: 204 })
      }),
    )
    renderizar()
    await clicarEmSair()
    expect(await screen.findByRole('alert')).toHaveTextContent(MENSAGEM_NAO_SAIU)

    await clicarEmSair() // o menu fecha ao clicar em Sair; reabre para tentar de novo

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(chamadas).toBe(2)
  })

  it('visitante_em_login_ou_cadastro_nao_e_mandado_para_lugar_nenhum', async () => {
    const me = semSessao()
    renderizar('/cadastro')

    expect(await screen.findByRole('heading', { name: 'Criar conta' })).toBeInTheDocument()
    expect(me.chamadas).toBe(1)
  })

  it('usuario_ja_logado_em_login_vai_direto_para_o_inicio', async () => {
    comSessao()
    renderizar('/login')

    expect(await screen.findByRole('heading', { name: saudacaoDaTelaInicial })).toBeInTheDocument()
  })
})

describe('AuthProvider: cadastro por e-mail e recuperação de senha', () => {
  /** Mostra quem está logado e expõe um botão por operação nova de `Auth`. */
  function Sonda() {
    const { usuario, carregando, cadastrar, confirmarCadastro, redefinirSenha } = useAuth()
    if (carregando) {
      return <p>carregando</p>
    }
    return (
      <>
        <p data-testid="quem">{usuario?.nome ?? 'ninguém'}</p>
        <button type="button" onClick={() => void cadastrar('Ana', 'ana@exemplo.com')}>
          cadastrar
        </button>
        <button type="button" onClick={() => void confirmarCadastro({ token: 'abc', senha: 'senha-segura' })}>
          confirmar
        </button>
        <button
          type="button"
          onClick={() => void redefinirSenha({ email: 'ana@exemplo.com', codigo: '123456', senha: 'senha-nova-1' })}
        >
          redefinir
        </button>
      </>
    )
  }

  function renderizarSonda() {
    return renderComApp(
      <AuthProvider>
        <Sonda />
      </AuthProvider>,
    )
  }

  it('cadastrar_nao_define_o_usuario', async () => {
    semSessao()
    let chamadas = 0
    servidor.use(
      http.post('/api/auth/cadastro', () => {
        chamadas += 1
        // Corpo de usuário de propósito: o cadastro por e-mail nunca deve abrir sessão, mesmo que a API devolva um.
        return HttpResponse.json(usuarioFicticio, { status: 202 })
      }),
    )
    renderizarSonda()

    await userEvent.click(await screen.findByRole('button', { name: 'cadastrar' }))

    await vi.waitFor(() => expect(chamadas).toBe(1))
    expect(screen.getByTestId('quem')).toHaveTextContent('ninguém')
  })

  it('confirmar_o_cadastro_define_o_usuario', async () => {
    semSessao()
    servidor.use(http.post('/api/auth/cadastro/confirmar', () => HttpResponse.json(usuarioFicticio, { status: 201 })))
    renderizarSonda()

    await userEvent.click(await screen.findByRole('button', { name: 'confirmar' }))

    expect(await screen.findByText('Ana')).toBeInTheDocument()
  })

  it('redefinir_a_senha_define_o_usuario', async () => {
    semSessao()
    servidor.use(http.post('/api/auth/redefinir-senha', () => HttpResponse.json(usuarioFicticio)))
    renderizarSonda()

    await userEvent.click(await screen.findByRole('button', { name: 'redefinir' }))

    expect(await screen.findByText('Ana')).toBeInTheDocument()
  })
})

describe('AuthProvider: queda por inatividade', () => {
  function LocalAtual() {
    const { pathname, search } = useLocation()
    return <p data-testid="local">{`${pathname}${search}`}</p>
  }

  function renderizarEm(rota: string) {
    return renderComApp(
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LocalAtual />} />
          <Route path="*" element={<p>Tela protegida</p>} />
        </Routes>
      </AuthProvider>,
      rota,
    )
  }

  async function expirarInatividade() {
    // Última atividade há 31 minutos; ao voltar o foco à janela o hook confere e expira a sessão.
    localStorage.setItem(CHAVE_ULTIMA_ATIVIDADE, String(Date.now() - 31 * 60 * 1000))
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
    })
  }

  it('guarda_a_tela_atual_em_voltar', async () => {
    comSessao()
    renderizarEm('/notas')
    await screen.findByText('Tela protegida')

    await expirarInatividade()

    expect(await screen.findByTestId('local')).toHaveTextContent('/login?motivo=inatividade&voltar=%2Fnotas')
  })

  it('em_conta_excluir_nao_guarda_voltar', async () => {
    comSessao()
    renderizarEm('/conta/excluir')
    await screen.findByText('Tela protegida')

    await expirarInatividade()

    expect(await screen.findByTestId('local')).toHaveTextContent(/^\/login\?motivo=inatividade$/)
  })
})

describe('AuthProvider: re-renderização', () => {
  it('consumidor_de_useAuth_nao_re_renderiza_ao_navegar', async () => {
    comSessao()
    let renders = 0
    function Consumidor() {
      const { carregando } = useAuth()
      useEffect(() => {
        renders += 1
      })
      return <p>{carregando ? 'carregando' : 'pronto'}</p>
    }
    function Navegador() {
      const navegar = useNavigate()
      return (
        <button type="button" onClick={() => void navegar('/outra')}>
          ir
        </button>
      )
    }
    renderComApp(
      <AuthProvider>
        <Consumidor />
        <Routes>
          <Route path="*" element={<Navegador />} />
        </Routes>
      </AuthProvider>,
    )
    await screen.findByText('pronto')
    const antes = renders

    await userEvent.click(screen.getByRole('button', { name: 'ir' }))

    expect(renders).toBe(antes)
  })
})
