import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { instalarRecarregarNoErroDeChunk } from './recarregarNoErroDeChunk'

function disparar(alvo: Window) {
  const evento = new Event('vite:preloadError', { cancelable: true })
  alvo.dispatchEvent(evento)
  return evento
}

describe('instalarRecarregarNoErroDeChunk', () => {
  let remover: () => void = () => undefined

  beforeEach(() => {
    sessionStorage.clear()
  })
  afterEach(() => {
    remover()
    vi.restoreAllMocks()
  })

  it('primeiro_erro_recarrega_a_pagina_e_cancela_o_erro', () => {
    const recarregar = vi.fn()
    remover = instalarRecarregarNoErroDeChunk({ alvo: window, recarregar, agora: () => 1_000 })

    const evento = disparar(window)

    expect(recarregar).toHaveBeenCalledTimes(1)
    expect(evento.defaultPrevented).toBe(true)
  })

  it('segundo_erro_dentro_da_janela_nao_recarrega_de_novo_e_deixa_o_erro_seguir', () => {
    const recarregar = vi.fn()
    let agora = 1_000
    remover = instalarRecarregarNoErroDeChunk({ alvo: window, recarregar, agora: () => agora })

    disparar(window)
    agora = 5_000
    const evento = disparar(window)

    expect(recarregar).toHaveBeenCalledTimes(1)
    expect(evento.defaultPrevented).toBe(false)
  })

  it('depois_da_janela_volta_a_recarregar', () => {
    const recarregar = vi.fn()
    let agora = 1_000
    remover = instalarRecarregarNoErroDeChunk({ alvo: window, recarregar, agora: () => agora })

    disparar(window)
    agora = 1_000 + 60_000
    disparar(window)

    expect(recarregar).toHaveBeenCalledTimes(2)
  })

  it('sem_sessionstorage_nao_quebra_e_nao_entra_em_loop', () => {
    const recarregar = vi.fn()
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    remover = instalarRecarregarNoErroDeChunk({ alvo: window, recarregar, agora: () => 1_000 })

    const evento = disparar(window)

    expect(recarregar).not.toHaveBeenCalled()
    expect(evento.defaultPrevented).toBe(false)
    vi.restoreAllMocks()
  })
})
