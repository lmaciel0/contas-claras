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

/** Expande `#rgb`/`#rrggbb` para `[r, g, b]` (0 a 255). */
function rgbDeHex(hex: string): [number, number, number] {
  const cheio = hex.length === 4 ? '#' + [...hex.slice(1)].map((c) => c + c).join('') : hex
  return [1, 3, 5].map((i) => parseInt(cheio.slice(i, i + 2), 16)) as [number, number, number]
}

function luminanciaRgb([r, g, b]: [number, number, number]): number {
  const [lr, lg, lb] = [r, g, b].map((v) => {
    const canal = v / 255
    return canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
}

function contrasteRgb(a: [number, number, number], b: [number, number, number]): number {
  const [maior, menor] = [luminanciaRgb(a), luminanciaRgb(b)].sort((x, y) => y - x) as [number, number]
  return (maior + 0.05) / (menor + 0.05)
}

/** Contraste WCAG entre duas cores `#rgb`/`#rrggbb`. */
function contrasteHex(a: string, b: string): number {
  return contrasteRgb(rgbDeHex(a), rgbDeHex(b))
}

/** `color-mix(in srgb, frente <pct>%, tras)`: mistura linear por canal, como o navegador. */
function misturar(frente: [number, number, number], pct: number, tras: [number, number, number]): [number, number, number] {
  return frente.map((c, i) => c * pct + (tras[i] as number) * (1 - pct)) as [number, number, number]
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

  it('o tema escuro usa fundo neutro obsidian e card acetinado', () => {
    const bloco = /:root\[data-tema='escuro'\]\s*\{([^}]*)\}/.exec(css)?.[1]
    expect(bloco).toBeDefined()
    expect(bloco).toMatch(/--cor-fundo:\s*#0b0d13;/)
    expect(bloco).toMatch(/--cor-card:\s*#131622;/)
    expect(bloco).toMatch(/--cor-linha:\s*#202538;/)
  })

  it('declara regras para os presets de destaque (lima, esmeralda, indigo)', () => {
    expect(css).toMatch(/html\[data-preset='lima'\]/)
    expect(css).toMatch(/html\[data-preset='esmeralda'\]/)
    expect(css).toMatch(/html\[data-preset='indigo'\]/)
  })

  it('o tema escuro mantém contraste AA entre texto e fundos', () => {
    const bloco = /:root\[data-tema='escuro'\]\s*\{([^}]*)\}/.exec(css)?.[1]
    expect(bloco, "bloco :root[data-tema='escuro'] ausente").toBeDefined()
    const escuro = (nome: string): string => {
      const valor = new RegExp(`--${nome}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(bloco ?? '')?.[1]
      if (!valor) throw new Error(`token --${nome} ausente no tema escuro`)
      return valor
    }
    for (const texto of ['cor-texto', 'cor-mutado', 'cor-positivo-texto', 'cor-negativo-texto']) {
      for (const fundo of ['cor-card', 'cor-fundo']) {
        expect(contrasteHex(escuro(texto), escuro(fundo)), `${texto} sobre ${fundo}`).toBeGreaterThanOrEqual(4.5)
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
    const pares: Array<[string, string]> = [
      ['cor-sobre-principal', 'cor-principal'],
      ['cor-sobre-principal', 'cor-principal-fim'],
      ['cor-sobre-principal-suave', 'cor-principal'],
      ['cor-sobre-negativo', 'cor-negativo'],
    ]
    for (const [texto, fundo] of pares) {
      expect(contrasteHex(hex(texto), hex(fundo)), `${texto} sobre ${fundo}`).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('campos das telas de auth: contraste não textual (WCAG 1.4.11, 3:1)', () => {
  const bloco = /:root\[data-tema='escuro'\]\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
  const hex = (nome: string): string => {
    const valor = new RegExp(`--${nome}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(bloco)?.[1]
    if (!valor) throw new Error(`token --${nome} ausente no tema escuro`)
    return valor
  }

  it('no escuro, a borda do campo passa de 3:1 sobre o início e o fim do degradê do card', () => {
    for (const fundo of ['cor-card', 'cor-auth-fundo-fim']) {
      expect(contrasteHex(hex('cor-auth-campo-borda'), hex(fundo)), `cor-auth-campo-borda sobre ${fundo}`).toBeGreaterThanOrEqual(3)
    }
  })

  it('o tema claro mantém a borda do campo transparente e o escuro aplica o token', () => {
    expect(token('cor-auth-campo-borda')).toBe('transparent')
    expect(css).toMatch(/:root\[data-tema='escuro'\] \.auth-card input\s*\{[^}]*var\(--cor-auth-campo-borda\)/)
  })
})

describe('botão de tema: contraste não textual (WCAG 1.4.11, 3:1)', () => {
  const botao = readFileSync(resolve(process.cwd(), 'src/tema/botao-tema.css'), 'utf8')
  const tokens = (bloco: string) => (nome: string): string => {
    const valor = new RegExp(`--${nome}:\\s*(#[0-9a-fA-F]{3,6})\\s*;`).exec(bloco)?.[1]
    if (!valor) throw new Error(`token --${nome} ausente`)
    return valor.length === 4 ? '#' + [...valor.slice(1)].map((c) => c + c).join('') : valor
  }
  const claro = tokens(/:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? '')
  const escuro = tokens(/:root\[data-tema='escuro'\]\s*\{([^}]*)\}/.exec(css)?.[1] ?? '')

  /** Token usado por uma propriedade dentro de um seletor exato de botao-tema.css. */
  const usado = (seletor: string, propriedade: string): string => {
    const bloco = new RegExp(`${seletor.replace(/[.:()]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(botao)?.[1] ?? ''
    const achado = new RegExp(`${propriedade}:[^;]*var\\(--([a-z-]+)\\)`).exec(bloco)?.[1]
    if (!achado) throw new Error(`${seletor} ${propriedade} sem token`)
    return achado
  }

  it.each([
    ['claro', claro],
    ['escuro', escuro],
  ])('no tema %s o anel, o trilho e a bolinha passam de 3:1', (_nome, t) => {
    const anel = t(usado('.theme__toggle', 'box-shadow'))
    const trilho = t(usado('.theme__toggle', 'background-color'))
    const bolinha = t(usado('.theme__toggle::before', 'background-color'))
    for (const fundo of ['cor-card', 'cor-fundo']) {
      expect(contrasteHex(anel, t(fundo)), `anel sobre ${fundo}`).toBeGreaterThanOrEqual(3)
    }
    expect(contrasteHex(bolinha, trilho), 'bolinha sobre trilho').toBeGreaterThanOrEqual(3)
  })

  it('marcado (escuro): a bolinha continua com 3:1 sobre o trilho marcado', () => {
    const bloco = /\.theme__toggle:checked\s*\{([^}]*)\}/.exec(botao)?.[1] ?? ''
    const marcado = /background-color:\s*var\(--([a-z-]+)\)/.exec(bloco)?.[1] ?? usado('.theme__toggle', 'background-color')
    expect(contrasteHex(escuro(usado('.theme__toggle::before', 'background-color')), escuro(marcado))).toBeGreaterThanOrEqual(3)
  })
})

describe('fluidez e animações', () => {
  it('define animação item-entra e respeita prefers-reduced-motion', () => {
    expect(css).toMatch(/@keyframes item-entra\s*\{/)
    expect(css).toMatch(/\.item-entra\s*\{/)
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.item-entra\s*\{[\s\S]*?animation:\s*none/)
  })

  it('elementos interativos possuem transições suaves que respeitam prefers-reduced-motion', () => {
    expect(css).toMatch(/transition-duration:\s*150ms/)
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?transition:\s*none/)
  })
})

describe('superfícies flutuantes', () => {
  it('declara_os_tokens_de_superficie', () => {
    for (const nome of ['superficie', 'superficie-borda', 'sombra-flutuante', 'fundo-degrade']) {
      expect(token(nome), `--${nome} ausente em :root`).toBeDefined()
    }
    expect(token('superficie')).toContain('color-mix')
    expect(token('superficie')).toContain('var(--cor-card)')
  })

  it('card_e_superficie_usam_os_tokens', () => {
    for (const classe of ['superficie', 'card']) {
      const bloco = new RegExp(`\\.${classe}\\s*\\{([^}]*)\\}`).exec(css)?.[1]
      expect(bloco, `.${classe} ausente`).toBeDefined()
      expect(bloco).toMatch(/background:\s*var\(--superficie\)/)
      expect(bloco).toMatch(/border:\s*1px solid var\(--superficie-borda\)/)
      expect(bloco).toMatch(/box-shadow:\s*var\(--sombra-flutuante\)/)
      expect(bloco).toMatch(/backdrop-filter:\s*blur\(8px\)/)
    }
  })

  it('card_mantem_raio_e_padding', () => {
    const bloco = /\.card\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
    expect(bloco).toMatch(/border-radius:\s*var\(--raio-card\)/)
    expect(bloco).toMatch(/padding:\s*1rem/)
  })

  const presets = ['lima', 'esmeralda', 'indigo']
  const casos = [
    ...['claro', 'escuro'].map((tema) => [tema, 'base'] as const),
    ...['claro', 'escuro'].flatMap((tema) => presets.map((preset) => [tema, preset] as const)),
  ]

  it.each(casos)('superficie_translucida_mantem_contraste_AA (%s, %s)', (tema, preset) => {
    const bloco = (regex: RegExp): string => regex.exec(css)?.[1] ?? ''
    const base =
      tema === 'claro' ? bloco(/:root\s*\{([^}]*)\}/) : bloco(/:root\[data-tema='escuro'\]\s*\{([^}]*)\}/)
    const sobreposto =
      preset === 'base'
        ? ''
        : tema === 'claro'
          ? bloco(new RegExp(`html\\[data-preset='${preset}'\\]\\s*\\{([^}]*)\\}`))
          : bloco(new RegExp(`html\\[data-tema='escuro'\\]\\[data-preset='${preset}'\\]\\s*\\{([^}]*)\\}`))
    if (preset !== 'base') expect(sobreposto, `bloco do preset ${preset} (${tema}) ausente`).not.toBe('')
    const cor = (nome: string): [number, number, number] => {
      const re = new RegExp(`--${nome}:\\s*(#[0-9a-fA-F]{3,6})\\s*;`)
      const valor = re.exec(sobreposto)?.[1] ?? re.exec(base)?.[1]
      if (!valor) throw new Error(`token --${nome} ausente`)
      return rgbDeHex(valor)
    }
    // Pior ponto do degradê: principal a 12% sobre o fundo. Sobre ele, o card entra a 75% (a superfície).
    const piorFundo = misturar(cor('cor-principal'), 0.12, cor('cor-fundo'))
    const superficie = misturar(cor('cor-card'), 0.75, piorFundo)
    for (const texto of ['cor-texto', 'cor-mutado']) {
      expect(contrasteRgb(cor(texto), superficie), `${texto} sobre a superfície`).toBeGreaterThanOrEqual(4.5)
    }
  })
})
