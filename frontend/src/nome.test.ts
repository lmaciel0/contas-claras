/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const raizFront = process.cwd()
const nomeAntigo = 'Contas Claras'

/** Lista, recursivamente, os .ts/.tsx de uma pasta. */
function fontes(pasta: string): string[] {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = join(pasta, entrada.name)
    if (entrada.isDirectory()) return fontes(caminho)
    return /\.tsx?$/.test(entrada.name) ? [caminho] : []
  })
}

describe('nome do produto', () => {
  it('nenhum arquivo visível do frontend nem o README diz "Contas Claras"', () => {
    const arquivos = [
      resolve(raizFront, 'index.html'),
      resolve(raizFront, 'public/manifest.webmanifest'),
      resolve(raizFront, '../README.md'),
      ...fontes(resolve(raizFront, 'src')).filter((f) => !f.endsWith('nome.test.ts')),
    ]

    const comNomeAntigo = arquivos
      .filter((arquivo) => readFileSync(arquivo, 'utf8').includes(nomeAntigo))
      .map((arquivo) => relative(raizFront, arquivo))

    expect(comNomeAntigo).toEqual([])
  })

  it('o manifest se chama Aprumo', () => {
    const manifest = JSON.parse(
      readFileSync(resolve(raizFront, 'public/manifest.webmanifest'), 'utf8'),
    ) as { name: string; short_name: string; description: string }

    expect(manifest.name).toBe('Aprumo')
    expect(manifest.short_name).toBe('Aprumo')
    expect(manifest.description).toBe(
      'Aprumo: suas finanças, e em breve tarefas e agenda, no mesmo lugar.',
    )
  })
})
