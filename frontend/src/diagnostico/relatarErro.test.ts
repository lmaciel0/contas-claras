import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { servidor } from '../teste/servidor'
import { criarRelator, instalarRelatoGlobal } from './relatarErro'

interface Relato {
  mensagem: string
  pilha?: string
  rota: string
}

/** Registra o endpoint e guarda cada corpo recebido, junto com os cabeçalhos úteis para os testes. */
function capturarRelatos(status = 204) {
  const recebidos: Relato[] = []
  servidor.use(
    http.post('/api/diagnostico/erros', async ({ request }) => {
      recebidos.push((await request.json()) as Relato)
      return new HttpResponse(null, { status })
    }),
  )
  return { recebidos }
}

/** Dá tempo de qualquer envio indevido chegar ao servidor antes de afirmar que ele não aconteceu. */
const esperarEnviosIndevidos = () => new Promise((resolve) => setTimeout(resolve, 50))

describe('relatarErro', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('envia_mensagem_pilha_e_rota_sem_query_string', async () => {
    const { recebidos } = capturarRelatos()
    window.history.pushState({}, '', '/lancamentos?mes=2026-10&email=ana@exemplo.com#topo')
    const erro = new Error('quebrou')
    const relatar = criarRelator({ prod: true })

    relatar(erro, '\n    at Tela')

    await vi.waitFor(() => expect(recebidos).toHaveLength(1))
    expect(recebidos[0]?.mensagem).toBe('quebrou')
    expect(recebidos[0]?.rota).toBe('/lancamentos')
    expect(recebidos[0]?.pilha).toContain('quebrou')
    expect(recebidos[0]?.pilha).toContain('at Tela')
    expect(Object.keys(recebidos[0] ?? {}).sort()).toEqual(['mensagem', 'pilha', 'rota'])
  })

  it('corta_mensagem_em_500_pilha_em_4000_e_rota_em_200', async () => {
    const { recebidos } = capturarRelatos()
    window.history.pushState({}, '', `/${'a'.repeat(300)}`)
    const erro = new Error('m'.repeat(900))
    erro.stack = 's'.repeat(9000)
    const relatar = criarRelator({ prod: true })

    relatar(erro)

    await vi.waitFor(() => expect(recebidos).toHaveLength(1))
    expect(recebidos[0]?.mensagem).toHaveLength(500)
    expect(recebidos[0]?.pilha).toHaveLength(4000)
    expect(recebidos[0]?.rota).toHaveLength(200)
    expect(recebidos[0]?.rota.startsWith('/')).toBe(true)
  })

  it('mensagem_vazia_vira_erro_sem_mensagem_e_aceita_valor_que_nao_e_error', async () => {
    const { recebidos } = capturarRelatos()
    const relatar = criarRelator({ prod: true })

    relatar(new Error(''))
    relatar(undefined)
    relatar('texto solto')

    await vi.waitFor(() => expect(recebidos).toHaveLength(2))
    await esperarEnviosIndevidos()
    const mensagens = recebidos.map((r) => r.mensagem)
    expect([...mensagens].sort()).toEqual(['Erro sem mensagem', 'texto solto'])
  })

  it('o_sexto_erro_nao_envia', async () => {
    const { recebidos } = capturarRelatos()
    const relatar = criarRelator({ prod: true })

    for (let i = 1; i <= 6; i += 1) {
      relatar(new Error(`erro ${i}`))
    }

    await vi.waitFor(() => expect(recebidos).toHaveLength(5))
    await esperarEnviosIndevidos()
    expect(recebidos).toHaveLength(5)
    expect(recebidos.map((r) => r.mensagem)).not.toContain('erro 6')
  })

  it('mensagem_repetida_nao_envia_de_novo_e_nao_gasta_o_limite', async () => {
    const { recebidos } = capturarRelatos()
    const relatar = criarRelator({ prod: true })

    relatar(new Error('igual'))
    relatar(new Error('igual'))
    relatar(new Error('igual'))
    for (let i = 1; i <= 4; i += 1) {
      relatar(new Error(`outro ${i}`))
    }

    await vi.waitFor(() => expect(recebidos).toHaveLength(5))
    await esperarEnviosIndevidos()
    expect(recebidos.filter((r) => r.mensagem === 'igual')).toHaveLength(1)
    expect(recebidos).toHaveLength(5)
  })

  it('nao_envia_fora_de_producao', async () => {
    const { recebidos } = capturarRelatos()
    const relatar = criarRelator({ prod: false })

    relatar(new Error('dev'))

    await esperarEnviosIndevidos()
    expect(recebidos).toHaveLength(0)
  })

  it('falha_500_do_servidor_nao_lanca', async () => {
    const { recebidos } = capturarRelatos(500)
    const relatar = criarRelator({ prod: true })

    expect(() => relatar(new Error('x'))).not.toThrow()

    await vi.waitFor(() => expect(recebidos).toHaveLength(1))
  })

  it('falha_de_rede_e_429_nao_lancam_nem_geram_rejeicao_nao_tratada', async () => {
    const naoTratada = vi.fn()
    process.on('unhandledRejection', naoTratada)
    servidor.use(http.post('/api/diagnostico/erros', () => HttpResponse.error()))
    const relatar = criarRelator({ prod: true })

    expect(() => relatar(new Error('rede'))).not.toThrow()
    await esperarEnviosIndevidos()

    process.off('unhandledRejection', naoTratada)
    expect(naoTratada).not.toHaveBeenCalled()

    const { recebidos } = capturarRelatos(429)
    expect(() => relatar(new Error('limite'))).not.toThrow()
    await vi.waitFor(() => expect(recebidos).toHaveLength(1))
  })

  it('fetch_que_lanca_de_forma_sincrona_e_engolido', () => {
    const relatar = criarRelator({
      prod: true,
      enviar: () => {
        throw new Error('bloqueado')
      },
    })

    expect(() => relatar(new Error('x'))).not.toThrow()
  })

  it('usa_keepalive_e_post_com_json', () => {
    const enviar = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    const relatar = criarRelator({ prod: true, enviar })

    relatar(new Error('x'))

    expect(enviar).toHaveBeenCalledTimes(1)
    const [url, opcoes] = enviar.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/diagnostico/erros')
    expect(opcoes.method).toBe('POST')
    expect(opcoes.keepalive).toBe(true)
    expect(opcoes.credentials).toBe('omit')
    expect(opcoes.headers).toEqual({ 'Content-Type': 'application/json' })
  })
})

/**
 * O jsdom trata um `ErrorEvent` disparado na janela como exceção não capturada e derruba o teste. Um `Event` comum de
 * tipo `error`, com os mesmos campos, exercita o ouvinte sem isso.
 */
function eventoDeErro(campos: { error?: unknown; message?: string }) {
  const evento = new Event('error')
  Object.defineProperties(evento, {
    error: { value: campos.error },
    message: { value: campos.message },
  })
  return evento
}

describe('instalarRelatoGlobal', () => {
  it('relata_error_e_unhandledrejection_da_janela_e_remove_os_ouvintes', () => {
    const relatar = vi.fn()
    const remover = instalarRelatoGlobal(relatar)

    const erro = new Error('estourou')
    window.dispatchEvent(eventoDeErro({ error: erro, message: 'estourou' }))
    expect(relatar).toHaveBeenLastCalledWith(erro)

    const motivo = new Error('promessa')
    const evento = new Event('unhandledrejection') as PromiseRejectionEvent
    Object.defineProperty(evento, 'reason', { value: motivo })
    window.dispatchEvent(evento)
    expect(relatar).toHaveBeenLastCalledWith(motivo)

    remover()
    // Ouvinte do próprio teste: sem nenhum, o vitest trataria o erro disparado como exceção não capturada.
    const silenciar = () => undefined
    window.addEventListener('error', silenciar)
    window.dispatchEvent(eventoDeErro({ error: erro }))
    window.removeEventListener('error', silenciar)
    expect(relatar).toHaveBeenCalledTimes(2)
  })

  it('usa_a_mensagem_quando_o_evento_nao_traz_o_objeto_de_erro', () => {
    const relatar = vi.fn()
    const remover = instalarRelatoGlobal(relatar)

    window.dispatchEvent(eventoDeErro({ message: 'Script error.' }))

    expect(relatar).toHaveBeenCalledWith('Script error.')
    remover()
  })
})
