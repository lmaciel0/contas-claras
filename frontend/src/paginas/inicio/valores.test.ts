import { describe, expect, it } from 'vitest'
import type { PontoSerie } from '../../api/tipos'
import {
  formatarComSinal,
  formatarPercentual,
  paraCentavos,
  percentualDaReceita,
  resultadoAcumulado,
  resultadoCurto,
  serieDoGrafico,
  serieDoResultado,
  variacao,
} from './valores'

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

const ponto = (mes: number, receitas: string, despesas: string): PontoSerie => ({
  mes,
  receitas,
  receitasPrevistas: '0.00',
  despesas,
  despesasPrevistas: '0.00',
})

describe('serieDoResultado', () => {
  it('separa pago e previsto e calcula o resultado do mês', () => {
    const serie: PontoSerie[] = [
      { mes: 11, receitas: '1000.00', receitasPrevistas: '400.00', despesas: '800.00', despesasPrevistas: '200.00' },
    ]

    expect(serieDoResultado(serie)).toEqual([
      {
        mes: 11,
        rotulo: 'Nov',
        receitasPagas: 600,
        receitasPrevistas: 400,
        despesasPagas: -600,
        despesasPrevistas: -200,
        receitas: 1000,
        despesas: 800,
        resultado: 200,
        sentido: 'sobrou',
      },
    ])
  })

  it('marca faltou quando as despesas passam das receitas', () => {
    const [mes] = serieDoResultado([ponto(3, '500.00', '700.50')])

    expect(mes?.resultado).toBe(-200.5)
    expect(mes?.sentido).toBe('faltou')
  })

  it('marca zero quando receitas e despesas são zero, sem -0', () => {
    const [mes] = serieDoResultado([ponto(1, '0.00', '0.00')])

    expect(mes?.sentido).toBe('zero')
    expect(mes).toMatchObject({ resultado: 0, despesasPagas: 0, despesasPrevistas: 0 })
    expect(Object.is(mes?.despesasPagas, -0)).toBe(false)
    expect(Object.is(mes?.despesasPrevistas, -0)).toBe(false)
  })

  it('devolve lista vazia para série vazia', () => {
    expect(serieDoResultado([])).toEqual([])
  })
})

describe('resultadoAcumulado', () => {
  const serie = [ponto(1, '0.00', '100.00'), ponto(2, '80.00', '30.00'), ponto(3, '30.00', '0.00'), ponto(4, '0.00', '0.00')]

  it('soma os resultados de janeiro até o mês pedido', () => {
    expect(resultadoAcumulado(serie, 2)).toBe('-50.00')
    expect(resultadoAcumulado(serie, 3)).toBe('-20.00')
  })

  it('devolve 0.00 para série vazia', () => {
    expect(resultadoAcumulado([], 3)).toBe('0.00')
  })
})

describe('resultadoCurto', () => {
  it('abaixo de mil usa o inteiro com sinal', () => {
    expect(resultadoCurto(80, false)).toBe('+80')
    expect(resultadoCurto(-80, false)).toBe('−80')
  })

  it('a partir de mil usa uma casa decimal e o sufixo mil (ou k se compacto)', () => {
    expect(resultadoCurto(-1200, false)).toBe('−1,2 mil')
    expect(resultadoCurto(-1200, true)).toBe('−1,2k')
    expect(resultadoCurto(2000, false)).toBe('+2 mil')
    expect(resultadoCurto(2000, true)).toBe('+2k')
    expect(resultadoCurto(999.6, false)).toBe('+1 mil')
    expect(resultadoCurto(1234567, false)).toBe('+1.234,6 mil')
  })

  it('zero, ou o que arredonda para zero, sai sem sinal', () => {
    expect(resultadoCurto(0, false)).toBe('0')
    expect(resultadoCurto(-0.4, false)).toBe('0')
  })
})

describe('percentualDaReceita', () => {
  it('devolve o percentual inteiro da sobra sobre a receita, com sinal', () => {
    expect(percentualDaReceita('-1884.20', '5270.00')).toBe('−36%')
    expect(percentualDaReceita('799.50', '5000.00')).toBe('+16%')
  })

  it('zero, ou o que arredonda para zero, sai sem sinal', () => {
    expect(percentualDaReceita('0.00', '5000.00')).toBe('0%')
    expect(percentualDaReceita('-0.10', '5000.00')).toBe('0%')
  })

  it('devolve null quando a receita é zero', () => {
    expect(percentualDaReceita('100.00', '0.00')).toBeNull()
  })
})
