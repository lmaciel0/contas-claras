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
})
