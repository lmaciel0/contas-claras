/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BotaoTema } from './BotaoTema'
import { CHAVE_TEMA } from './tema'

// O Vitest roda com `css: false`, que esvazia `import '...css?raw'`; por isso o arquivo é lido direto.
const css = readFileSync(resolve(process.cwd(), 'src/tema/botao-tema.css'), 'utf8')

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.tema
  // O jsdom não tem `matchMedia`; sem ele o sistema conta como claro.
  vi.stubGlobal('matchMedia', undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('BotaoTema', () => {
  it('é um switch chamado "Tema escuro", desmarcado no tema claro', () => {
    render(<BotaoTema />)
    expect(screen.getByRole('switch', { name: 'Tema escuro' })).not.toBeChecked()
  })

  it('clicar liga o tema escuro e atualiza data-tema e o storage', async () => {
    render(<BotaoTema />)
    const alternador = screen.getByRole('switch', { name: 'Tema escuro' })

    await userEvent.click(alternador)

    expect(alternador).toBeChecked()
    expect(document.documentElement.dataset.tema).toBe('escuro')
    expect(localStorage.getItem(CHAVE_TEMA)).toBe('escuro')
  })

  it('Espaço no teclado alterna', async () => {
    render(<BotaoTema />)
    const alternador = screen.getByRole('switch', { name: 'Tema escuro' })
    alternador.focus()

    await userEvent.keyboard(' ')

    expect(alternador).toBeChecked()
    await userEvent.keyboard(' ')
    expect(alternador).not.toBeChecked()
    expect(document.documentElement.dataset.tema).toBe('claro')
  })

  it('o CSS respeita prefers-reduced-motion', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  })

  it('o CSS não usa cor fixa fora dos tokens', () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|\bhsl\(|\brgb\(/i)
  })
})
