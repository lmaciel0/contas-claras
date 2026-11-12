/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// O Vitest roda com `css: false`, que esvazia `import '...css?raw'`; por isso os arquivos são lidos direto.
// Os dois caminhos partem de `frontend/` (cwd dos testes).
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
const documento = readFileSync(resolve(process.cwd(), '../docs/DESIGN_SYSTEM.md'), 'utf8')
const linhas = documento.split('\n')

/** Bloco `:root { ... }` base (o `:root[data-tema='escuro']` não casa, pois o `[` vem antes da chave). */
const blocoRoot = /:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''

/** Tokens `--cor-*` do `:root` base com valor hexadecimal, na ordem em que aparecem (`nome` sem os dois traços). */
const tokensComHex: Array<{ nome: string; hex: string }> = [...blocoRoot.matchAll(/--(cor-[a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)].map(
  (achado) => ({ nome: achado[1] as string, hex: (achado[2] as string).toLowerCase() }),
)

/** Linhas do documento que citam `--nome` exato (`--cor-principal` não conta como citação de `--cor-principal-clara`). */
function linhasQueCitam(nome: string): string[] {
  const citacao = new RegExp(`--${nome}(?![a-z0-9-])`)
  return linhas.filter((linha) => citacao.test(linha))
}

/** Todos os hexadecimais de uma linha, em minúsculas. */
function hexDaLinha(linha: string): string[] {
  return (linha.match(/#[0-9a-fA-F]{3,8}(?![0-9a-zA-Z])/g) ?? []).map((hex) => hex.toLowerCase())
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
  it('o index.css tem tokens de cor hexadecimais para conferir', () => {
    expect(tokensComHex.length, 'nenhum --cor-* hexadecimal achado em :root (regex quebrada?)').toBeGreaterThan(20)
  })

  it('documenta todo token --cor-* de :root', () => {
    const ausentes = tokensComHex.filter(({ nome }) => linhasQueCitam(nome).length === 0).map(({ nome }) => `--${nome}`)
    expect(ausentes, `tokens de :root ausentes em docs/DESIGN_SYSTEM.md: ${ausentes.join(', ')}`).toEqual([])
  })

  it('usa o mesmo valor do index.css', () => {
    const divergentes = tokensComHex.flatMap(({ nome, hex }) => {
      // A linha que vale é a da tabela de cores (começa com `|`); sem ela, qualquer linha que cite o token.
      const citacoes = linhasQueCitam(nome)
      const daTabela = citacoes.filter((linha) => linha.trimStart().startsWith('|'))
      const candidatas = daTabela.length > 0 ? daTabela : citacoes
      if (candidatas.length === 0) return []
      if (candidatas.some((linha) => hexDaLinha(linha).includes(hex))) return []
      const noDoc = candidatas.flatMap(hexDaLinha)
      return [`--${nome}: index.css=${hex}, documento=${noDoc.length > 0 ? noDoc.join(' ') : '(sem hex na linha)'}`]
    })
    expect(divergentes, `valores divergentes entre o index.css e docs/DESIGN_SYSTEM.md:\n${divergentes.join('\n')}`).toEqual([])
  })

  it('tem as seções obrigatórias, nesta ordem', () => {
    const titulos = linhas.filter((linha) => /^## /.test(linha)).map((linha) => linha.slice(3).trim())
    const ausentes = TITULOS_OBRIGATORIOS.filter((titulo) => !titulos.includes(titulo))
    expect(ausentes, `títulos "## " ausentes: ${ausentes.join('; ')}`).toEqual([])
    const naOrdemDoDocumento = titulos.filter((titulo) => TITULOS_OBRIGATORIOS.includes(titulo))
    expect(naOrdemDoDocumento).toEqual(TITULOS_OBRIGATORIOS)
  })
})
