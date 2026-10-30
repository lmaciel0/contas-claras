import { describe, expect, it } from 'vitest'
import { mesAnterior, mesAtual, mesSeguinte, nomeMes, rotuloMes } from './mes'

describe('mes', () => {
  it('janeiro volta para dezembro do ano anterior', () => {
    expect(mesAnterior({ ano: 2026, mes: 1 })).toEqual({ ano: 2025, mes: 12 })
  })

  it('dezembro avança para janeiro do ano seguinte', () => {
    expect(mesSeguinte({ ano: 2026, mes: 12 })).toEqual({ ano: 2027, mes: 1 })
  })

  it('meios do ano só mudam o mês', () => {
    expect(mesAnterior({ ano: 2026, mes: 5 })).toEqual({ ano: 2026, mes: 4 })
    expect(mesSeguinte({ ano: 2026, mes: 5 })).toEqual({ ano: 2026, mes: 6 })
  })

  it('nomeia o mês com inicial maiúscula', () => {
    expect(nomeMes(10)).toBe('Outubro')
    expect(nomeMes(3)).toBe('Março')
  })

  it('monta o rótulo com o ano', () => {
    expect(rotuloMes(2026, 10)).toBe('Outubro 2026')
  })

  it('mês atual segue o fuso America/Sao_Paulo', () => {
    // 02:30 UTC de 1º de novembro ainda é 31 de outubro em São Paulo (UTC-3)
    expect(mesAtual(new Date('2026-11-01T02:30:00Z'))).toEqual({ ano: 2026, mes: 10 })
    expect(mesAtual(new Date('2026-11-01T03:30:00Z'))).toEqual({ ano: 2026, mes: 11 })
  })
})
