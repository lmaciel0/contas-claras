/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// O Vitest roda com `css: false`, que esvazia `import '...css?raw'`; por isso os arquivos são lidos direto.
// No ambiente jsdom `import.meta.url` não é `file:`, então os caminhos partem de `frontend/` (cwd dos testes), como em estilos.test.ts.
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const documento = readFileSync(resolve(process.cwd(), '../docs/DESIGN_SYSTEM.md'), 'utf8')
const linhas = documento.split('\n')

/** Conteúdo do bloco `seletor { ... }` (seletor exato no começo da linha), com chaves aninhadas contadas. */
function blocoCss(seletor: string): string {
  const escapado = seletor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const abertura = new RegExp(`(?:^|\\n)\\s*${escapado}\\s*\\{`).exec(css)
  if (!abertura) return ''
  const inicio = abertura.index + abertura[0].length
  let profundidade = 1
  for (let i = inicio; i < css.length; i++) {
    if (css[i] === '{') profundidade++
    else if (css[i] === '}' && --profundidade === 0) return css.slice(inicio, i)
  }
  return ''
}

/** Declarações `--cor-*: valor;` de um bloco, com valor aparado e em minúsculas. */
function tokensCor(bloco: string): Map<string, string> {
  const achados = [...bloco.matchAll(/--(cor-[a-z0-9-]+):\s*([^;]+);/g)]
  // Se a regex perder um token (valor estranho, `;` faltando), a contagem difere da de nomes seguidos de `:`.
  const esperado = (bloco.match(/--cor-[a-z0-9-]+:/g) ?? []).length
  if (achados.length !== esperado) throw new Error(`parser de tokens achou ${achados.length} de ${esperado} declarações --cor-*`)
  return new Map(achados.map((a) => [a[1] as string, (a[2] as string).trim().toLowerCase()]))
}

const claro = tokensCor(blocoCss(':root'))
const escuro = tokensCor(blocoCss(":root[data-tema='escuro']"))

const PRESETS = ['lima', 'esmeralda', 'indigo']
const TOKENS_DO_PRESET = ['cor-principal', 'cor-principal-clara', 'cor-principal-fim']

/** Linhas de tabela entre `## de` e `## ate`, como células aparadas e sem crases. */
function linhasDaTabela(de: string, ate: string): string[][] {
  const inicio = linhas.findIndex((l) => l.trim() === `## ${de}`)
  const fim = linhas.findIndex((l) => l.trim() === `## ${ate}`)
  if (inicio < 0 || fim < inicio) return []
  return linhas
    .slice(inicio + 1, fim)
    .filter((l) => l.trimStart().startsWith('|'))
    .map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim().replace(/`/g, '').toLowerCase()))
}

const tabelaCores = linhasDaTabela('Cores', 'Presets')
const tabelaPresets = linhasDaTabela('Presets', 'Tipografia')

/** Valor de um token no preset: o bloco do preset no tema, senão o do tema (a especificidade de `:root[data-tema]` vence `html[data-preset]`). */
function valorNoPreset(tema: 'claro' | 'escuro', preset: string, token: string): string | undefined {
  const seletor = tema === 'claro' ? `html[data-preset='${preset}']` : `html[data-tema='escuro'][data-preset='${preset}']`
  const doBloco = tokensCor(blocoCss(seletor)).get(token)
  if (doBloco) return doBloco
  return tema === 'claro' ? claro.get(token) : (escuro.get(token) ?? claro.get(token))
}

const TITULOS_OBRIGATORIOS = [
  'Identidade',
  'Cores',
  'Presets',
  'Tipografia',
  'Raio, superfícies e sombras',
  'Espaçamento e primeira dobra no celular',
  'Componentes existentes',
  'Regras de 360 px',
  'Acessibilidade',
  'Referências visuais',
  'O que NÃO fazer',
]

describe('DESIGN_SYSTEM.md contra o index.css', () => {
  it('o index.css tem tokens de cor nos temas claro e escuro, e o documento tem as tabelas', () => {
    expect(claro.size, 'nenhum --cor-* em :root (extração de bloco quebrada?)').toBeGreaterThan(20)
    expect(escuro.size, "nenhum --cor-* em :root[data-tema='escuro']").toBeGreaterThan(20)
    expect(tabelaCores.length, 'tabela de Cores vazia (títulos "## Cores"/"## Presets" mudaram?)').toBeGreaterThan(20)
    expect(tabelaPresets.length, 'tabela de Presets vazia').toBeGreaterThan(PRESETS.length)
  })

  it('tem exatamente uma linha de tabela por token --cor-* de :root, na seção Cores', () => {
    const problemas = [...claro.keys()].flatMap((nome) => {
      const n = tabelaCores.filter((celulas) => celulas[0] === `--${nome}`).length
      return n === 1 ? [] : [`--${nome}: ${n} linhas na tabela de Cores (esperado 1)`]
    })
    expect(problemas, problemas.join('\n')).toEqual([])
  })

  it('coluna Claro = valor de :root; coluna Escuro = valor do tema escuro (ou o do claro sem override)', () => {
    const divergentes = [...claro.entries()].flatMap(([nome, valorClaro]) => {
      const linha = tabelaCores.find((celulas) => celulas[0] === `--${nome}`)
      if (!linha) return [] // a ausência é reportada no teste anterior
      const valorEscuro = escuro.get(nome) ?? valorClaro
      const erros: string[] = []
      if (linha.length !== 4) erros.push(`${linha.length} células (esperado 4: Token, Claro, Escuro, Uso)`)
      if (linha[1] !== valorClaro) erros.push(`Claro: css=${valorClaro}, doc=${linha[1]}`)
      if (linha[2] !== valorEscuro) erros.push(`Escuro: css=${valorEscuro}, doc=${linha[2]}`)
      return erros.map((e) => `--${nome} ${e}`)
    })
    expect(divergentes, `valores divergentes entre o index.css e a tabela de Cores:\n${divergentes.join('\n')}`).toEqual([])
  })

  it('a tabela de Presets bate com os blocos de preset do index.css, nos dois temas', () => {
    const divergentes = PRESETS.flatMap((preset) => {
      const linha = tabelaPresets.find((celulas) => celulas[0] === preset)
      if (!linha) return [`${preset}: linha ausente na tabela de Presets`]
      if (linha.length !== 7) return [`${preset}: ${linha.length} células (esperado 7)`]
      const esperado = [
        ...TOKENS_DO_PRESET.map((t) => valorNoPreset('claro', preset, t)),
        ...TOKENS_DO_PRESET.map((t) => valorNoPreset('escuro', preset, t)),
      ]
      const rotulos = ['Principal (claro)', 'Clara (claro)', 'Fim (claro)', 'Principal (escuro)', 'Clara (escuro)', 'Fim (escuro)']
      return esperado.flatMap((valor, i) => (linha[i + 1] === valor ? [] : [`${preset} ${rotulos[i]}: css=${valor}, doc=${linha[i + 1]}`]))
    })
    expect(divergentes, `presets divergentes:\n${divergentes.join('\n')}`).toEqual([])
  })

  it('tem as seções obrigatórias, nesta ordem', () => {
    const titulos = linhas.filter((linha) => /^## /.test(linha)).map((linha) => linha.slice(3).trim())
    const ausentes = TITULOS_OBRIGATORIOS.filter((titulo) => !titulos.includes(titulo))
    expect(ausentes, `títulos "## " ausentes: ${ausentes.join('; ')}`).toEqual([])
    const naOrdemDoDocumento = titulos.filter((titulo) => TITULOS_OBRIGATORIOS.includes(titulo))
    expect(naOrdemDoDocumento).toEqual(TITULOS_OBRIGATORIOS)
  })
})
