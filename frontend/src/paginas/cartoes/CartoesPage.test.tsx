import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { CartaoResponse, CartoesResponse } from '../../api/tipos'
import { SeletorMes } from '../../layout/SeletorMes'
import { renderComApp } from '../../teste/render'
import { servidor } from '../../teste/servidor'
import { CartoesPage } from './CartoesPage'

const cartao = (parcial: Partial<CartaoResponse> & Pick<CartaoResponse, 'itemId' | 'nome'>): CartaoResponse => ({
  diaVencimento: null,
  fatura: '0.00',
  limite: null,
  uso: null,
  faixa: 'SEM_LIMITE',
  ...parcial,
})

// Valores fictícios, na ordem da API (maior fatura primeiro).
const resposta = (parcial: Partial<CartoesResponse> = {}): CartoesResponse => ({
  totalFaturas: '1920.00',
  limiteTotal: '3000.00',
  usoGeral: '0.6400',
  cartoes: [
    cartao({
      itemId: 1,
      nome: 'Cartão Azul',
      diaVencimento: 5,
      fatura: '730.00',
      limite: '1000.00',
      uso: '0.7300',
      faixa: 'AMARELO',
    }),
    cartao({
      itemId: 2,
      nome: 'Cartão Verde',
      diaVencimento: 25,
      fatura: '200.00',
      limite: '1000.00',
      uso: '0.2000',
      faixa: 'VERDE',
    }),
    cartao({
      itemId: 3,
      nome: 'Cartão Vermelho',
      diaVencimento: 10,
      fatura: '990.00',
      limite: '1000.00',
      uso: '0.9900',
      faixa: 'VERMELHO',
    }),
  ],
  ...parcial,
})

function responderCartoes(corpo: CartoesResponse) {
  const consultas: string[] = []
  servidor.use(
    http.get('/api/cartoes', ({ request }) => {
      consultas.push(new URL(request.url).search)
      return HttpResponse.json(corpo)
    }),
  )
  return consultas
}

function renderizar(rota = '/cartoes?ano=2026&mes=10') {
  return renderComApp(
    <Routes>
      <Route
        path="/cartoes"
        element={
          <>
            <SeletorMes />
            <CartoesPage />
          </>
        }
      />
      <Route path="/categorias" element={<h1>Tela de categorias</h1>} />
    </Routes>,
    rota,
  )
}

/** Cor de preenchimento da barra de uso do cartão. */
const preenchimento = (cartaoRegion: HTMLElement) => within(cartaoRegion).getByRole('meter').firstElementChild

describe('CartoesPage', () => {
  it('cartoes_mostra_faixa_e_percentual', async () => {
    const consultas = responderCartoes(resposta())
    renderizar()

    const azul = await screen.findByRole('region', { name: 'Cartão Azul' })
    expect(consultas).toEqual(['?ano=2026&mes=10'])

    // 0.7300 vira 73%, na cor do amarelo.
    expect(within(azul).getByText('73%')).toBeInTheDocument()
    expect(preenchimento(azul)).toHaveStyle({ backgroundColor: '#E0A100', width: '73%' })
    expect(within(azul).getByRole('meter')).toHaveAttribute('aria-valuenow', '73')
    expect(azul).toHaveTextContent('vence dia 05')
    expect(azul).toHaveTextContent('R$ 730,00')
    expect(azul).toHaveTextContent('de R$ 1.000,00')

    const verde = screen.getByRole('region', { name: 'Cartão Verde' })
    expect(within(verde).getByText('20%')).toBeInTheDocument()
    expect(preenchimento(verde)).toHaveStyle({ backgroundColor: '#2E9E5B', width: '20%' })
    expect(verde).toHaveTextContent('vence dia 25')

    const vermelho = screen.getByRole('region', { name: 'Cartão Vermelho' })
    expect(within(vermelho).getByText('99%')).toBeInTheDocument()
    expect(preenchimento(vermelho)).toHaveStyle({ backgroundColor: '#D64545', width: '99%' })

    // Resumo do mês.
    expect(within(screen.getByRole('region', { name: 'Faturas do mês' })).getByText('R$ 1.920,00')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Limite total' })).getByText('R$ 3.000,00')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Uso geral' })).getByText('64%')).toBeInTheDocument()

    // Ordem da API: maior fatura primeiro.
    const nomes = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(nomes).toEqual(['Cartão Azul', 'Cartão Verde', 'Cartão Vermelho'])
  })

  it('uso_acima_de_100_enche_a_barra_e_mostra_o_percentual_real', async () => {
    responderCartoes(
      resposta({
        cartoes: [
          cartao({
            itemId: 1,
            nome: 'Cartão Estourado',
            fatura: '1200.00',
            limite: '1000.00',
            uso: '1.2000',
            faixa: 'VERMELHO',
          }),
        ],
      }),
    )
    renderizar()

    const estourado = await screen.findByRole('region', { name: 'Cartão Estourado' })
    expect(within(estourado).getByText('120%')).toBeInTheDocument()
    expect(preenchimento(estourado)).toHaveStyle({ width: '100%' })
    expect(within(estourado).getByRole('meter')).toHaveAttribute('aria-valuenow', '100')
  })

  it('cartao_sem_limite_mostra_cadastrar_limite', async () => {
    responderCartoes(
      resposta({
        cartoes: [cartao({ itemId: 4, nome: 'Cartão Cinza', diaVencimento: 8, fatura: '321.50' })],
        limiteTotal: '0.00',
        usoGeral: null,
      }),
    )
    renderizar()

    const cinza = await screen.findByRole('region', { name: 'Cartão Cinza' })
    const link = within(cinza).getByRole('link', { name: 'Cadastrar limite' })
    expect(link).toHaveAttribute('href', '/categorias')
    expect(cinza).toHaveTextContent('R$ 321,50')
    expect(cinza).toHaveTextContent('vence dia 08')
    // Sem limite não há barra nem percentual.
    expect(within(cinza).queryByRole('meter')).not.toBeInTheDocument()
    expect(within(cinza).queryByText(/%/)).not.toBeInTheDocument()

    await userEvent.click(link)
    expect(await screen.findByRole('heading', { name: 'Tela de categorias' })).toBeInTheDocument()
  })

  it('uso_geral_null_mostra_traco', async () => {
    responderCartoes(
      resposta({
        cartoes: [cartao({ itemId: 4, nome: 'Cartão Cinza', fatura: '321.50' })],
        totalFaturas: '321.50',
        limiteTotal: '0.00',
        usoGeral: null,
      }),
    )
    renderizar()

    const uso = await screen.findByRole('region', { name: 'Uso geral' })
    expect(within(uso).getByText('—')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Faturas do mês' })).getByText('R$ 321,50')).toBeInTheDocument()
  })

  it('mostra_a_nota_sobre_o_limite_do_banco', async () => {
    responderCartoes(resposta())
    renderizar()

    expect(
      await screen.findByText('O limite do banco também desconta parcelas futuras, que o app não conhece.'),
    ).toBeInTheDocument()
  })

  it('cartao_sem_dia_de_vencimento_nao_mostra_vence_dia', async () => {
    responderCartoes(
      resposta({
        cartoes: [cartao({ itemId: 1, nome: 'Cartão Azul', fatura: '10.00', limite: '100.00', uso: '0.1000', faixa: 'VERDE' })],
      }),
    )
    renderizar()

    const azul = await screen.findByRole('region', { name: 'Cartão Azul' })
    expect(azul).not.toHaveTextContent('vence dia')
  })

  it('sem_cartoes_explica_como_cadastrar', async () => {
    responderCartoes(resposta({ cartoes: [], totalFaturas: '0.00', limiteTotal: '0.00', usoGeral: null }))
    renderizar()

    expect(await screen.findByText(/Nenhum cartão cadastrado/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Categorias' })).toHaveAttribute('href', '/categorias')
  })

  it('troca_de_mes_busca_as_faturas_do_novo_mes', async () => {
    const consultas = responderCartoes(resposta())
    renderizar()
    await screen.findByRole('region', { name: 'Cartão Azul' })

    await userEvent.click(screen.getByRole('button', { name: /Mês seguinte/ }))

    await waitFor(() => expect(consultas).toEqual(['?ano=2026&mes=10', '?ano=2026&mes=11']))
  })

  it('erro_mostra_a_mensagem_e_tenta_de_novo', async () => {
    let falhar = true
    servidor.use(
      http.get('/api/cartoes', () =>
        falhar ? HttpResponse.json({ erro: 'Algo deu errado no servidor.' }, { status: 500 }) : HttpResponse.json(resposta()),
      ),
    )
    renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Algo deu errado no servidor.')

    falhar = false
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByRole('region', { name: 'Cartão Azul' })).toBeInTheDocument()
  })
})
