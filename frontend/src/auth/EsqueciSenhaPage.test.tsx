import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { comSessao, semSessao, usuarioFicticio } from '../teste/auth'
import { renderComApp } from '../teste/render'
import { servidor } from '../teste/servidor'
import { AuthProvider } from './AuthProvider'
import { MENSAGEM_SENHA_FORA_DO_TAMANHO } from './senha'

const INVALIDO = 'Código inválido ou expirado.'

afterEach(() => {
  vi.useRealTimers()
})

function renderizar() {
  return renderComApp(
    <AuthProvider>
      <App />
    </AuthProvider>,
    '/esqueci-senha',
  )
}

/** Registra o handler do passo 1 e devolve o que ele recebeu. */
function aceitarPedidoDeCodigo() {
  const recebido: { corpos: unknown[] } = { corpos: [] }
  servidor.use(
    http.post('/api/auth/esqueci-senha', async ({ request }) => {
      recebido.corpos.push(await request.json())
      return new HttpResponse(null, { status: 202 })
    }),
  )
  return recebido
}

async function irParaOPasso2(email = 'ana@exemplo.com') {
  await userEvent.type(await screen.findByLabelText('E-mail'), email)
  await userEvent.click(screen.getByRole('button', { name: 'Enviar código' }))
  await screen.findByLabelText('Código')
}

async function preencherPasso2(codigo: string, senha: string, repetir = senha) {
  await userEvent.type(screen.getByLabelText('Código'), codigo)
  await userEvent.type(screen.getByLabelText('Nova senha'), senha)
  await userEvent.type(screen.getByLabelText('Repetir nova senha'), repetir)
}

const botaoRedefinir = () => screen.getByRole('button', { name: 'Redefinir senha' })

describe('EsqueciSenhaPage', () => {
  it('passo_1_envia_e_mostra_o_passo_2_com_o_email', async () => {
    semSessao()
    const recebido = aceitarPedidoDeCodigo()
    renderizar()

    expect(await screen.findByRole('heading', { name: 'Esqueci a senha' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Código')).not.toBeInTheDocument()

    await irParaOPasso2()

    expect(recebido.corpos).toEqual([{ email: 'ana@exemplo.com' }])
    expect(screen.getByText('Enviamos um e-mail para ana@exemplo.com. Confira também o spam.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nova senha')).toBeInTheDocument()
    expect(screen.getByLabelText('Repetir nova senha')).toBeInTheDocument()
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument()
  })

  it('passo_1_sem_email_avisa_sem_chamar_a_api', async () => {
    semSessao() // sem handler: qualquer chamada falharia o teste
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Enviar código' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Informe seu e-mail.')
  })

  it('passo_1_com_limite_estourado_mostra_a_mensagem_da_api', async () => {
    semSessao()
    servidor.use(
      http.post('/api/auth/esqueci-senha', () =>
        HttpResponse.json({ erro: 'Muitos pedidos agora. Tente de novo mais tarde.' }, { status: 429 }),
      ),
    )
    renderizar()

    await userEvent.type(await screen.findByLabelText('E-mail'), 'ana@exemplo.com')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar código' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Muitos pedidos agora. Tente de novo mais tarde.')
    expect(screen.queryByLabelText('Código')).not.toBeInTheDocument()
  })

  it('passo_2_senhas_diferentes_bloqueiam_o_envio', async () => {
    semSessao()
    aceitarPedidoDeCodigo() // sem handler de redefinir: qualquer chamada falharia o teste
    renderizar()
    await irParaOPasso2()

    await preencherPasso2('123456', 'senha-nova-1', 'senha-nova-2')
    await userEvent.click(botaoRedefinir())

    expect(await screen.findByRole('alert')).toHaveTextContent('As senhas não são iguais.')
  })

  it('passo_2_senha_curta_avisa_sem_chamar_a_api', async () => {
    semSessao()
    aceitarPedidoDeCodigo()
    renderizar()
    await irParaOPasso2()

    await preencherPasso2('123456', 'curta')
    await userEvent.click(botaoRedefinir())

    expect(await screen.findByRole('alert')).toHaveTextContent(MENSAGEM_SENHA_FORA_DO_TAMANHO)
  })

  it('passo_2_codigo_incompleto_avisa_sem_chamar_a_api', async () => {
    semSessao()
    aceitarPedidoDeCodigo()
    renderizar()
    await irParaOPasso2()

    await preencherPasso2('12345', 'senha-nova-1')
    await userEvent.click(botaoRedefinir())

    expect(await screen.findByRole('alert')).toHaveTextContent('Digite os 6 dígitos do código.')
  })

  it('passo_2_codigo_certo_entra_no_app', async () => {
    semSessao()
    aceitarPedidoDeCodigo()
    let corpo: unknown
    servidor.use(
      http.post('/api/auth/redefinir-senha', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json(usuarioFicticio)
      }),
    )
    renderizar()
    await irParaOPasso2()

    await userEvent.click(screen.getByLabelText('Código'))
    await userEvent.paste('123 456') // colado do e-mail, com espaço
    await userEvent.type(screen.getByLabelText('Nova senha'), 'senha-nova-1')
    await userEvent.type(screen.getByLabelText('Repetir nova senha'), 'senha-nova-1')
    await userEvent.click(botaoRedefinir())

    expect(await screen.findByRole('heading', { name: 'Início' })).toBeInTheDocument()
    expect(corpo).toEqual({ email: 'ana@exemplo.com', codigo: '123456', senha: 'senha-nova-1' })
  })

  it('passo_2_codigo_errado_mostra_a_mensagem_da_api', async () => {
    semSessao()
    aceitarPedidoDeCodigo()
    servidor.use(http.post('/api/auth/redefinir-senha', () => HttpResponse.json({ erro: INVALIDO }, { status: 400 })))
    renderizar()
    await irParaOPasso2()

    await preencherPasso2('000000', 'senha-nova-1')
    await userEvent.click(botaoRedefinir())

    expect(await screen.findByRole('alert')).toHaveTextContent(INVALIDO)
    expect(botaoRedefinir()).toBeEnabled()
    expect(screen.getByLabelText('Código')).toHaveValue('000000')
  })

  it('com_sessao_vai_para_o_inicio', async () => {
    comSessao()
    renderizar()

    expect(await screen.findByRole('heading', { name: 'Início' })).toBeInTheDocument()
  })

  it('tem_link_para_voltar_ao_login', async () => {
    semSessao()
    renderizar()

    expect(await screen.findByRole('link', { name: 'Voltar para o login' })).toHaveAttribute('href', '/login')
  })
})

describe('EsqueciSenhaPage: reenviar e espera', () => {
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

  async function passo2Com(usuario: ReturnType<typeof userEvent.setup>) {
    await usuario.type(await screen.findByLabelText('E-mail'), 'ana@exemplo.com')
    await usuario.click(screen.getByRole('button', { name: 'Enviar código' }))
    await screen.findByLabelText('Código')
    await deixarOsEfeitosRodar()
  }

  it('reenviar_comeca_bloqueado_por_60s', async () => {
    const usuario = usarRelogioFalso()
    semSessao()
    const recebido = aceitarPedidoDeCodigo()
    renderizar()
    await passo2Com(usuario)

    const reenviar = screen.getByRole('button', { name: /Reenviar/ })
    expect(reenviar).toBeDisabled()
    expect(reenviar).toHaveTextContent('60')

    act(() => {
      vi.advanceTimersByTime(59_000)
    })
    expect(screen.getByRole('button', { name: /Reenviar/ })).toBeDisabled()

    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reenviar' })).toBeEnabled())
    await usuario.click(screen.getByRole('button', { name: 'Reenviar' }))

    expect(await screen.findByText('Enviamos um novo código.')).toBeInTheDocument()
    expect(recebido.corpos).toEqual([{ email: 'ana@exemplo.com' }, { email: 'ana@exemplo.com' }])
    expect(screen.getByRole('button', { name: /Reenviar/ })).toBeDisabled() // a contagem recomeça
  })

  it('botoes_mostram_espera_e_nao_enviam_de_novo', async () => {
    semSessao()
    let liberarPasso1: () => void = () => undefined
    let liberarPasso2: () => void = () => undefined
    const esperaDoPasso1 = new Promise<void>((resolver) => {
      liberarPasso1 = resolver
    })
    const esperaDoPasso2 = new Promise<void>((resolver) => {
      liberarPasso2 = resolver
    })
    let chamadasDoPasso1 = 0
    let chamadasDoPasso2 = 0
    servidor.use(
      http.post('/api/auth/esqueci-senha', async () => {
        chamadasDoPasso1 += 1
        await esperaDoPasso1
        return new HttpResponse(null, { status: 202 })
      }),
      http.post('/api/auth/redefinir-senha', async () => {
        chamadasDoPasso2 += 1
        await esperaDoPasso2
        return HttpResponse.json(usuarioFicticio)
      }),
    )
    renderizar()

    await userEvent.type(await screen.findByLabelText('E-mail'), 'ana@exemplo.com')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar código' }))
    const enviando = await screen.findByRole('button', { name: 'Enviando…' })
    expect(enviando).toBeDisabled()
    await userEvent.click(enviando)
    liberarPasso1()

    await screen.findByLabelText('Código')
    await preencherPasso2('123456', 'senha-nova-1')
    await userEvent.click(botaoRedefinir())
    const redefinindo = await screen.findByRole('button', { name: 'Redefinindo…' })
    expect(redefinindo).toBeDisabled()
    await userEvent.click(redefinindo)
    liberarPasso2()

    expect(await screen.findByRole('heading', { name: 'Início' })).toBeInTheDocument()
    expect(chamadasDoPasso1).toBe(1)
    expect(chamadasDoPasso2).toBe(1)
  })

  it('reenviar_mostra_espera_enquanto_a_chamada_dura', async () => {
    const usuario = usarRelogioFalso()
    semSessao()
    let liberar: () => void = () => undefined
    const espera = new Promise<void>((resolver) => {
      liberar = resolver
    })
    let chamadas = 0
    servidor.use(
      http.post('/api/auth/esqueci-senha', async () => {
        chamadas += 1
        // O primeiro pedido (passo 1) responde na hora; só o reenvio fica preso.
        if (chamadas > 1) {
          await espera
        }
        return new HttpResponse(null, { status: 202 })
      }),
    )
    renderizar()
    await passo2Com(usuario)
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reenviar' })).toBeEnabled())

    await usuario.click(screen.getByRole('button', { name: 'Reenviar' }))

    const reenviando = await screen.findByRole('button', { name: 'Reenviando…' })
    expect(reenviando).toBeDisabled()
    await usuario.click(reenviando)
    liberar()
    expect(await screen.findByText('Enviamos um novo código.')).toBeInTheDocument()
    expect(chamadas).toBe(2)
  })
})
