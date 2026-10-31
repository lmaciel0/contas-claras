import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { TarefaResponse } from '../../api/tipos'
import { TarefaLinha } from './TarefaLinha'

const tarefa = (parcial: Partial<TarefaResponse> = {}): TarefaResponse => ({
  id: 1,
  titulo: 'Pagar o boleto',
  data: null,
  concluida: false,
  concluidaEm: null,
  ...parcial,
})

const HOJE = '2026-10-31'

describe('TarefaLinha', () => {
  it('mostraBotaoMarcarComoFeita', () => {
    render(<TarefaLinha tarefa={tarefa()} hoje={HOJE} aoAlternar={() => {}} />)

    expect(screen.getByRole('button', { name: 'Marcar como feita' })).toBeInTheDocument()
    expect(screen.getByText('Pagar o boleto')).toBeInTheDocument()
  })

  it('cliqueNoCirculoChamaAoAlternar', async () => {
    const aoAlternar = vi.fn()
    const t = tarefa()
    render(<TarefaLinha tarefa={t} hoje={HOJE} aoAlternar={aoAlternar} />)

    await userEvent.click(screen.getByRole('button', { name: 'Marcar como feita' }))

    expect(aoAlternar).toHaveBeenCalledExactlyOnceWith(t)
  })

  it('concluidaMostraReabrirETituloRiscado', () => {
    render(
      <TarefaLinha
        tarefa={tarefa({ concluida: true, concluidaEm: '2026-10-31T12:00:00Z' })}
        hoje={HOJE}
        aoAlternar={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: 'Reabrir tarefa' })).toBeInTheDocument()
    expect(screen.getByText('Pagar o boleto')).toHaveClass('line-through')
  })

  it('tarefaAbertaComDataAnteriorAHojeFicaMarcadaComoAtrasada', () => {
    render(<TarefaLinha tarefa={tarefa({ data: '2026-10-28' })} hoje={HOJE} aoAlternar={() => {}} />)

    expect(screen.getByText('28/10')).toBeInTheDocument()
    expect(screen.getByText(/atrasada/i)).toBeInTheDocument()
  })

  it('tarefaDeHojeOuConcluidaNaoFicaAtrasada', () => {
    const { rerender } = render(
      <TarefaLinha tarefa={tarefa({ data: HOJE })} hoje={HOJE} aoAlternar={() => {}} />,
    )
    expect(screen.queryByText(/atrasada/i)).not.toBeInTheDocument()

    rerender(
      <TarefaLinha
        tarefa={tarefa({ data: '2026-10-01', concluida: true, concluidaEm: '2026-10-31T12:00:00Z' })}
        hoje={HOJE}
        aoAlternar={() => {}}
      />,
    )
    expect(screen.queryByText(/atrasada/i)).not.toBeInTheDocument()
  })

  it('dataDeOutroAnoMostraAno', () => {
    render(<TarefaLinha tarefa={tarefa({ data: '2027-01-05' })} hoje={HOJE} aoAlternar={() => {}} />)

    expect(screen.getByText('05/01/2027')).toBeInTheDocument()
  })

  it('desabilitadaBloqueiaOCirculo', () => {
    render(<TarefaLinha tarefa={tarefa()} hoje={HOJE} aoAlternar={() => {}} desabilitada />)

    expect(screen.getByRole('button', { name: 'Marcar como feita' })).toBeDisabled()
  })
})
