import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Outlet, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { ContextoShell } from '../../layout/contextoShell'
import { renderComApp } from '../../teste/render'
import { servidor } from '../../teste/servidor'
import { MaisPage } from './MaisPage'

function renderizar(rota = '/mais', contexto: Partial<ContextoShell> = {}) {
  const completo: ContextoShell = {
    nomeUsuario: 'Ana Souza',
    aoSair: vi.fn(),
    aoAbrirPreferencias: vi.fn(),
    ...contexto,
  }
  renderComApp(
    <Routes>
      <Route element={<Outlet context={completo} />}>
        <Route path="/mais" element={<MaisPage />} />
      </Route>
    </Routes>,
    rota,
  )
  return completo
}

describe('MaisPage', () => {
  it('tem o título "Mais" como h1', () => {
    renderizar()
    expect(screen.getByRole('heading', { level: 1, name: 'Mais' })).toBeInTheDocument()
  })

  it('mostra o nome do usuário e a inicial no cartão', () => {
    renderizar()
    expect(screen.getByText('Ana Souza')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('lista os atalhos com o destino certo', () => {
    renderizar()
    expect(screen.queryByRole('link', { name: 'Tarefas' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Projetos' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Visão geral' })).toHaveAttribute('href', expect.stringMatching(/^\/financeiro\?ano=\d{4}&mes=\d{1,2}$/))
    expect(screen.getByRole('link', { name: 'Cartões' })).toHaveAttribute('href', expect.stringMatching(/^\/cartoes\?ano=\d{4}&mes=\d{1,2}$/))
    expect(screen.getByRole('link', { name: 'Categorias' })).toHaveAttribute('href', '/categorias')
    expect(screen.getByRole('link', { name: 'Relatórios' })).toHaveAttribute('href', '/relatorios')
  })

  it('Visão geral e Cartões levam o mês que está na URL', () => {
    renderizar('/mais?ano=2026&mes=10')
    expect(screen.getByRole('link', { name: 'Visão geral' })).toHaveAttribute('href', '/financeiro?ano=2026&mes=10')
    expect(screen.getByRole('link', { name: 'Cartões' })).toHaveAttribute('href', '/cartoes?ano=2026&mes=10')
    expect(screen.queryByRole('link', { name: 'Tarefas' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Projetos' })).not.toBeInTheDocument()
  })

  it('tem os links de conta e a política de privacidade', () => {
    renderizar()
    expect(screen.getByRole('link', { name: 'Alterar senha' })).toHaveAttribute('href', '/conta/senha')
    expect(screen.getByRole('link', { name: 'Excluir conta' })).toHaveAttribute('href', '/conta/excluir')
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade')
  })

  it('"Exportar meus dados" é um botão com ícone, entre "Alterar senha" e "Excluir conta"', () => {
    renderizar()
    const exportar = screen.getByRole('button', { name: 'Exportar meus dados' })
    expect(exportar.firstElementChild?.tagName.toLowerCase()).toBe('svg')
    const senha = screen.getByRole('link', { name: 'Alterar senha' })
    const excluir = screen.getByRole('link', { name: 'Excluir conta' })
    expect(senha.compareDocumentPosition(exportar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(exportar.compareDocumentPosition(excluir) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('"Exportar meus dados" chama a API e mostra o erro se falhar', async () => {
    let chamadas = 0
    servidor.use(
      http.get('/api/auth/conta/exportacao', () => {
        chamadas += 1
        return HttpResponse.json({ erro: 'x' }, { status: 500 })
      }),
    )
    renderizar()

    await userEvent.click(screen.getByRole('button', { name: 'Exportar meus dados' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível exportar. Tente de novo.')
    expect(chamadas).toBe(1)
  })

  it('"Exportar meus dados" usa aria-disabled durante a exportação e avisa "Dados exportados." no fim', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:x') as unknown as typeof URL.createObjectURL
    URL.revokeObjectURL = vi.fn() as unknown as typeof URL.revokeObjectURL
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    let liberar: () => void = () => {}
    const portao = new Promise<void>((resolver) => {
      liberar = resolver
    })
    servidor.use(
      http.get('/api/auth/conta/exportacao', async () => {
        await portao
        return HttpResponse.json({ ok: true })
      }),
    )
    renderizar()

    await userEvent.click(screen.getByRole('button', { name: 'Exportar meus dados' }))

    const ocupado = screen.getByRole('button', { name: 'Exportando…' })
    expect(ocupado).toHaveAttribute('aria-disabled', 'true')
    expect(ocupado).not.toBeDisabled()
    liberar()
    expect(await screen.findByRole('status')).toHaveTextContent('Dados exportados.')
    expect(screen.getByRole('button', { name: 'Exportar meus dados' })).toHaveAttribute('aria-disabled', 'false')
  })

  it('"Preferências" chama aoAbrirPreferencias', async () => {
    const { aoAbrirPreferencias } = renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Preferências' }))
    expect(aoAbrirPreferencias).toHaveBeenCalledTimes(1)
  })

  it('"Sair" chama aoSair', async () => {
    const { aoSair } = renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))
    expect(aoSair).toHaveBeenCalledTimes(1)
  })

  it('cada linha tem alvo de toque de 44 px e usa só tokens de cor', () => {
    renderizar()
    for (const elemento of [...screen.getAllByRole('link'), ...screen.getAllByRole('button')]) {
      expect(elemento).toHaveClass('min-h-11')
      expect(elemento.className).not.toMatch(/#[0-9a-f]{3,6}|rgb\(|(bg|text|border)-(white|black|gray|slate|zinc|red)/i)
    }
  })

  it('com nome ausente mostra "Minha conta" e a inicial M', () => {
    renderizar('/mais', { nomeUsuario: undefined })
    expect(screen.getByRole('heading', { name: 'Mais' })).toBeInTheDocument()
    expect(screen.getByText('Minha conta')).toBeInTheDocument()
    expect(screen.getByText('M')).toBeInTheDocument()
    expect(screen.queryByText('?')).not.toBeInTheDocument()
  })

  it('com nome só de espaços usa o texto de reserva', () => {
    renderizar('/mais', { nomeUsuario: '   ' })
    expect(screen.getByText('Minha conta')).toBeInTheDocument()
    expect(screen.getByText('M')).toBeInTheDocument()
  })

  it('fora do AppShell lança erro claro', () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() =>
      renderComApp(
        <Routes>
          <Route path="/mais" element={<MaisPage />} />
        </Routes>,
        '/mais',
      ),
    ).toThrow('useContextoShell precisa estar dentro do AppShell.')
    erro.mockRestore()
  })
})
