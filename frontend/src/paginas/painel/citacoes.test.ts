import { describe, expect, it } from 'vitest'
import {
  CITACOES,
  obterCitacaoDoDia,
  obterProximaCitacao,
  salvarFavorito,
  listarFavoritos,
  removerFavorito,
  isFavorito,
} from './citacoes'

describe('citacoes', () => {
  it('contém uma lista válida de citações estóicas e filosóficas', () => {
    expect(CITACOES.length).toBeGreaterThanOrEqual(5)
    for (const c of CITACOES) {
      expect(c.id).toBeTruthy()
      expect(c.frase).toBeTruthy()
      expect(c.autor).toBeTruthy()
      expect(c.obra).toBeTruthy()
    }
  })

  it('obterCitacaoDoDia retorna de forma determinística a mesma citação para a mesma data', () => {
    const data1 = new Date('2026-10-31T12:00:00Z')
    const data2 = new Date('2026-10-31T23:59:59Z')
    const citacao1 = obterCitacaoDoDia(data1)
    const citacao2 = obterCitacaoDoDia(data2)
    expect(citacao1.id).toBe(citacao2.id)
  })

  it('obterProximaCitacao retorna a citação seguinte em ciclo', () => {
    const atual = CITACOES[0]!
    const proxima = obterProximaCitacao(atual.id)
    expect(proxima.id).toBe(CITACOES[1]!.id)

    const ultima = CITACOES[CITACOES.length - 1]!
    const primeira = obterProximaCitacao(ultima.id)
    expect(primeira.id).toBe(CITACOES[0]!.id)
  })

  it('permite favoritar e desfavoritar com persistência no localStorage', () => {
    localStorage.clear()
    const id = CITACOES[0]!.id

    expect(isFavorito(id)).toBe(false)
    salvarFavorito(id)
    expect(isFavorito(id)).toBe(true)
    expect(listarFavoritos()).toContain(id)

    removerFavorito(id)
    expect(isFavorito(id)).toBe(false)
    expect(listarFavoritos()).not.toContain(id)
  })
})
