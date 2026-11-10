import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { ResumoConselheiroResponse } from '../../api/tipos'
import { renderComApp } from '../../teste/render'
import { servidor } from '../../teste/servidor'
import { CardConselheiroMetas } from './CardConselheiroMetas'

const conselheiroComSugestoes: ResumoConselheiroResponse = {
  sobraPrevistaMes: '800.00',
  totalSugeridoAporte: '450.00',
  sugestoes: [
    {
      metaId: 1,
      titulo: 'IPVA 2027',
      presetVisual: 'carro',
      icone: 'car',
      corGradienteInicio: '#7c3aed',
      corGradienteFim: '#a855f7',
      fotoUrl: null,
      valorSugerido: '300.00',
      motivo: 'Meta prioritária com prazo próximo (2 meses)',
    },
    {
      metaId: 2,
      titulo: 'Reserva de Emergência',
      presetVisual: 'reserva',
      icone: 'shield',
      corGradienteInicio: '#047857',
      corGradienteFim: '#10b981',
      fotoUrl: null,
      valorSugerido: '150.00',
      motivo: 'Construção contínua da reserva',
    },
  ],
}

describe('CardConselheiroMetas', () => {
  it('exibe as sugestões de aporte quando houver sobra prevista e metas ativas', async () => {
    servidor.use(
      http.get('/api/metas/conselheiro', () => HttpResponse.json(conselheiroComSugestoes)),
    )

    renderComApp(<CardConselheiroMetas ano={2026} mes={10} />)

    expect(await screen.findByRole('heading', { name: /conselheiro de metas/i })).toBeInTheDocument()
    expect(screen.getByText(/IPVA 2027/i)).toBeInTheDocument()
    expect(screen.getByText(/R\$\s*300,00/i)).toBeInTheDocument()
    expect(screen.getByText(/Reserva de Emergência/i)).toBeInTheDocument()
    expect(screen.getByText(/R\$\s*150,00/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver metas/i })).toHaveAttribute('href', '/metas')
  })

  it('exibe mensagem amigável quando a sobra do mês for zero ou negativa', async () => {
    servidor.use(
      http.get('/api/metas/conselheiro', () =>
        HttpResponse.json({
          sobraPrevistaMes: '0.00',
          totalSugeridoAporte: '0.00',
          sugestoes: [],
        }),
      ),
    )

    renderComApp(<CardConselheiroMetas ano={2026} mes={10} />)

    expect(await screen.findByText(/sem sobra prevista para novos aportes/i)).toBeInTheDocument()
  })

  it('sugere criar uma meta quando houver sobra mas nenhuma meta ativa', async () => {
    servidor.use(
      http.get('/api/metas/conselheiro', () =>
        HttpResponse.json({
          sobraPrevistaMes: '600.00',
          totalSugeridoAporte: '0.00',
          sugestoes: [],
        }),
      ),
    )

    renderComApp(<CardConselheiroMetas ano={2026} mes={10} />)

    expect(await screen.findByText(/você tem sobra prevista este mês/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /criar uma meta/i })).toHaveAttribute('href', '/metas')
  })
})
