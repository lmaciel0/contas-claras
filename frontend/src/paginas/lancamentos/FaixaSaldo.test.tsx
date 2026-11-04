import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SaldoResponse } from '../../api/tipos'
import { renderComApp } from '../../teste/render'
import { servidor } from '../../teste/servidor'
import { FaixaSaldo } from './FaixaSaldo'

const responderSaldo = (saldo: SaldoResponse) => {
  const consultas: string[] = []
  servidor.use(
    http.get('/api/saldo', ({ request }) => {
      consultas.push(new URL(request.url).search)
      return HttpResponse.json(saldo)
    }),
  )
  return consultas
}

const ativo: SaldoResponse = { ativo: true, saldo: '5322.44', recebidoNoMes: '5500.00' }

describe('FaixaSaldo', () => {
  // Só o Date é falso: timers falsos travariam o MSW e o react-query.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-15T12:00:00-03:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('inativo_nao_renderiza_nada', async () => {
    const consultas = responderSaldo({ ativo: false, saldo: '0.00', recebidoNoMes: '0.00' })
    renderComApp(<FaixaSaldo ano={2026} mes={10} />)

    await waitFor(() => expect(consultas).toEqual(['?ano=2026&mes=10']))
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
    expect(screen.queryByRole('region', { name: /saldo/i })).toBeNull()
  })

  it('mes_corrente_mostra_dinheiro_hoje_e_recebido_no_mes', async () => {
    responderSaldo(ativo)
    renderComApp(<FaixaSaldo ano={2026} mes={11} />)

    const faixa = await screen.findByRole('region', { name: /saldo/i })

    expect(within(faixa).getByText('Dinheiro no Itaú hoje')).toBeInTheDocument()
    expect(within(faixa).getByText('R$ 5.322,44')).toBeInTheDocument()
    expect(within(faixa).getByText('Recebido no mês')).toBeInTheDocument()
    expect(within(faixa).getByText('R$ 5.500,00')).toBeInTheDocument()
  })

  it('mes_futuro_mostra_saldo_ao_fim_do_mes_e_nao_diz_hoje', async () => {
    responderSaldo(ativo)
    renderComApp(<FaixaSaldo ano={2026} mes={12} />)

    const faixa = await screen.findByRole('region', { name: /saldo/i })

    expect(within(faixa).getByText('Saldo no Itaú ao fim de Dezembro')).toBeInTheDocument()
    expect(within(faixa).queryByText(/hoje/i)).toBeNull()
  })

  it('enquanto_carrega_mostra_esqueleto_e_depois_a_faixa', async () => {
    responderSaldo(ativo)
    renderComApp(<FaixaSaldo ano={2026} mes={11} />)

    expect(screen.getByRole('status', { name: /carregando o saldo/i })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /saldo/i })).toBeNull()

    await screen.findByRole('region', { name: /saldo/i })
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('falha_na_consulta_nao_mostra_a_faixa', async () => {
    let chamadas = 0
    servidor.use(
      http.get('/api/saldo', () => {
        chamadas += 1
        return HttpResponse.json({ mensagem: 'erro' }, { status: 500 })
      }),
    )
    renderComApp(<FaixaSaldo ano={2026} mes={11} />)

    await waitFor(() => expect(chamadas).toBeGreaterThan(0))
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
    expect(screen.queryByRole('region', { name: /saldo/i })).toBeNull()
  })
})
