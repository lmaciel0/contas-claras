import { describe, expect, it } from 'vitest'
import type { PontoSerie } from '../../api/tipos'
import { formatarComSinal, formatarPercentual, paraCentavos, serieDoGrafico, variacao } from './valores'

const semNbsp = (texto: string) => texto.replace(/\u00a0/g, ' ')

describe('paraCentavos', () => {
  it('converte string decimal em centavos inteiros sem ruído de ponto flutuante', () => {
    expect(paraCentavos('0.10')).toBe(10)
    expect(paraCentavos('1234.56')).toBe(123456)
    expect(paraCentavos('-6.20')).toBe(-620)
    expect(paraCentavos('19.99')).toBe(1999)
  })
})

describe('formatarComSinal', () => {
  it('põe o sinal − antes do R$ quando negativo', () => {
    expect(semNbsp(formatarComSinal('-799.50'))).toBe('− R$ 799,50')
  })

  it('não põe sinal em positivo nem em zero', () => {
    expect(semNbsp(formatarComSinal('5000.00'))).toBe('R$ 5.000,00')
    expect(semNbsp(formatarComSinal('0.00'))).toBe('R$ 0,00')
    expect(semNbsp(formatarComSinal('-0.00'))).toBe('R$ 0,00')
  })
})

describe('variacao', () => {
  it('sobe, desce e arredonda para percentual inteiro', () => {
    expect(variacao('1500.00', '1000.00')).toEqual({ direcao: 'subiu', percentual: 50 })
    expect(variacao('670.00', '1000.00')).toEqual({ direcao: 'caiu', percentual: 33 })
  })

  it('devolve null quando o valor anterior é zero (sem dividir por zero)', () => {
    expect(variacao('100.00', '0.00')).toBeNull()
    expect(variacao('0.00', '0.00')).toBeNull()
  })

  it('devolve igual quando não mudou', () => {
    expect(variacao('100.00', '100.00')).toEqual({ direcao: 'igual', percentual: 0 })
  })
})

describe('formatarPercentual', () => {
  it('arredonda a fração de 4 casas para inteiro, meio para cima', () => {
    expect(formatarPercentual('0.7142')).toBe('71%')
    expect(formatarPercentual('0.1450')).toBe('15%')
    expect(formatarPercentual('1.0000')).toBe('100%')
  })

  it('mostra <1% quando é positivo mas arredonda para zero', () => {
    expect(formatarPercentual('0.0049')).toBe('<1%')
  })
})

describe('serieDoGrafico', () => {
  it('separa a parte paga da prevista, já que previstas é subconjunto do total', () => {
    const serie: PontoSerie[] = [
      { mes: 1, receitas: '1000.00', receitasPrevistas: '400.00', despesas: '300.10', despesasPrevistas: '0.10' },
    ]

    expect(serieDoGrafico(serie)).toEqual([
      { mes: 1, rotulo: 'Jan', receitasPagas: 600, receitasPrevistas: 400, despesasPagas: 300, despesasPrevistas: 0.1 },
    ])
  })
})
