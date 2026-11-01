import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { comSessao } from '../../teste/auth'
import { renderComApp } from '../../teste/render'
import { servidor } from '../../teste/servidor'
import { montarNotaFixada, notaComCaixinhas } from './notaFixadaTeste'
import { NotaFixada } from './NotaFixada'

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

  it('erroNaApiMostraMensagemNoCard', async () => {
    servidor.use(http.get('/api/notas/fixada', () => HttpResponse.json({ mensagem: 'Falha geral' }, { status: 500 })))
    comSessao()
    renderComApp(<NotaFixada />)

    const card = (await screen.findByRole('heading', { name: 'Nota fixada' })).closest('section')!
    expect(await within(card).findByRole('alert')).toBeInTheDocument()
  })

  it('carregandoMostraEstadoAriaBusy', async () => {
    servidor.use(http.get('/api/notas/fixada', () => new Promise<never>(() => {})))
    comSessao()
    renderComApp(<NotaFixada />)

    const card = screen.getByRole('heading', { name: 'Nota fixada' }).closest('section')!
    expect(card.querySelector('[aria-busy="true"]')).toBeInTheDocument()
  })
})
