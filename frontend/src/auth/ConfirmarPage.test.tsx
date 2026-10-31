import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { comSessao, semSessao, usuarioFicticio } from '../teste/auth'
import { renderComApp, renderComBrowserRouter } from '../teste/render'
import { servidor } from '../teste/servidor'
import { AuthProvider } from './AuthProvider'

const INVALIDO = 'Código inválido ou expirado.'

afterEach(() => {
  vi.useRealTimers()
})

function app() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  )
}

/** Chega em `/confirmar` como depois do cadastro: com o e-mail no estado da rota. */
function renderizarComEmail(email = 'ana@exemplo.com') {
  return renderComApp(app(), { pathname: '/confirmar', state: { email } })
}

/** Registra o handler de confirmação e devolve o que ele recebeu. */
function aceitarConfirmacao() {
  const recebido: { corpo?: unknown; chamadas: number } = { chamadas: 0 }
  servidor.use(
    http.post('/api/auth/cadastro/confirmar', async ({ request }) => {
      recebido.chamadas += 1
      recebido.corpo = await request.json()
      return HttpResponse.json(usuarioFicticio, { status: 201 })
    }),
  )
  return recebido
}

function recusarConfirmacao() {
  servidor.use(
    http.post('/api/auth/cadastro/confirmar', () => HttpResponse.json({ erro: INVALIDO }, { status: 400 })),
  )
}

const campoCodigo = () => screen.getByLabelText('Código')
const botaoConfirmar = () => screen.getByRole('button', { name: 'Confirmar' })

describe('ConfirmarPage com código', () => {
  it('codigo_certo_entra_no_app', async () => {
    semSessao()
    const recebido = aceitarConfirmacao()
    renderizarComEmail()

    await userEvent.type(await screen.findByLabelText('Código'), '123456')
    await userEvent.click(botaoConfirmar())

    expect(await screen.findByRole('heading', { name: 'Início' })).toBeInTheDocument()
    expect(recebido.corpo).toEqual({ email: 'ana@exemplo.com', codigo: '123456' })
  })

  it('codigo_colado_com_espacos_envia_so_os_digitos', async () => {
    semSessao()
    const recebido = aceitarConfirmacao()
    renderizarComEmail()

    await userEvent.click(await screen.findByLabelText('Código'))
    await userEvent.paste('123 456')
    await userEvent.click(botaoConfirmar())

    expect(await screen.findByRole('heading', { name: 'Início' })).toBeInTheDocument()
    expect(recebido.corpo).toEqual({ email: 'ana@exemplo.com', codigo: '123456' })
  })

  it('codigo_incompleto_avisa_sem_chamar_a_api', async () => {
    semSessao() // sem handler de confirmação: qualquer chamada falharia o teste
    renderizarComEmail()

    await userEvent.type(await screen.findByLabelText('Código'), '12345')
    await userEvent.click(botaoConfirmar())

    expect(await screen.findByRole('alert')).toHaveTextContent('Digite os 6 dígitos do código.')
  })

  it('codigo_errado_mostra_a_mensagem_da_api', async () => {
    semSessao()
    recusarConfirmacao()
    renderizarComEmail()

    await userEvent.type(await screen.findByLabelText('Código'), '000000')
    await userEvent.click(botaoConfirmar())

    expect(await screen.findByRole('alert')).toHaveTextContent(INVALIDO)
    expect(botaoConfirmar()).toBeEnabled()
    expect(campoCodigo()).toHaveValue('000000')
  })

  it('o_campo_de_codigo_aceita_teclado_numerico_e_preenchimento_automatico', async () => {
    semSessao()
    renderizarComEmail()

    expect(await screen.findByLabelText('Código')).toHaveAttribute('inputmode', 'numeric')
    expect(campoCodigo()).toHaveAttribute('autocomplete', 'one-time-code')
  })

  it('mostra_o_email_e_o_aviso_do_spam', async () => {
    semSessao()
    renderizarComEmail()

    expect(
      await screen.findByText('Enviamos um e-mail para ana@exemplo.com. Confira também o spam.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@exemplo.com')
  })

  it('botao_mostra_espera_e_nao_envia_de_novo', async () => {
    semSessao()
    let liberar: () => void = () => undefined
    const espera = new Promise<void>((resolver) => {
      liberar = resolver
    })
    let chamadas = 0
    servidor.use(
      http.post('/api/auth/cadastro/confirmar', async () => {
        chamadas += 1
        await espera
        return HttpResponse.json(usuarioFicticio, { status: 201 })
      }),
    )
    renderizarComEmail()

    await userEvent.type(await screen.findByLabelText('Código'), '123456')
    await userEvent.click(botaoConfirmar())

    const confirmando = await screen.findByRole('button', { name: 'Confirmando…' })
    expect(confirmando).toBeDisabled()
    await userEvent.click(confirmando)
    liberar()
    expect(await screen.findByRole('heading', { name: 'Início' })).toBeInTheDocument()
    expect(chamadas).toBe(1)
  })

  it('sem_estado_da_rota_o_email_fica_vazio_e_editavel', async () => {
    semSessao()
    const recebido = aceitarConfirmacao()
    renderComApp(app(), '/confirmar')

    const email = await screen.findByLabelText('E-mail')
    expect(email).toHaveValue('')
    expect(email).toBeEnabled()
    expect(email).not.toHaveAttribute('readonly')
    expect(screen.getByText('Digite o e-mail e o código que enviamos. Confira também o spam.')).toBeInTheDocument()

    await userEvent.type(email, 'ana@exemplo.com')
    await userEvent.type(campoCodigo(), '654321')
    await userEvent.click(botaoConfirmar())

    expect(await screen.findByRole('heading', { name: 'Início' })).toBeInTheDocument()
    expect(recebido.corpo).toEqual({ email: 'ana@exemplo.com', codigo: '654321' })
  })

  it('sem_email_avisa_sem_chamar_a_api', async () => {
    semSessao()
    renderComApp(app(), '/confirmar')

    await userEvent.type(await screen.findByLabelText('Código'), '123456')
    await userEvent.click(botaoConfirmar())

    expect(await screen.findByRole('alert')).toHaveTextContent('Informe seu e-mail.')
  })

  it('com_sessao_vai_para_o_inicio', async () => {
    comSessao()
    renderComApp(app(), '/confirmar')

    expect(await screen.findByRole('heading', { name: 'Início' })).toBeInTheDocument()
  })

  it('tem_link_para_refazer_o_cadastro', async () => {
    semSessao()
    renderizarComEmail()

    expect(await screen.findByRole('link', { name: 'Refazer o cadastro' })).toHaveAttribute('href', '/cadastro')
  })
})

describe('ConfirmarPage: reenviar', () => {
  /** Relógio falso que avança sozinho o bastante para o MSW e o userEvent não travarem. */
  function usarRelogioFalso() {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    return userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) })
  }

  /** Com timers falsos o React adia os efeitos; sem este passo a contagem só começaria depois do avanço do relógio. */
  async function deixarOsEfeitosRodar() {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
  }

  it('reenviar_comeca_bloqueado_por_60s_e_libera_depois', async () => {
    const usuario = usarRelogioFalso()
    semSessao()
    let corpo: unknown
    servidor.use(
      http.post('/api/auth/cadastro/reenviar', async ({ request }) => {
        corpo = await request.json()
        return new HttpResponse(null, { status: 202 })
      }),
    )
    renderizarComEmail()

    const reenviar = await screen.findByRole('button', { name: /Reenviar/ })
    expect(reenviar).toBeDisabled()
    expect(reenviar).toHaveTextContent('60')
    await deixarOsEfeitosRodar()

    act(() => {
      vi.advanceTimersByTime(59_000)
    })
    expect(screen.getByRole('button', { name: /Reenviar/ })).toHaveTextContent('Reenviar em 1 s')

    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reenviar' })).toBeEnabled())

    await usuario.click(screen.getByRole('button', { name: 'Reenviar' }))

    expect(await screen.findByText('Enviamos um novo código.')).toBeInTheDocument()
    expect(corpo).toEqual({ email: 'ana@exemplo.com' })
    expect(screen.getByRole('button', { name: /Reenviar/ })).toBeDisabled() // a contagem recomeça
  })

  it('reenviar_com_limite_estourado_mostra_a_mensagem_da_api', async () => {
    const usuario = usarRelogioFalso()
    semSessao()
    servidor.use(
      http.post('/api/auth/cadastro/reenviar', () =>
        HttpResponse.json({ erro: 'Muitos pedidos agora. Tente de novo mais tarde.' }, { status: 429 }),
      ),
    )
    renderizarComEmail()
    await screen.findByRole('button', { name: /Reenviar/ })
    await deixarOsEfeitosRodar()
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reenviar' })).toBeEnabled())

    await usuario.click(screen.getByRole('button', { name: 'Reenviar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Muitos pedidos agora. Tente de novo mais tarde.')
  })
})

describe('ConfirmarPage com link (?token=)', () => {
  it('abrir_com_token_nao_chama_a_api_ate_o_clique', async () => {
    semSessao()
    const recebido = aceitarConfirmacao()
    renderComApp(app(), '/confirmar?token=abc123')

    const botao = await screen.findByRole('button', { name: 'Confirmar minha conta' })
    expect(screen.queryByLabelText('Código')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument()
    await new Promise((resolver) => setTimeout(resolver, 50))
    expect(recebido.chamadas).toBe(0)

    await userEvent.click(botao)

    expect(await screen.findByRole('heading', { name: 'Início' })).toBeInTheDocument()
    expect(recebido.corpo).toEqual({ token: 'abc123' })
  })

  it('token_sai_da_url_ao_abrir', async () => {
    semSessao()
    const recebido = aceitarConfirmacao()
    renderComBrowserRouter(app(), '/confirmar?token=abc123')

    const botao = await screen.findByRole('button', { name: 'Confirmar minha conta' })
    await waitFor(() => expect(window.location.search).toBe(''))
    expect(window.location.pathname).toBe('/confirmar')
    expect(window.location.href).not.toContain('abc123')

    await userEvent.click(botao) // o token continua na memória da tela, mesmo fora da URL

    expect(await screen.findByRole('heading', { name: 'Início' })).toBeInTheDocument()
    expect(recebido.corpo).toEqual({ token: 'abc123' })
  })

  it('token_invalido_mostra_erro_e_link_para_refazer_o_cadastro', async () => {
    semSessao()
    recusarConfirmacao()
    renderComApp(app(), '/confirmar?token=ja-usado')

    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar minha conta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(INVALIDO)
    const refazer = screen.getByRole('link', { name: 'Refazer o cadastro' })
    expect(refazer).toHaveAttribute('href', '/cadastro')

    await userEvent.click(refazer)

    expect(await screen.findByRole('heading', { name: 'Criar conta' })).toBeInTheDocument()
  })

  it('botao_mostra_espera_e_nao_envia_de_novo', async () => {
    semSessao()
    let liberar: () => void = () => undefined
    const espera = new Promise<void>((resolver) => {
      liberar = resolver
    })
    let chamadas = 0
    servidor.use(
      http.post('/api/auth/cadastro/confirmar', async () => {
        chamadas += 1
        await espera
        return HttpResponse.json(usuarioFicticio, { status: 201 })
      }),
    )
    renderComApp(app(), '/confirmar?token=abc123')

    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar minha conta' }))

    const confirmando = await screen.findByRole('button', { name: 'Confirmando…' })
    expect(confirmando).toBeDisabled()
    await userEvent.click(confirmando)
    liberar()
    expect(await screen.findByRole('heading', { name: 'Início' })).toBeInTheDocument()
    expect(chamadas).toBe(1)
  })
})
