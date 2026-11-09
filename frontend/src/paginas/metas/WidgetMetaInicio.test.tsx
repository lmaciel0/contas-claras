import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { MetaResponse } from '../../api/tipos'
import { renderComApp } from '../../teste/render'
import { servidor } from '../../teste/servidor'
import { WidgetMetaInicio } from './WidgetMetaInicio'

const metaExemplo: MetaResponse = {
  id: 1,
  titulo: 'Reserva de Emergência',
  valorAlvo: '10000.00',
  valorGuardado: '4500.00',
  prazo: '2027-12-31',
  presetVisual: 'reserva',
  icone: 'shield',
  corGradienteInicio: '#047857',
  corGradienteFim: '#10b981',
  fotoUrl: null,
  ordem: 0,
  percentualConcluido: '0.4500',
  valorRestante: '5500.00',
  valorMensalSugerido: '392.86',
  mesesRestantes: 14,
  concluida: false,
}

describe('WidgetMetaInicio', () => {
  it('não renderiza nada quando não houver metas cadastradas', async () => {
    servidor.use(http.get('/api/metas', () => HttpResponse.json([])))

    const { container } = renderComApp(<WidgetMetaInicio />, '/')

    // Espera query resolver
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(container.firstChild).toBeNull()
  })

  it('renderiza card compacto com a meta mais relevante e barra de progresso', async () => {
    servidor.use(http.get('/api/metas', () => HttpResponse.json([metaExemplo])))

    renderComApp(<WidgetMetaInicio />, '/')

    expect(await screen.findByRole('heading', { name: 'Reserva de Emergência' })).toBeInTheDocument()
    expect(screen.getByText(/R\$\s*4\.500,00/i)).toBeInTheDocument()
    expect(screen.getByText(/de R\$\s*10\.000,00/i)).toBeInTheDocument()
    expect(screen.getByText('45%')).toBeInTheDocument()

    const link = screen.getByRole('link', { name: /ver metas/i })
    expect(link).toHaveAttribute('href', '/metas')
  })
})
