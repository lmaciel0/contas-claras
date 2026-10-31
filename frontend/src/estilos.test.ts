/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// O Vitest roda com `css: false`, que esvazia `import '...css?raw'`; por isso o arquivo é lido direto.
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

/** Valor de uma variável CSS declarada em `:root`, sem espaços e em minúsculas. */
function token(nome: string): string | undefined {
  const achado = new RegExp(`--${nome}:\\s*([^;]+);`).exec(css)
  return achado?.[1]?.trim().toLowerCase()
}

describe('tokens de cor', () => {
  it('verde e vermelho da paleta ficam para barras e fundos', () => {
    expect(token('cor-positivo')).toBe('#2e9e5b')
    expect(token('cor-negativo')).toBe('#d64545')
  })

  it('texto pequeno usa tons mais escuros (contraste AA)', () => {
    expect(token('cor-positivo-texto')).toBe('#1f7a45')
    expect(token('cor-negativo-texto')).toBe('#b73333')
  })

  it('celula_paga_e_diferenca_negativa_usam_os_tons_de_texto', () => {
    expect(css).toMatch(/\.celula-paga\s*\{\s*color:\s*var\(--cor-positivo-texto\);?\s*\}/)
    expect(css).toMatch(/\.diferenca-negativa\s*\{\s*color:\s*var\(--cor-negativo-texto\);?\s*\}/)
  })

  it('o tema escuro mantém contraste AA entre texto e fundos', () => {
    const bloco = /:root\[data-tema='escuro'\]\s*\{([^}]*)\}/.exec(css)?.[1]
    expect(bloco, "bloco :root[data-tema='escuro'] ausente").toBeDefined()
    const escuro = (nome: string): string => {
      const valor = new RegExp(`--${nome}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(bloco ?? '')?.[1]
      if (!valor) throw new Error(`token --${nome} ausente no tema escuro`)
      return valor
    }
    const luminancia = (hex: string): number => {
      const [r, g, b] = [1, 3, 5].map((i) => {
        const canal = parseInt(hex.slice(i, i + 2), 16) / 255
        return canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4
      }) as [number, number, number]
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const contraste = (a: string, b: string): number => {
      const [maior, menor] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number]
      return (maior + 0.05) / (menor + 0.05)
    }
    for (const texto of ['cor-texto', 'cor-mutado', 'cor-positivo-texto', 'cor-negativo-texto']) {
      for (const fundo of ['cor-card', 'cor-fundo']) {
        expect(contraste(escuro(texto), escuro(fundo)), `${texto} sobre ${fundo}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})
