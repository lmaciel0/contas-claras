import { describe, expect, it } from 'vitest'
import { lancamento } from '../../teste/lancamentos'
import { totaisDeReceitas } from './receitas'

const receita = (id: number, itemNome: string, valor: string, status: 'PAGO' | 'PREVISTO') =>
  lancamento({ id, itemId: id, itemNome, categoriaId: 1, categoriaNome: 'Receitas', tipo: 'RECEITA', valor, status })

describe('totaisDeReceitas', () => {
  it('tudo_recebido_da_100_por_cento', () => {
    const totais = totaisDeReceitas([receita(1, 'Salário', '5500.00', 'PAGO'), receita(2, 'Camila', '742.00', 'PAGO')])

    expect(totais).toEqual({ recebidoCentavos: 624200, totalCentavos: 624200, percentual: 100 })
  })

  it('parte_a_receber_reduz_o_percentual', () => {
    const totais = totaisDeReceitas([receita(1, 'Salário', '5500.00', 'PAGO'), receita(2, 'Camila', '742.00', 'PREVISTO')])

    expect(totais).toEqual({ recebidoCentavos: 550000, totalCentavos: 624200, percentual: 88 })
  })

  it('lista_vazia_zera_tudo', () => {
    expect(totaisDeReceitas([])).toEqual({ recebidoCentavos: 0, totalCentavos: 0, percentual: 0 })
  })
})
