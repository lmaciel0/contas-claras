import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '../../auth/AuthProvider'
import { RotaProtegida } from '../../auth/RotaProtegida'
import { comSessao } from '../../teste/auth'
import { renderComApp } from '../../teste/render'
import { servidor } from '../../teste/servidor'
import { montarNotaFixada, notaComCaixinhas } from './notaFixadaTeste'
import { PainelPage } from './PainelPage'

describe('NotaFixada', () => {
  it('mostraTituloConteudoECorDaCategoria', async () => {
    montarNotaFixada()

    const card = (await screen.findByText('Compras da semana')).closest('section')!
    expect(within(card).getByRole('heading', { name: 'Nota fixada' })).toBeInTheDocument()
    expect(await within(card).findByText('Lembrar da lista')).toBeInTheDocument()
    expect(within(card).getAllByRole('checkbox')).toHaveLength(3)
    await within(card).findByText('Categoria Casa')
    expect(within(card).getByTestId('bolinha-categoria').style.backgroundColor).toBe('var(--cor-nota-verde)')
  })

  it('semNotaFixadaMostraConvite', async () => {
    montarNotaFixada(null)

    expect(await screen.findByText(/Fixe uma nota para vê-la aqui\./)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir para as notas' })).toHaveAttribute('href', '/notas')
  })

  it('linkAbrirNotaApontaParaAEdicao', async () => {
    montarNotaFixada()

    expect(await screen.findByRole('link', { name: 'Abrir nota' })).toHaveAttribute('href', '/notas/7')
  })

  it('linkVerTodasApontaParaNotas', async () => {
    montarNotaFixada(notaComCaixinhas({ categoriaId: null }))

    expect(await screen.findByRole('link', { name: 'Ver todas' })).toHaveAttribute('href', '/notas')
    expect((await screen.findByTestId('bolinha-categoria')).style.backgroundColor).toBe('var(--cor-mutado)')
  })

  it('erroNaApiMostraMensagemNoCardENaoQuebraOPainel', async () => {
    servidor.use(http.get('/api/notas/fixada', () => HttpResponse.json({ mensagem: 'Falha geral' }, { status: 500 })))
    comSessao()
    renderComApp(
      <AuthProvider>
        <Routes>
          <Route element={<RotaProtegida />}>
            <Route path="/" element={<PainelPage />} />
          </Route>
        </Routes>
      </AuthProvider>,
    )

    const card = (await screen.findByRole('heading', { name: 'Nota fixada' })).closest('section')!
    expect(await within(card).findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Hoje' })).toBeInTheDocument()
  })

  it('carregandoNaoBloqueiaASaudacao', async () => {
    servidor.use(http.get('/api/notas/fixada', () => new Promise<never>(() => {})))
    comSessao()
    renderComApp(
      <AuthProvider>
        <Routes>
          <Route element={<RotaProtegida />}>
            <Route path="/" element={<PainelPage />} />
          </Route>
        </Routes>
      </AuthProvider>,
    )

    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    const card = screen.getByRole('heading', { name: 'Nota fixada' }).closest('section')!
    expect(card.querySelector('[aria-busy="true"]')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Hoje' })).toBeInTheDocument()
  })
})
