import { describe, expect, it } from 'vitest'
import { formatarMoeda, lerValor } from './moeda'

const semNbsp = (texto: string) => texto.replace(/ /g, ' ')

describe('formatarMoeda', () => {
  it('formata string decimal da API em reais', () => {
    expect(semNbsp(formatarMoeda('1234.56'))).toBe('R$ 1.234,56')
  })

  it('formata número', () => {
    expect(semNbsp(formatarMoeda(10))).toBe('R$ 10,00')
  })

  it('formata negativo com o sinal antes do R$', () => {
    expect(semNbsp(formatarMoeda('-6.20'))).toBe('-R$ 6,20')
  })
})

describe('lerValor', () => {
  it('aceita ponto de milhar e vírgula decimal', () => {
    expect(lerValor('1.234,56')).toBe('1234.56')
  })

  it('completa para 2 casas', () => {
    expect(lerValor('251,3')).toBe('251.30')
    expect(lerValor('10')).toBe('10.00')
  })

  it('aceita ponto como separador decimal', () => {
    expect(lerValor('10.50')).toBe('10.50')
  })

  it('recusa mais de 2 casas', () => {
    expect(lerValor('10,999')).toBeNull()
  })

  it('ponto seguido de 3 dígitos é milhar em pt-BR', () => {
    expect(lerValor('10.999')).toBe('10999.00')
    expect(lerValor('1.234')).toBe('1234.00')
  })

  it('zero à esquerda não vira milhar: 0.500 e 0.001 são recusados e 0.50 vale 0,50', () => {
    expect(lerValor('0.500')).toBeNull()
    expect(lerValor('0.001')).toBeNull()
    expect(lerValor('0.50')).toBe('0.50')
    expect(lerValor('0,50')).toBe('0.50')
  })

  it('recusa zero, negativo e vazio', () => {
    expect(lerValor('0')).toBeNull()
    expect(lerValor('0,00')).toBeNull()
    expect(lerValor('-5')).toBeNull()
    expect(lerValor('')).toBeNull()
  })

  it('recusa o que não é número', () => {
    expect(lerValor('abc')).toBeNull()
    expect(lerValor('1,2,3')).toBeNull()
  })
})
