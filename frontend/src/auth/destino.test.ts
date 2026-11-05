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

  it.each([
    ['caminho exato', '/conta/excluir'],
    ['barra final', '/conta/excluir/'],
    ['barras finais repetidas', '/conta/excluir//'],
    ['caixa diferente', '/Conta/EXCLUIR'],
    ['percent-encoding de uma letra', '/conta/exclu%69r'],
    ['percent-encoding da barra', '/conta%2Fexcluir'],
    ['percent-encoding minúsculo e maiúsculo', '/%43onta/%65xcluir'],
    ['codificado duas vezes', '/conta/exclu%2569r'],
    ['com query', '/conta/excluir?x=1'],
    ['com hash', '/conta/excluir#topo'],
    ['com query e hash', '/conta/excluir/?x=1#topo'],
    ['segmento ponto', '/conta/./excluir'],
    ['segmento ponto-ponto', '/conta/x/../excluir'],
    ['ponto-ponto codificado', '/conta/x/%2e%2e/excluir'],
  ])('recusa_a_tela_de_exclusao_de_conta_%s', (_descricao, voltar) => {
    expect(destinoAposEntrar(voltar)).toBe('/')
  })

  it('nao_recusa_rotas_parecidas_com_a_de_exclusao', () => {
    expect(destinoAposEntrar('/conta/senha')).toBe('/conta/senha')
    expect(destinoAposEntrar('/conta/excluir-algo')).toBe('/conta/excluir-algo')
    expect(destinoAposEntrar('/conta')).toBe('/conta')
  })

  it('pathname_com_percent_encoding_invalido_vai_para_o_inicio', () => {
    expect(destinoAposEntrar('/conta/%E0%A4%A')).toBe('/')
  })
})
