import type { LancamentoResponse } from '../../api/tipos'
import { paraCentavos } from '../inicio/valores'

export interface TotaisDeReceitas {
  recebidoCentavos: number
  totalCentavos: number
  /** Inteiro de 0 a 100; 0 quando não há receita no mês. */
  percentual: number
}

/** Quanto das receitas do mês já foi recebido (status PAGO) contra o previsto total, em centavos inteiros. */
export function totaisDeReceitas(lancamentos: LancamentoResponse[]): TotaisDeReceitas {
  let recebidoCentavos = 0
  let totalCentavos = 0
  for (const l of lancamentos) {
    const centavos = paraCentavos(l.valor)
    totalCentavos += centavos
    if (l.status === 'PAGO') {
      recebidoCentavos += centavos
    }
  }
  const percentual = totalCentavos === 0 ? 0 : Math.round((recebidoCentavos / totalCentavos) * 100)
  return { recebidoCentavos, totalCentavos, percentual }
}
