import { describe, expect, it } from 'vitest'
import { destinoAposEntrar } from './destino'

describe('destinoAposEntrar', () => {
  it('sem_voltar_vai_para_o_inicio', () => {
    expect(destinoAposEntrar(null)).toBe('/')
    expect(destinoAposEntrar('')).toBe('/')
  })

  it('mantem_rota_interna_com_query_e_hash', () => {
    expect(destinoAposEntrar('/lancamentos?ano=2026')).toBe('/lancamentos?ano=2026')
    expect(destinoAposEntrar('/lancamentos?ano=2026&mes=10#topo')).toBe('/lancamentos?ano=2026&mes=10#topo')
    expect(destinoAposEntrar('/')).toBe('/')
  })

  it.each([
    ['tab depois da barra (o navegador remove e vira //evil.com)', '/\t/evil.com'],
    ['quebra de linha', '/\n/evil.com'],
    ['retorno de carro', '/\r/evil.com'],
    ['caractere nulo', '/\u0000/evil.com'],
    ['barra invertida depois da barra', '/\\evil.com'],
    ['barra invertida dupla', '\\\\evil.com'],
    ['duas barras', '//evil.com'],
    ['duas barras com caminho', '//evil.com/lancamentos'],
    ['URL completa https', 'https://evil.com'],
    ['URL completa http', 'http://evil.com/x'],
    ['esquema javascript', 'javascript:alert(1)'],
    ['esquema data', 'data:text/html,<script>alert(1)</script>'],
    ['sem barra inicial', 'lancamentos'],
    ['ponto-barra-barra que vira //evil.com ao normalizar', '/.//evil.com'],
  ])('rejeita_%s', (_descricao, voltar) => {
    expect(destinoAposEntrar(voltar)).toBe('/')
  })
})
