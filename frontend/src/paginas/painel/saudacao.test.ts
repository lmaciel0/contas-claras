import { describe, expect, it } from 'vitest'
import { dataPorExtenso, primeiroNome, saudacao } from './saudacao'

// São Paulo é UTC-3 o ano todo (sem horário de verão desde 2019); as datas abaixo estão em UTC.
describe('saudacao', () => {
  it('04:59 em SP é Boa noite', () => {
    expect(saudacao(new Date('2026-10-31T07:59:00Z'))).toBe('Boa noite')
  })

  it('05:00 em SP é Bom dia', () => {
    expect(saudacao(new Date('2026-10-31T08:00:00Z'))).toBe('Bom dia')
  })

  it('11:59 é Bom dia e 12:00 é Boa tarde', () => {
    expect(saudacao(new Date('2026-10-31T14:59:00Z'))).toBe('Bom dia')
    expect(saudacao(new Date('2026-10-31T15:00:00Z'))).toBe('Boa tarde')
  })

  it('17:59 é Boa tarde e 18:00 é Boa noite', () => {
    expect(saudacao(new Date('2026-10-31T20:59:00Z'))).toBe('Boa tarde')
    expect(saudacao(new Date('2026-10-31T21:00:00Z'))).toBe('Boa noite')
  })

  it('meia-noite em SP é Boa noite, mesmo com o relógio do navegador em UTC', () => {
    expect(saudacao(new Date('2026-10-31T03:00:00Z'))).toBe('Boa noite')
  })
})

describe('dataPorExtenso', () => {
  it('formata sábado, 31 de outubro', () => {
    expect(dataPorExtenso(new Date('2026-10-31T15:00:00Z'))).toBe('sábado, 31 de outubro')
  })

  it('usa o dia de São Paulo, não o de UTC', () => {
    expect(dataPorExtenso(new Date('2026-11-01T01:30:00Z'))).toBe('sábado, 31 de outubro')
  })
})

describe('primeiroNome', () => {
  it('pega a primeira palavra e trata vazio', () => {
    expect(primeiroNome('Lucas Maciel')).toBe('Lucas')
    expect(primeiroNome('  Ana ')).toBe('Ana')
    expect(primeiroNome('')).toBeNull()
    expect(primeiroNome('   ')).toBeNull()
    expect(primeiroNome(undefined)).toBeNull()
  })

  it('trata espaços e quebras de linha entre as palavras', () => {
    expect(primeiroNome('\tMaria José')).toBe('Maria')
  })
})
