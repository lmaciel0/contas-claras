import { describe, expect, it } from 'vitest'
import { CONTATO_EMAIL, RESPONSAVEL_NOME, VIGENCIA } from './responsavel'

describe('dados do responsável', () => {
  it('contato_e_um_email_valido_e_nao_e_de_exemplo', () => {
    expect(CONTATO_EMAIL).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)
    expect(CONTATO_EMAIL).not.toContain('exemplo')
  })

  it('nome_tem_ao_menos_duas_palavras', () => {
    expect(RESPONSAVEL_NOME.trim().split(/\s+/).length).toBeGreaterThanOrEqual(2)
  })

  it('vigencia_esta_no_formato_dd_mm_aaaa', () => {
    expect(VIGENCIA).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
  })
})
