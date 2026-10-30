import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/cliente'
import { renderComApp } from '../teste/render'
import { servidor } from '../teste/servidor'
import { AppShell } from './AppShell'

function definirLargura(largura: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: largura })
  window.dispatchEvent(new Event('resize'))
}

function renderizar(rota = '/?ano=2026&mes=10', aoSair = vi.fn()) {
  renderComApp(
    <Routes>
      <Route element={<AppShell nomeUsuario="Ana" aoSair={aoSair} />}>
        <Route path="/" element={<p>Conteúdo do Início</p>} />
        <Route path="/lancamentos" element={<p>Conteúdo dos Lançamentos</p>} />
      </Route>
    </Routes>,
    rota,
  )
  return { aoSair }
}

const nomesDosLinks = (nav: HTMLElement) =>
  within(nav)
    .getAllByRole('link')
    .map((link) => link.getAttribute('aria-label') ?? link.textContent)

describe('AppShell no celular (390 px)', () => {
  it('mostra a navbar inferior com 5 itens na ordem Início, Lançamentos, Novo lançamento, Cartões, Relatórios', () => {
    definirLargura(390)
    renderizar()

    const nav = screen.getByRole('navigation', { name: 'Navegação principal' })

    expect(nomesDosLinks(nav)).toEqual(['Início', 'Lançamentos', 'Novo lançamento', 'Cartões', 'Relatórios'])
    expect(screen.queryByRole('navigation', { name: 'Abas' })).not.toBeInTheDocument()
  })

  it('o (+) central leva para /lancamentos/novo mantendo o mês', () => {
    definirLargura(390)
    renderizar()

    const novo = screen.getByRole('link', { name: 'Novo lançamento' })

    expect(novo).toHaveAttribute('href', '/lancamentos/novo?ano=2026&mes=10')
  })

  it('Categorias e Sair ficam no menu do perfil, no topo', async () => {
    definirLargura(390)
    const { aoSair } = renderizar()
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' })
    expect(within(nav).queryByText('Categorias')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Menu do usuário' }))

    const opcoes = screen.getByRole('group', { name: 'Opções da conta' })
    expect(within(opcoes).getByRole('link', { name: 'Categorias' })).toHaveAttribute('href', '/categorias?ano=2026&mes=10')
    await userEvent.click(within(opcoes).getByRole('button', { name: 'Sair' }))
    expect(aoSair).toHaveBeenCalledTimes(1)
  })
})

describe('AppShell no computador (1280 px)', () => {
  it('mostra as abas do topo com Categorias e esconde a navbar inferior', () => {
    definirLargura(1280)
    renderizar()

    const abas = screen.getByRole('navigation', { name: 'Abas' })

    expect(nomesDosLinks(abas)).toEqual(['Início', 'Lançamentos', 'Cartões', 'Categorias', 'Relatórios'])
    expect(screen.queryByRole('navigation', { name: 'Navegação principal' })).not.toBeInTheDocument()
  })

  it('mostra o botão + Lançar e o menu do usuário sem Categorias', async () => {
    definirLargura(1280)
    renderizar()

    expect(screen.getByRole('link', { name: '+ Lançar' })).toHaveAttribute('href', '/lancamentos/novo?ano=2026&mes=10')

    await userEvent.click(screen.getByRole('button', { name: 'Menu do usuário' }))

    const opcoes = screen.getByRole('group', { name: 'Opções da conta' })
    expect(within(opcoes).getByRole('link', { name: 'Alterar senha' })).toHaveAttribute('href', '/conta/senha')
    expect(within(opcoes).getByRole('button', { name: 'Sair' })).toBeInTheDocument()
    expect(within(opcoes).queryByRole('link', { name: 'Categorias' })).not.toBeInTheDocument()
  })

  it('marca a aba da rota atual', () => {
    definirLargura(1280)
    renderizar('/lancamentos?ano=2026&mes=10')

    expect(screen.getByRole('link', { name: 'Lançamentos' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current')
  })
})

describe('seletor de mês', () => {
  it('mostra o mês da URL e navega para o seguinte e o anterior', async () => {
    definirLargura(1280)
    renderizar('/?ano=2026&mes=12')
    expect(screen.getByText('Dezembro 2026')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Mês seguinte' }))
    expect(screen.getByText('Janeiro 2027')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Mês anterior' }))
    await userEvent.click(screen.getByRole('button', { name: 'Mês anterior' }))
    expect(screen.getByText('Novembro 2026')).toBeInTheDocument()
  })

  it('o mês escolhido acompanha a navegação entre abas', async () => {
    definirLargura(1280)
    renderizar('/?ano=2026&mes=10')

    await userEvent.click(screen.getByRole('button', { name: 'Mês seguinte' }))

    expect(screen.getByRole('link', { name: 'Lançamentos' })).toHaveAttribute('href', '/lancamentos?ano=2026&mes=11')
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
