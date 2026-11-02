import { describe, expect, it } from 'vitest'
import { CORES_CATEGORIA, COR_PADRAO, obterCorValida } from './paletaCores'

describe('paletaCores', () => {
  it('contem todas as cores principais das referencias', () => {
    const codigos = CORES_CATEGORIA.map((c) => c.hex)
    expect(codigos).toContain('#3b82f6') // Azul
    expect(codigos).toContain('#06b6d4') // Ciano
    expect(codigos).toContain('#10b981') // Verde
    expect(codigos).toContain('#84cc16') // Oliva/Lima
    expect(codigos).toContain('#f59e0b') // Amarelo
    expect(codigos).toContain('#f97316') // Laranja
    expect(codigos).toContain('#ef4444') // Vermelho
    expect(codigos).toContain('#a855f7') // Roxo
    expect(codigos).toContain('#64748b') // Cinza
  })

  it('retorna a cor informada se for um hex valido', () => {
    expect(obterCorValida('#ff00aa')).toBe('#ff00aa')
    expect(obterCorValida('#123')).toBe('#123')
  })

  it('retorna COR_PADRAO se a cor for nula, vazia ou invalida', () => {
    expect(obterCorValida(undefined)).toBe(COR_PADRAO)
    expect(obterCorValida('')).toBe(COR_PADRAO)
    expect(obterCorValida('invalido')).toBe(COR_PADRAO)
  })
})
