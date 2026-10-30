import { describe, expect, it } from 'vitest'
import { isoParaBr, lerDia, mesesEntre, vencimentoPadrao } from './datas'

describe('vencimentoPadrao', () => {
  it('usa_o_dia_do_item_quando_cabe_no_mes', () => {
    expect(vencimentoPadrao(2026, 10, 10)).toBe('2026-10-10')
    expect(vencimentoPadrao(2026, 1, 31)).toBe('2026-01-31')
  })

  it('dia_31_em_mes_curto_vira_o_ultimo_dia', () => {
    expect(vencimentoPadrao(2026, 2, 31)).toBe('2026-02-28')
    expect(vencimentoPadrao(2028, 2, 31)).toBe('2028-02-29')
    expect(vencimentoPadrao(2026, 4, 31)).toBe('2026-04-30')
    expect(vencimentoPadrao(2026, 2, 30)).toBe('2026-02-28')
  })

  it('sem_dia_no_item_nao_sugere_data', () => {
    expect(vencimentoPadrao(2026, 10, null)).toBe('')
  })
})

describe('isoParaBr', () => {
  it('troca_a_ordem_sem_usar_date', () => {
    expect(isoParaBr('2026-02-28')).toBe('28/02/2026')
  })
})

describe('mesesEntre', () => {
  it('lista_meses_consecutivos_com_virada_de_ano', () => {
    expect(mesesEntre({ ano: 2026, mes: 11 }, 3)).toEqual([
      { ano: 2026, mes: 11 },
      { ano: 2026, mes: 12 },
      { ano: 2027, mes: 1 },
    ])
  })

  it('aceita_deslocamento_negativo_no_inicio', () => {
    expect(mesesEntre({ ano: 2026, mes: 1 }, 2, -1)).toEqual([
      { ano: 2025, mes: 12 },
      { ano: 2026, mes: 1 },
    ])
  })
})

describe('lerDia', () => {
  it('vazio_vale_null', () => {
    expect(lerDia('')).toBeNull()
    expect(lerDia('  ')).toBeNull()
  })

  it('aceita_de_1_a_31', () => {
    expect(lerDia('1')).toBe(1)
    expect(lerDia(' 15 ')).toBe(15)
    expect(lerDia('31')).toBe(31)
  })

  it('recusa_fora_da_faixa_ou_nao_inteiro', () => {
    expect(lerDia('0')).toBeUndefined()
    expect(lerDia('32')).toBeUndefined()
    expect(lerDia('1,5')).toBeUndefined()
    expect(lerDia('abc')).toBeUndefined()
  })
})
