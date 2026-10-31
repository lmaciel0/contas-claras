/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
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

/** Todos os `.tsx` de produção sob `src/` (caminhos relativos a `src/`, sem testes). */
function tsxDeProducao(pasta = ''): string[] {
  const base = resolve(process.cwd(), 'src', pasta)
  return readdirSync(base, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = join(pasta, entrada.name)
    if (entrada.isDirectory()) return tsxDeProducao(caminho)
    return caminho.endsWith('.tsx') && !caminho.endsWith('.test.tsx') ? [caminho] : []
  })
}

describe('cores fixas', () => {
  it('nenhum TSX de produção usa bg-white, hex fixo em bg/text nem text-white', () => {
    const proibido = /bg-white|bg-\[#|text-\[#|text-white/
    const infratores = tsxDeProducao()
      .filter((arquivo) => proibido.test(readFileSync(resolve(process.cwd(), 'src', arquivo), 'utf8')))
    expect(infratores).toEqual([])
  })

  it('as cores do gráfico do ano vêm dos tokens de tema', () => {
    const cores = readFileSync(resolve(process.cwd(), 'src/paginas/inicio/cores.ts'), 'utf8')
    expect(cores).toContain("COR_RECEITAS = 'var(--cor-grafico-receitas)'")
    expect(cores).toContain("COR_DESPESAS = 'var(--cor-grafico-despesas)'")
    expect(cores).toContain("FUNDO_RECEITAS_PREVISTAS = 'var(--cor-grafico-receitas-previstas)'")
    expect(cores).toContain("FUNDO_DESPESAS_PREVISTAS = 'var(--cor-grafico-despesas-previstas)'")
  })

  it('o card de auth e o botão principal não têm cor fixa fora dos tokens', () => {
    const auth = /\.auth-card\s*\{[^}]*\}/.exec(css)?.[0] ?? ''
    expect(auth).not.toMatch(/#[0-9a-fA-F]{3,6}|rgb\(244/)
    const botao = /\.auth-card button\[type='submit'\]\s*\{[^}]*\}/.exec(css)?.[0] ?? ''
    expect(botao).not.toMatch(/#[0-9a-fA-F]{3,6}/)
  })

  it('no tema escuro, texto sobre o principal e sobre o negativo passa de 4,5:1', () => {
    const bloco = /:root\[data-tema='escuro'\]\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
    const hex = (nome: string): string => {
      const valor = new RegExp(`--${nome}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(bloco)?.[1]
      if (!valor) throw new Error(`token --${nome} ausente no tema escuro`)
      return valor
    }
    const lum = (h: string): number => {
      const [r, g, b] = [1, 3, 5].map((i) => {
        const c = parseInt(h.slice(i, i + 2), 16) / 255
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
      }) as [number, number, number]
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const ratio = (a: string, b: string): number => {
      const [mx, mn] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number]
      return (mx + 0.05) / (mn + 0.05)
    }
    const pares: Array<[string, string]> = [
      ['cor-sobre-principal', 'cor-principal'],
      ['cor-sobre-principal', 'cor-principal-fim'],
      ['cor-sobre-principal-suave', 'cor-principal'],
      ['cor-sobre-negativo', 'cor-negativo'],
    ]
    for (const [texto, fundo] of pares) {
      expect(ratio(hex(texto), hex(fundo)), `${texto} sobre ${fundo}`).toBeGreaterThanOrEqual(4.5)
    }
  })
})
