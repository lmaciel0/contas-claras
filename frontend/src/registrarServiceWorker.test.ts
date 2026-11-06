import { afterEach, describe, expect, it, vi } from 'vitest'
import { registrarServiceWorker } from './registrarServiceWorker'

function navegadorComSw(register: () => Promise<unknown>) {
  return { serviceWorker: { register } } as unknown as Navigator
}

/** Dispara o `load` da janela e espera as promises pendentes (o registro é assíncrono). */
async function carregarJanela() {
  window.dispatchEvent(new Event('load'))
  await Promise.resolve()
}

describe('registrarServiceWorker', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('registra_o_sw_na_raiz_quando_em_producao_e_com_suporte', async () => {
    const register = vi.fn().mockResolvedValue({})
    registrarServiceWorker({ prod: true, nav: navegadorComSw(register) })

    await carregarJanela()

    expect(register).toHaveBeenCalledTimes(1)
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' })
  })

  it('nao_registra_fora_de_producao', async () => {
    const register = vi.fn().mockResolvedValue({})
    registrarServiceWorker({ prod: false, nav: navegadorComSw(register) })

    await carregarJanela()

    expect(register).not.toHaveBeenCalled()
  })

  it('nao_registra_sem_suporte_a_service_worker', async () => {
    const addEventListener = vi.spyOn(window, 'addEventListener')

    expect(() => registrarServiceWorker({ prod: true, nav: {} as Navigator })).not.toThrow()

    await carregarJanela()
    expect(addEventListener).not.toHaveBeenCalledWith('load', expect.anything())
  })

  it('engole_erro_no_registro', async () => {
    const register = vi.fn().mockRejectedValue(new Error('falhou'))
    registrarServiceWorker({ prod: true, nav: navegadorComSw(register) })

    await carregarJanela()
    await Promise.resolve()

    expect(register).toHaveBeenCalledTimes(1)
  })

  it('engole_erro_sincrono_no_registro', async () => {
    const register = vi.fn(() => {
      throw new Error('bloqueado')
    })
    registrarServiceWorker({ prod: true, nav: navegadorComSw(register) })

    await expect(carregarJanela()).resolves.toBeUndefined()
    expect(register).toHaveBeenCalledTimes(1)
  })
})
