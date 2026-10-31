/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CORES_CATEGORIA_NOTA, corDaCategoria } from './coresCategoria'

// O Vitest roda com `css: false`; por isso o arquivo é lido direto, como em estilos.test.ts.
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
const claro = /:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
const escuro = /:root\[data-tema='escuro'\]\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''

describe('cores das categorias de nota', () => {
  it('todasAsChavesTemTokenNosDoisTemas', () => {
    expect(CORES_CATEGORIA_NOTA).toEqual(['vermelho', 'laranja', 'amarelo', 'verde', 'azul', 'roxo', 'rosa', 'cinza'])
    for (const chave of CORES_CATEGORIA_NOTA) {
      const padrao = new RegExp(`--cor-nota-${chave}:\\s*#[0-9a-fA-F]{6}\\s*;`)
      expect(claro, `claro: ${chave}`).toMatch(padrao)
      expect(escuro, `escuro: ${chave}`).toMatch(padrao)
      expect(corDaCategoria(chave)).toBe(`var(--cor-nota-${chave})`)
    }
  })

  it('chaveDesconhecidaUsaCorMutada', () => {
    expect(corDaCategoria('turquesa')).toBe('var(--cor-mutado)')
    expect(corDaCategoria(null)).toBe('var(--cor-mutado)')
    expect(corDaCategoria('')).toBe('var(--cor-mutado)')
  })
})

describe('contraste das cores das categorias', () => {
  const luminancia = (hex: string): number => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    }) as [number, number, number]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const contraste = (a: string, b: string): number => {
    const [maior, menor] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number]
    return (maior + 0.05) / (menor + 0.05)
  }
  const hex = (bloco: string, nome: string): string => {
    const valor = new RegExp(`--${nome}:\\s*(#[0-9a-fA-F]{3,6})\\s*;`).exec(bloco)?.[1]
    if (!valor) throw new Error(`token --${nome} ausente`)
    return valor.length === 4 ? '#' + [...valor.slice(1)].map((c) => c + c).join('') : valor
  }

  it.each([
    ['claro', claro],
    ['escuro', escuro],
  ])('no tema %s cada cor passa de 4,5:1 sobre o card', (_nome, bloco) => {
    for (const chave of CORES_CATEGORIA_NOTA) {
      expect(contraste(hex(bloco, `cor-nota-${chave}`), hex(bloco, 'cor-card')), chave).toBeGreaterThanOrEqual(4.5)
    }
  })
})
