/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CHAVE_TEMA } from './tema'

const raiz = process.cwd()
const html = readFileSync(resolve(raiz, 'index.html'), 'utf8')
const script = readFileSync(resolve(raiz, 'public/tema-init.js'), 'utf8')

/** Executa o script como o navegador faz: no escopo global, sem módulo. */
function executar() {
  new Function(script)()
}

function meta() {
  return document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
}

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.tema
  document.head.innerHTML = '<meta name="theme-color" content="#27187E" />'
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('index.html', () => {
  it('não tem script inline (a CSP não libera unsafe-inline)', () => {
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    for (const [, atributos, corpo] of scripts) {
      expect(atributos, 'script sem src').toMatch(/\bsrc="/)
      expect(corpo?.trim()).toBe('')
    }
  })

  it('carrega /tema-init.js no head, antes de qualquer CSS', () => {
    const head = /<head>([\s\S]*?)<\/head>/.exec(html)?.[1] ?? ''
    const posScript = head.indexOf('<script src="/tema-init.js"></script>')
    expect(posScript).toBeGreaterThanOrEqual(0)
    for (const marca of ['<link rel="stylesheet"', '<style', '<link rel="icon"', '<link rel="manifest"']) {
      const pos = head.indexOf(marca)
      if (pos >= 0) expect(posScript, marca).toBeLessThan(pos)
    }
  })

  it('theme-color padrão é o roxo da marca', () => {
    expect(html).toMatch(/<meta name="theme-color" content="#27187E"/i)
  })
})

describe('public/tema-init.js', () => {
  it('escolha salva vence o sistema', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    localStorage.setItem(CHAVE_TEMA, 'claro')
    executar()
    expect(document.documentElement.dataset.tema).toBe('claro')
    expect(meta()?.content).toBe('#27187E')
  })

  it('sem escolha usa o sistema escuro e pinta a barra do navegador', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    executar()
    expect(document.documentElement.dataset.tema).toBe('escuro')
    expect(meta()?.content).toBe('#0f0b2b')
  })

  it('sem escolha e sistema claro fica claro', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    executar()
    expect(document.documentElement.dataset.tema).toBe('claro')
  })

  it('valor inválido salvo é ignorado', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    localStorage.setItem(CHAVE_TEMA, 'roxo')
    executar()
    expect(document.documentElement.dataset.tema).toBe('escuro')
  })

  it('sem matchMedia cai no claro', () => {
    vi.stubGlobal('matchMedia', undefined)
    executar()
    expect(document.documentElement.dataset.tema).toBe('claro')
  })

  it('localStorage bloqueado não quebra', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    expect(executar).not.toThrow()
    expect(document.documentElement.dataset.tema).toBe('escuro')
  })

  it('não quebra se a página não tem theme-color', () => {
    document.head.innerHTML = ''
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    expect(executar).not.toThrow()
  })
})
