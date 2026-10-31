import { delay, http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { servidor } from '../teste/servidor'
import { api, aoMudarServidorAcordando, aoNaoAutenticado, ErroApi, servidorAcordando } from './cliente'

// Guardado antes de qualquer vi.useFakeTimers(): o setTimeout real continua disponível nos testes.
const setTimeoutReal = globalThis.setTimeout

/** Deixa a requisição andar pelo MSW (macrotarefas reais) antes de mexer no relógio falso. */
async function assentar() {
  for (let i = 0; i < 10; i++) {
    await new Promise<void>((resolver) => setTimeoutReal(resolver, 0))
  }
}

/** Avança o relógio falso e deixa as respostas pendentes chegarem antes de continuar. */
async function avancar(ms: number) {
  await vi.advanceTimersByTimeAsync(ms)
  await assentar()
}

describe('api', () => {
  it('envia credentials same-origin e devolve o JSON', async () => {
    let credentials: string | undefined
    servidor.use(
      http.get('/api/exemplo', ({ request }) => {
        credentials = request.credentials
        return HttpResponse.json({ ok: true })
      }),
    )

    await expect(api<{ ok: boolean }>('/api/exemplo')).resolves.toEqual({ ok: true })
    expect(credentials).toBe('same-origin')
  })

  it('manda o corpo com Content-Type application/json', async () => {
    let tipo: string | null = null
    let corpo: unknown
    servidor.use(
      http.post('/api/exemplo', async ({ request }) => {
        tipo = request.headers.get('content-type')
        corpo = await request.json()
        return HttpResponse.json({ id: 1 })
      }),
    )

    await api('/api/exemplo', { method: 'POST', body: JSON.stringify({ nome: 'x' }) })

    expect(tipo).toBe('application/json')
    expect(corpo).toEqual({ nome: 'x' })
  })

  it('resposta 204 resolve sem corpo', async () => {
    servidor.use(http.delete('/api/exemplo/1', () => new HttpResponse(null, { status: 204 })))

    await expect(api('/api/exemplo/1', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('corpo {erro} vira a mensagem do ErroApi', async () => {
    servidor.use(
      http.get('/api/exemplo', () => HttpResponse.json({ erro: 'Valor inválido.' }, { status: 400 })),
    )

    const falha = await api('/api/exemplo').catch((e: unknown) => e)

    expect(falha).toBeInstanceOf(ErroApi)
    expect(falha).toMatchObject({ status: 400, mensagem: 'Valor inválido.' })
  })

  it('erro sem corpo JSON usa uma mensagem padrão', async () => {
    servidor.use(http.get('/api/exemplo', () => new HttpResponse('boom', { status: 500 })))

    const falha = await api('/api/exemplo').catch((e: unknown) => e)

    expect(falha).toMatchObject({ status: 500, mensagem: 'Algo deu errado. Tente de novo.' })
  })

  describe('401', () => {
    const cancelar: Array<() => void> = []
    afterEach(() => cancelar.splice(0).forEach((f) => f()))

    it('chama o handler de não autenticado e ainda rejeita com a mensagem da API', async () => {
      const handler = vi.fn()
      cancelar.push(aoNaoAutenticado(handler))
      servidor.use(
        http.get('/api/resumo', () => HttpResponse.json({ erro: 'Não autenticado.' }, { status: 401 })),
      )

      const falha = await api('/api/resumo').catch((e: unknown) => e)

      expect(handler).toHaveBeenCalledTimes(1)
      expect(falha).toMatchObject({ status: 401, mensagem: 'Não autenticado.' })
    })

    it('sem handler registrado, o 401 só rejeita', async () => {
      servidor.use(
        http.get('/api/resumo', () => HttpResponse.json({ erro: 'Não autenticado.' }, { status: 401 })),
      )

      await expect(api('/api/resumo')).rejects.toMatchObject({ status: 401 })
    })

    it('depois de cancelar o registro, o handler não é mais chamado', async () => {
      const handler = vi.fn()
      aoNaoAutenticado(handler)()
      servidor.use(http.get('/api/resumo', () => HttpResponse.json({ erro: 'x' }, { status: 401 })))

      await api('/api/resumo').catch(() => undefined)

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('cold start (API dormindo)', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('resposta em 5 s liga o aviso depois de 3 s, desliga ao responder e não dá erro', async () => {
      servidor.use(
        http.get('/api/resumo', async () => {
          await delay(5000)
          return HttpResponse.json({ ok: true })
        }),
      )

      const promessa = api<{ ok: boolean }>('/api/resumo')
      let resultado: unknown
      let erro: unknown
      promessa.then((r) => (resultado = r), (e: unknown) => (erro = e))

      await vi.advanceTimersByTimeAsync(2900)
      expect(servidorAcordando()).toBe(false)

      await vi.advanceTimersByTimeAsync(200)
      expect(servidorAcordando()).toBe(true)

      await vi.advanceTimersByTimeAsync(2000)
      expect(servidorAcordando()).toBe(false)
      expect(erro).toBeUndefined()
      expect(resultado).toEqual({ ok: true })
    })

    it('resposta em 60 s (cold start real) ainda é sucesso, sem erro antes dos 90 s', async () => {
      servidor.use(
        http.get('/api/resumo', async () => {
          await delay(60_000)
          return HttpResponse.json({ ok: true })
        }),
      )

      let resultado: unknown
      let erro: unknown
      api('/api/resumo').then((r) => (resultado = r), (e: unknown) => (erro = e))

      await vi.advanceTimersByTimeAsync(59_000)
      expect(servidorAcordando()).toBe(true)
      expect(erro).toBeUndefined()

      await vi.advanceTimersByTimeAsync(2000)
      expect(resultado).toEqual({ ok: true })
      expect(erro).toBeUndefined()
      expect(servidorAcordando()).toBe(false)
    })

    it('resposta rápida nunca liga o aviso', async () => {
      const mudancas = vi.fn()
      const cancelar = aoMudarServidorAcordando(mudancas)
      servidor.use(http.get('/api/resumo', () => HttpResponse.json({ ok: true })))

      const promessa = api('/api/resumo')
      await vi.advanceTimersByTimeAsync(10)
      await promessa
      await vi.advanceTimersByTimeAsync(5000)

      expect(mudancas).not.toHaveBeenCalled()
      expect(servidorAcordando()).toBe(false)
      cancelar()
    })

    it('sem resposta em 90 s rejeita com status 0 e desliga o aviso', async () => {
      const handler = vi.fn()
      const cancelar = aoNaoAutenticado(handler)
      servidor.use(
        http.get('/api/resumo', async () => {
          await delay('infinite')
          return HttpResponse.json({ ok: true })
        }),
      )

      let erro: unknown
      api('/api/resumo').catch((e: unknown) => (erro = e))

      await vi.advanceTimersByTimeAsync(89_000)
      expect(erro).toBeUndefined()
      expect(servidorAcordando()).toBe(true)

      await vi.advanceTimersByTimeAsync(2000)
      expect(erro).toBeInstanceOf(ErroApi)
      expect(erro).toMatchObject({ status: 0, mensagem: 'Servidor não respondeu. Tente de novo.' })
      expect(servidorAcordando()).toBe(false)
      expect(handler).not.toHaveBeenCalled()
      cancelar()
    })

    it('com duas chamadas lentas, o aviso só desliga quando as duas terminam', async () => {
      servidor.use(
        http.get('/api/a', async () => {
          await delay(5000)
          return HttpResponse.json({})
        }),
        http.get('/api/b', async () => {
          await delay(8000)
          return HttpResponse.json({})
        }),
      )

      void api('/api/a')
      void api('/api/b')

      await vi.advanceTimersByTimeAsync(3100)
      expect(servidorAcordando()).toBe(true)
      await vi.advanceTimersByTimeAsync(2500)
      expect(servidorAcordando()).toBe(true)
      await vi.advanceTimersByTimeAsync(3000)
      expect(servidorAcordando()).toBe(false)
    })
  })

  describe('tentativas enquanto o servidor acorda (proxy devolve 502/503/504 ou a conexão falha)', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it.each([502, 503, 504])('%i seguido de 200 vira sucesso, sem erro, com o aviso ligado entre as tentativas', async (status) => {
      let chamadas = 0
      servidor.use(
        http.get('/api/resumo', () => {
          chamadas += 1
          return chamadas === 1 ? new HttpResponse(null, { status }) : HttpResponse.json({ ok: true })
        }),
      )

      let resultado: unknown
      let erro: unknown
      api('/api/resumo').then((r) => (resultado = r), (e: unknown) => (erro = e))
      await assentar()

      await avancar(100)
      expect(chamadas).toBe(1)
      expect(servidorAcordando()).toBe(true)
      expect(erro).toBeUndefined()

      await avancar(2000)
      expect(chamadas).toBe(2)
      expect(resultado).toEqual({ ok: true })
      expect(erro).toBeUndefined()
      expect(servidorAcordando()).toBe(false)
    })

    it('falha de conexão (TypeError) também é tentada de novo', async () => {
      let chamadas = 0
      servidor.use(
        http.get('/api/resumo', () => {
          chamadas += 1
          return chamadas === 1 ? HttpResponse.error() : HttpResponse.json({ ok: true })
        }),
      )

      let resultado: unknown
      api('/api/resumo').then((r) => (resultado = r))
      await assentar()

      await avancar(2100)

      expect(chamadas).toBe(2)
      expect(resultado).toEqual({ ok: true })
      expect(servidorAcordando()).toBe(false)
    })

    it('espera 2 s antes da segunda tentativa e 3 s antes da terceira', async () => {
      let chamadas = 0
      servidor.use(
        http.get('/api/resumo', () => {
          chamadas += 1
          return chamadas < 3 ? new HttpResponse(null, { status: 503 }) : HttpResponse.json({ ok: true })
        }),
      )

      let resultado: unknown
      api('/api/resumo').then((r) => (resultado = r))
      await assentar()

      await avancar(1900)
      expect(chamadas).toBe(1)
      await avancar(200)
      expect(chamadas).toBe(2)
      await avancar(2800)
      expect(chamadas).toBe(2)
      await avancar(200)
      expect(chamadas).toBe(3)
      expect(resultado).toEqual({ ok: true })
    })

    it('504 sem parar até os 90 s rejeita com status 0 e nenhum erro aparece antes', async () => {
      let chamadas = 0
      servidor.use(
        http.get('/api/resumo', () => {
          chamadas += 1
          return new HttpResponse(null, { status: 504 })
        }),
      )

      let erro: unknown
      api('/api/resumo').catch((e: unknown) => (erro = e))
      await assentar()

      await avancar(89_000)
      expect(erro).toBeUndefined()
      expect(servidorAcordando()).toBe(true)
      expect(chamadas).toBeGreaterThan(5)

      await avancar(2000)
      expect(erro).toBeInstanceOf(ErroApi)
      expect(erro).toMatchObject({ status: 0, mensagem: 'Servidor não respondeu. Tente de novo.' })
      expect(servidorAcordando()).toBe(false)

      const total = chamadas
      await avancar(10_000)
      expect(chamadas).toBe(total)
    })

    it('500 não é tentado de novo', async () => {
      let chamadas = 0
      servidor.use(
        http.get('/api/resumo', () => {
          chamadas += 1
          return HttpResponse.json({ erro: 'Falha inesperada.' }, { status: 500 })
        }),
      )

      let erro: unknown
      api('/api/resumo').catch((e: unknown) => (erro = e))
      await assentar()
      await avancar(10_000)

      expect(chamadas).toBe(1)
      expect(erro).toMatchObject({ status: 500, mensagem: 'Falha inesperada.' })
      expect(servidorAcordando()).toBe(false)
    })
  })

  describe('cancelamento por quem chamou', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('abortar o signal do chamador cancela a chamada com AbortError, sem virar ErroApi', async () => {
      servidor.use(
        http.get('/api/resumo', async () => {
          await delay(5000)
          return HttpResponse.json({ ok: true })
        }),
      )
      const chamador = new AbortController()

      let erro: unknown
      api('/api/resumo', { signal: chamador.signal }).catch((e: unknown) => (erro = e))
      await assentar()
      await avancar(100)
      chamador.abort()
      await avancar(0)

      expect(erro).toMatchObject({ name: 'AbortError' })
      expect(erro).not.toBeInstanceOf(ErroApi)
      expect(servidorAcordando()).toBe(false)
    })

    it('signal já abortado rejeita sem fazer a requisição', async () => {
      let chamadas = 0
      servidor.use(
        http.get('/api/resumo', () => {
          chamadas += 1
          return HttpResponse.json({ ok: true })
        }),
      )
      const chamador = new AbortController()
      chamador.abort()

      await expect(api('/api/resumo', { signal: chamador.signal })).rejects.toMatchObject({ name: 'AbortError' })
      expect(chamadas).toBe(0)
    })

    it('aborto durante a espera entre tentativas também propaga como AbortError', async () => {
      servidor.use(http.get('/api/resumo', () => new HttpResponse(null, { status: 502 })))
      const chamador = new AbortController()

      let erro: unknown
      api('/api/resumo', { signal: chamador.signal }).catch((e: unknown) => (erro = e))
      await assentar()
      await avancar(500)
      chamador.abort()
      await avancar(0)

      expect(erro).toMatchObject({ name: 'AbortError' })
      expect(servidorAcordando()).toBe(false)
    })

    it('funciona em navegador sem AbortSignal.any (Safari < 17.4)', async () => {
      const original = AbortSignal.any
      Object.defineProperty(AbortSignal, 'any', { value: undefined, configurable: true, writable: true })
      try {
        servidor.use(http.get('/api/resumo', () => HttpResponse.json({ ok: true })))
        const chamador = new AbortController()

        await expect(api('/api/resumo', { signal: chamador.signal })).resolves.toEqual({ ok: true })
        await expect(api('/api/resumo')).resolves.toEqual({ ok: true })
      } finally {
        Object.defineProperty(AbortSignal, 'any', { value: original, configurable: true, writable: true })
      }
    })
  })
})
