import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/cliente'
import { renderComApp } from '../teste/render'
import { servidor } from '../teste/servidor'
import { AppShell } from './AppShell'

beforeEach(() => {
  localStorage.clear()
})

function definirLargura(largura: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: largura })
  window.dispatchEvent(new Event('resize'))
}

function renderizar(rota = '/?ano=2026&mes=10', aoSair = vi.fn()) {
  renderComApp(
    <Routes>
      <Route element={<AppShell nomeUsuario="Ana" aoSair={aoSair} />}>
        <Route path="/" element={<p>Conteúdo do Início</p>} />
        <Route path="/formulario" element={<input aria-label="Descrição" />} />
        <Route path="/lancamentos" element={<p>Conteúdo dos Lançamentos</p>} />
        <Route path="/cartoes" element={<p>Conteúdo dos Cartões</p>} />
        <Route path="/categorias" element={<p>Conteúdo das Categorias</p>} />
        <Route path="/relatorios" element={<p>Conteúdo dos Relatórios</p>} />
      </Route>
    </Routes>,
    rota,
  )
  return { aoSair }
}

describe('AppShell no computador (1280 px ou mais)', () => {
  it.each([1280, 1440])('em %i px mostra a sidebar e nenhum botão de menu', (largura) => {
    definirLargura(largura)
    renderizar()

    expect(screen.getByRole('navigation', { name: 'Menu principal' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Abrir menu' })).not.toBeInTheDocument()
    expect(screen.getByText('Conteúdo do Início')).toBeInTheDocument()
  })
})

describe('AppShell abaixo de 1280 px', () => {
  it.each([390, 768, 1279])('em %i px mostra "Abrir menu" fechado e esconde a sidebar', (largura) => {
    definirLargura(largura)
    renderizar()

    const botao = screen.getByRole('button', { name: 'Abrir menu' })

    expect(botao).toHaveAttribute('aria-expanded', 'false')
    expect(botao).not.toHaveAttribute('aria-controls')
    expect(botao).toHaveClass('min-h-11', 'min-w-11')
    expect(screen.queryByRole('navigation', { name: 'Menu principal' })).not.toBeInTheDocument()
  })

  it('abrir o menu mostra o painel; Esc fecha e devolve o foco ao botão', async () => {
    definirLargura(390)
    renderizar()
    const botao = screen.getByRole('button', { name: 'Abrir menu' })

    await userEvent.click(botao)

    expect(botao).toHaveAttribute('aria-expanded', 'true')
    const painel = screen.getByRole('dialog', { name: 'Menu' })
    expect(botao).toHaveAttribute('aria-controls', painel.id)
    expect(within(painel).getByRole('navigation', { name: 'Menu principal' })).toBeInTheDocument()
    expect(painel.contains(document.activeElement)).toBe(true)

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
    expect(botao).toHaveAttribute('aria-expanded', 'false')
    expect(botao).toHaveFocus()
  })

  it('clicar no fundo escurecido fecha o painel', async () => {
    definirLargura(390)
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))

    await userEvent.click(screen.getByTestId('fundo-do-menu'))

    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
  })

  it('clicar num link do painel navega e fecha o painel', async () => {
    definirLargura(390)
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))

    await userEvent.click(within(screen.getByRole('dialog', { name: 'Menu' })).getByRole('link', { name: 'Cartões' }))

    expect(screen.getByText('Conteúdo dos Cartões')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
  })

  it('Sair no painel chama aoSair', async () => {
    definirLargura(390)
    const { aoSair } = renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))

    expect(aoSair).toHaveBeenCalledTimes(1)
  })

  it('o Tab fica preso dentro do painel', async () => {
    definirLargura(390)
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
    const painel = screen.getByRole('dialog', { name: 'Menu' })

    for (let i = 0; i < 30; i++) {
      await userEvent.tab()
      expect(painel.contains(document.activeElement)).toBe(true)
    }
    for (let i = 0; i < 30; i++) {
      await userEvent.tab({ shift: true })
      expect(painel.contains(document.activeElement)).toBe(true)
    }
  })

  it('redimensionar para 1280 px ou mais com o painel aberto fecha o painel e mostra a sidebar fixa', async () => {
    definirLargura(1279)
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))

    act(() => definirLargura(1280))

    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Abrir menu' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('navigation', { name: 'Menu principal' })).toHaveLength(1)

    act(() => definirLargura(1279))

    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('troca de layout ao cruzar 1280 px', () => {
  it('o foco vai para o main quando o painel aberto some por redimensionamento', async () => {
    definirLargura(1279)
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))

    act(() => definirLargura(1280))

    expect(screen.getByRole('main')).toHaveFocus()
  })

  it('o foco não é roubado quando o painel fecha pelo teclado', async () => {
    definirLargura(1279)
    renderizar()
    const botao = screen.getByRole('button', { name: 'Abrir menu' })
    await userEvent.click(botao)
    await userEvent.keyboard('{Escape}')

    expect(botao).toHaveFocus()
    expect(screen.getByRole('main')).not.toHaveFocus()
  })

  it('a página não remonta: o que foi digitado sobrevive ao cruzar o breakpoint nos dois sentidos', async () => {
    definirLargura(1440)
    renderizar('/formulario?ano=2026&mes=10')
    const campo = screen.getByRole('textbox', { name: 'Descrição' })
    await userEvent.type(campo, 'Mercado')

    act(() => definirLargura(390))
    expect(screen.getByRole('textbox', { name: 'Descrição' })).toBe(campo)
    expect(campo).toHaveValue('Mercado')

    act(() => definirLargura(1440))
    expect(screen.getByRole('textbox', { name: 'Descrição' })).toBe(campo)
    expect(campo).toHaveValue('Mercado')
  })
})

describe('trava de rolagem', () => {
  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('abrir o menu trava o body e fechar restaura', async () => {
    definirLargura(390)
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
    expect(document.body.style.overflow).toBe('hidden')

    await userEvent.keyboard('{Escape}')
    expect(document.body.style.overflow).toBe('')
  })
})

describe('moldura', () => {
  it.each([390, 1280])('não existe navegação inferior em %i px', (largura) => {
    definirLargura(largura)
    renderizar()

    expect(screen.queryByRole('navigation', { name: 'Navegação principal' })).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Abas' })).not.toBeInTheDocument()
  })

  it.each([390, 1280])('o logo diz Aprumo e leva a / em %i px', (largura) => {
    definirLargura(largura)
    renderizar('/lancamentos?ano=2026&mes=10')

    expect(screen.getByRole('link', { name: 'Aprumo' })).toHaveAttribute('href', '/')
    expect(screen.queryByText(/contas claras/i)).not.toBeInTheDocument()
  })

  it('o conteúdo da rota aparece dentro de main', () => {
    definirLargura(1280)
    renderizar('/lancamentos?ano=2026&mes=10')

    expect(within(screen.getByRole('main')).getByText('Conteúdo dos Lançamentos')).toBeInTheDocument()
  })
})

describe('aviso de servidor acordando', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('aparece depois de 3 s sem resposta e some quando a API responde', async () => {
    definirLargura(1280)
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    servidor.use(
      http.get('/api/resumo', async () => {
        await delay(5000)
        return HttpResponse.json({})
      }),
    )
    renderizar()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    void api('/api/resumo')
    await act(() => vi.advanceTimersByTimeAsync(3100))
    expect(screen.getByRole('status')).toHaveTextContent('Acordando o servidor… isso pode levar até 1 minuto')

    await act(() => vi.advanceTimersByTimeAsync(2500))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
