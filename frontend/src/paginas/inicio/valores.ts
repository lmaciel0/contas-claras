import type { PontoSerie } from '../../api/tipos'
import { formatarMoeda } from '../../formato/moeda'

/** Converte string decimal da API (`"-6.20"`) em centavos inteiros, sem ruído de ponto flutuante. */
export function paraCentavos(valor: string): number {
  const centavos = Math.round(Number(valor) * 100)
  return centavos === 0 ? 0 : centavos // evita -0, que o Intl formataria como "-R$ 0,00"
}

/** `R$ 1.234,56`; negativo sai `− R$ 1.234,56` (sinal − separado, como no mockup); zero nunca leva sinal. */
export function formatarComSinal(valor: string): string {
  const centavos = paraCentavos(valor)
  return centavos < 0 ? `− ${formatarMoeda(-centavos / 100)}` : formatarMoeda(centavos / 100)
}

export interface Variacao {
  direcao: 'subiu' | 'caiu' | 'igual'
  /** Percentual inteiro, sempre ≥ 0. */
  percentual: number
}

/** Quanto `atual` mudou em relação a `anterior`; `null` quando `anterior` é zero (não há base de comparação). */
export function variacao(atual: string, anterior: string): Variacao | null {
  const antes = paraCentavos(anterior)
  if (antes === 0) {
    return null
  }
  const delta = paraCentavos(atual) - antes
  if (delta === 0) {
    return { direcao: 'igual', percentual: 0 }
  }
  return {
    direcao: delta > 0 ? 'subiu' : 'caiu',
    percentual: Math.round((Math.abs(delta) / Math.abs(antes)) * 100),
  }
}

/** Fração de 4 casas (`"0.7142"`) como percentual inteiro (`71%`); positivo que arredonda para 0 vira `<1%`. */
export function formatarPercentual(fracao: string): string {
  // Passa por pontos-base inteiros para o meio (ex.: 14,50%) arredondar para cima sem erro de ponto flutuante.
  const pontosBase = Math.round(Number(fracao) * 10_000)
  const inteiro = Math.round(pontosBase / 100)
  return inteiro === 0 && pontosBase > 0 ? '<1%' : `${inteiro}%`
}

/** Largura (0 a 100) da barra de uma fração de 4 casas. */
export function larguraDaBarra(fracao: string): number {
  return Math.min(100, Math.max(0, Math.round(Number(fracao) * 10_000) / 100))
}

const ROTULOS_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const

export interface PontoDoGrafico {
  mes: number
  rotulo: string
  receitasPagas: number
  receitasPrevistas: number
  despesasPagas: number
  despesasPrevistas: number
}

/**
 * Prepara a série para as barras empilhadas. Na API `receitas` e `despesas` já incluem a parte prevista, então
 * a barra cheia é "paga + prevista" = total: a parte paga é o total menos a prevista (em centavos).
 */
export function serieDoGrafico(serie: PontoSerie[]): PontoDoGrafico[] {
  return serie.map((ponto) => {
    const receitas = paraCentavos(ponto.receitas)
    const receitasPrevistas = paraCentavos(ponto.receitasPrevistas)
    const despesas = paraCentavos(ponto.despesas)
    const despesasPrevistas = paraCentavos(ponto.despesasPrevistas)
    return {
      mes: ponto.mes,
      rotulo: ROTULOS_CURTOS[ponto.mes - 1] ?? '',
      receitasPagas: (receitas - receitasPrevistas) / 100,
      receitasPrevistas: receitasPrevistas / 100,
      despesasPagas: (despesas - despesasPrevistas) / 100,
      despesasPrevistas: despesasPrevistas / 100,
    }
  })
}

/** `"2026-11-10"` vira `10/11` (lê a string, sem `Date`, para o fuso não mudar o dia). */
export function diaEMes(dataIso: string): string {
  const [, mes = '', dia = ''] = dataIso.split('-')
  return `${dia}/${mes}`
}
