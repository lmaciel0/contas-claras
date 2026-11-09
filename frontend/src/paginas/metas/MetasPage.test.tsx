import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import type { MetaResponse } from '../../api/tipos'
import { renderComApp } from '../../teste/render'
import { servidor } from '../../teste/servidor'
import { MetasPage } from './MetasPage'

const metasMock: MetaResponse[] = [
  {
    id: 1,
    titulo: 'Reserva de Emergência',
    valorAlvo: '10000.00',
    valorGuardado: '3500.00',
    prazo: '2027-12-31',
    presetVisual: 'reserva',
    icone: 'shield',
    corGradienteInicio: '#047857',
    corGradienteFim: '#10b981',
    fotoUrl: null,
    ordem: 0,
    percentualConcluido: '0.3500',
    valorRestante: '6500.00',
    valorMensalSugerido: '464.29',
    mesesRestantes: 14,
    concluida: false,
  },
  {
    id: 2,
    titulo: 'IPVA 2027',
    valorAlvo: '2400.00',
    valorGuardado: '2400.00',
    prazo: '2027-01-31',
    presetVisual: 'carro',
    icone: 'car',
    corGradienteInicio: '#7c3aed',
    corGradienteFim: '#a855f7',
    fotoUrl: null,
    ordem: 1,
    percentualConcluido: '1.0000',
    valorRestante: '0.00',
    valorMensalSugerido: null,
    mesesRestantes: 2,
    concluida: true,
  },
]

describe('MetasPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('exibe estado vazio amigável quando não houver metas', async () => {
    servidor.use(http.get('/api/metas', () => HttpResponse.json([])))

    renderComApp(<MetasPage />, '/metas')

    expect(await screen.findByRole('heading', { name: /metas/i })).toBeInTheDocument()
    expect(await screen.findByText(/nenhuma meta cadastrada/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /criar primeira meta/i })).toBeInTheDocument()
  })

  it('lista as metas cadastradas e seus valores', async () => {
    servidor.use(http.get('/api/metas', () => HttpResponse.json(metasMock)))

    renderComApp(<MetasPage />, '/metas')

    expect(await screen.findByRole('heading', { name: 'Reserva de Emergência' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'IPVA 2027' })).toBeInTheDocument()
    expect(screen.getByText(/3\.500,00/)).toBeInTheDocument()
  })

  it('abre modal para criação de nova meta ao clicar no botão', async () => {
    const user = userEvent.setup()
    servidor.use(http.get('/api/metas', () => HttpResponse.json(metasMock)))

    renderComApp(<MetasPage />, '/metas')

    const btnNova = await screen.findByRole('button', { name: /nova meta/i })
    await user.click(btnNova)

    expect(await screen.findByRole('heading', { name: /nova meta ou caixinha/i })).toBeInTheDocument()
  })
})
