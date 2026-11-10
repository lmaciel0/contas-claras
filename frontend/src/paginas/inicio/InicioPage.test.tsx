import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { CartaoResponse, CartoesResponse, PontoSerie, ResumoResponse } from '../../api/tipos'
import { renderComApp } from '../../teste/render'
import { servidor } from '../../teste/servidor'
import { InicioPage } from './InicioPage'

const zeroSerie = (): PontoSerie[] =>
  Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    receitas: '0.00',
    receitasPrevistas: '0.00',
    despesas: '0.00',
    despesasPrevistas: '0.00',
  }))

// Valores fictícios.
const resumo = (parcial: Partial<ResumoResponse> = {}): ResumoResponse => ({
  receitas: '5000.00',
  despesas: '4200.50',
  sobra: '799.50',
  sobraAno: '-1234.00',
  anterior: { receitas: '4000.00', despesas: '5000.00', sobra: '-1000.00' },
  categorias: [
    { categoriaId: 3, nome: 'Moradia', total: '3000.00', percentual: '0.7142' },
    { categoriaId: 4, nome: 'Transporte', total: '900.50', percentual: '0.2144' },
    { categoriaId: 5, nome: 'Lazer', total: '300.00', percentual: '0.0714' },
  ],
  proximas: [
    {
      lancamentoId: 10,
      itemNome: 'Conta de luz',
      categoriaNome: 'Moradia',
      valor: '180.40',
      vencimento: '2026-10-05',
      atrasada: true,
    },
    {
      lancamentoId: 11,
      itemNome: 'Internet',
      categoriaNome: 'Moradia',
      valor: '99.90',
      vencimento: '2026-11-10',
      atrasada: false,
    },
  ],
  serieAno: zeroSerie(),
  ...parcial,
})

function responderResumo(corpo: ResumoResponse) {
  const consultas: string[] = []
  servidor.use(
    http.get('/api/resumo', ({ request }) => {
      consultas.push(new URL(request.url).search)
      return HttpResponse.json(corpo)
    }),
  )
  return consultas
}

const cartaoAurora: CartaoResponse = {
  itemId: 1,
  nome: 'Aurora',
  diaVencimento: 10,
  fatura: '2558.05',
  limite: '3000.00',
  uso: '0.8527',
  faixa: 'AMARELO',
  titular: null,
}

function responderCartoes(cartoes: CartaoResponse[] = [cartaoAurora]) {
  const consultas: string[] = []
  const corpo: CartoesResponse = { totalFaturas: '2558.05', limiteTotal: '3000.00', usoGeral: '0.8527', cartoes }
  servidor.use(
    http.get('/api/cartoes', ({ request }) => {
      consultas.push(new URL(request.url).search)
      return HttpResponse.json(corpo)
    }),
  )
  return consultas
}

function renderizar(rota = '/?ano=2026&mes=10') {
  renderComApp(
    <Routes>
      <Route
        path="/"
        element={<InicioPage />}
      />
    </Routes>,
    rota,
  )
}

const bloco = (nome: string) => screen.findByRole('region', { name: nome })

describe('InicioPage', () => {
  it('nao_mostra_subtitulo_no_cabecalho', async () => {
    responderResumo(resumo())
    responderCartoes()
    renderizar()

    await screen.findByRole('heading', { level: 1, name: 'Visão geral' })
    expect(screen.queryByText('Quanto sobra e para onde vai o seu dinheiro.')).not.toBeInTheDocument()
  })

  it('titulo_da_tela_e_visao_geral_e_a_faixa_financeira_aparece', async () => {
    responderResumo(resumo())
    renderizar()

    expect(await screen.findByRole('heading', { name: 'Visão geral' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '+ Lançar' })).toHaveAttribute('href', '/lancamentos/novo?ano=2026&mes=10')
  })

  it('mostra_sobra_receitas_e_despesas_formatadas', async () => {
    responderResumo(resumo())
    renderizar()

    const sobra = await bloco('Sobra do mês')
    expect(within(sobra).getByText('R$ 799,50')).toBeInTheDocument()
    expect(within(sobra).getByText('No ano: − R$ 1.234,00')).toBeInTheDocument()
    expect(within(sobra).getByText('R$ 1.799,50 melhor que setembro')).toBeInTheDocument()
    expect(within(await bloco('Receitas')).getByText('R$ 5.000,00')).toBeInTheDocument()
    expect(within(await bloco('Despesas')).getByText('R$ 4.200,50')).toBeInTheDocument()
  })

  it('sobra_negativa_vai_com_sinal_menos', async () => {
    responderResumo(resumo({ sobra: '-6.20', anterior: { receitas: '1.00', despesas: '1.00', sobra: '0.00' } }))
    renderizar()

    const sobra = await bloco('Sobra do mês')
    expect(within(sobra).getByText('− R$ 6,20')).toBeInTheDocument()
    expect(within(sobra).getByText('R$ 6,20 pior que setembro')).toBeInTheDocument()
  })

  it('sobra_mostra_percentual_da_receita', async () => {
    responderResumo(resumo())
    renderizar()

    expect(within(await bloco('Sobra do mês')).getByText('+16% da receita')).toBeInTheDocument()
  })

  it('sobra_negativa_mostra_percentual_com_sinal_menos', async () => {
    responderResumo(resumo({ sobra: '-1884.20', receitas: '5270.00' }))
    renderizar()

    expect(within(await bloco('Sobra do mês')).getByText('−36% da receita')).toBeInTheDocument()
  })

  it('esconde_percentual_quando_receita_e_zero', async () => {
    responderResumo(resumo({ sobra: '-100.00', receitas: '0.00' }))
    renderizar()

    expect(within(await bloco('Sobra do mês')).queryByText(/da receita/)).not.toBeInTheDocument()
  })

  it('chips_de_variacao_receita_que_cai_e_vermelha_despesa_que_cai_e_verde', async () => {
    responderResumo(
      resumo({
        receitas: '670.00',
        despesas: '500.00',
        anterior: { receitas: '1000.00', despesas: '1000.00', sobra: '0.00' },
      }),
    )
    renderizar()

    const chipReceitas = within(await bloco('Receitas')).getByText('↓ 33% vs setembro')
    const chipDespesas = within(await bloco('Despesas')).getByText('↓ 50% vs setembro')
    expect(chipReceitas).toHaveAttribute('data-tom', 'ruim')
    expect(chipDespesas).toHaveAttribute('data-tom', 'bom')
    // Texto dos chips no tom escuro (contraste AA sobre o fundo claro).
    expect(chipReceitas).toHaveClass('text-[var(--cor-negativo-texto)]')
    expect(chipDespesas).toHaveClass('text-[var(--cor-positivo-texto)]')
  })

  it('esconde_comparacao_quando_anterior_null', async () => {
    responderResumo(
      resumo({
        receitas: '0.00',
        despesas: '0.00',
        sobra: '0.00',
        sobraAno: '0.00',
        anterior: null,
        categorias: [],
        proximas: [],
      }),
    )
    renderizar()

    const sobra = await bloco('Sobra do mês')
    expect(within(sobra).getByText('R$ 0,00')).toBeInTheDocument()
    expect(within(sobra).getByText('No ano: R$ 0,00')).toBeInTheDocument()
    expect(within(await bloco('Receitas')).getByText('R$ 0,00')).toBeInTheDocument()
    expect(within(await bloco('Despesas')).getByText('R$ 0,00')).toBeInTheDocument()
    expect(screen.queryByText(/melhor que|pior que|igual a/)).not.toBeInTheDocument()
    expect(screen.queryByText(/vs /)).not.toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(/NaN|Infinity/)
  })

  it('esconde_o_chip_quando_o_valor_anterior_e_zero', async () => {
    responderResumo(resumo({ anterior: { receitas: '0.00', despesas: '5000.00', sobra: '-5000.00' } }))
    renderizar()

    expect(within(await bloco('Receitas')).queryByText(/vs /)).not.toBeInTheDocument()
    expect(within(await bloco('Despesas')).getByText('↓ 16% vs setembro')).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(/NaN|Infinity/)
  })

  it('lista_categorias_em_ordem_com_percentual', async () => {
    responderResumo(resumo())
    renderizar()

    const bloco = await screen.findByRole('region', { name: 'Onde você mais gastou em outubro' })
    const itens = within(bloco).getAllByRole('listitem')

    expect(itens).toHaveLength(3)
    expect(itens[0]).toHaveTextContent('Moradia')
    expect(itens[0]).toHaveTextContent('R$ 3.000,00 · 71%')
    expect(itens[1]).toHaveTextContent('Transporte')
    expect(itens[1]).toHaveTextContent('R$ 900,50 · 21%')
    expect(itens[2]).toHaveTextContent('Lazer')
    expect(itens[2]).toHaveTextContent('R$ 300,00 · 7%')
  })

  it('avisa_quando_nao_ha_despesas_nem_contas_a_vencer', async () => {
    responderResumo(resumo({ categorias: [], proximas: [] }))
    renderizar()

    expect(await screen.findByText('Nenhuma despesa neste mês.')).toBeInTheDocument()
    expect(screen.getByText('Nenhuma conta a vencer.')).toBeInTheDocument()
  })

  it('proxima_conta_atrasada_tem_etiqueta', async () => {
    responderResumo(resumo())
    renderizar()

    const bloco = await screen.findByRole('region', { name: 'Próximas contas' })
    const [atrasada, emDia] = within(bloco).getAllByRole('listitem')

    expect(atrasada).toHaveTextContent('05/10')
    expect(atrasada).toHaveTextContent('Conta de luz')
    expect(atrasada).toHaveTextContent('Moradia')
    expect(atrasada).toHaveTextContent('R$ 180,40')
    expect(within(atrasada!).getByText('atrasada')).toBeInTheDocument()
    expect(within(atrasada!).getByText('atrasada')).toHaveClass('text-[var(--cor-negativo-texto)]')
    expect(emDia).toHaveTextContent('10/11')
    expect(emDia).toHaveTextContent('Internet')
    expect(within(emDia!).queryByText('atrasada')).not.toBeInTheDocument()
  })

  it('no_celular_os_blocos_seguem_a_ordem_sobra_totais_resultado_gastos_proximas_cartoes', async () => {
    responderResumo(resumo())
    responderCartoes()
    renderizar()
    await bloco('Sobra do mês')
    await bloco('Cartões')

    const nomes = screen.getAllByRole('region').map((r) => r.getAttribute('aria-label') ?? r.querySelector('h2')?.textContent)

    expect(nomes).toEqual([
      'Sobra do mês',
      'Receitas',
      'Despesas',
      'Resultado de cada mês em 2026',
      'Onde você mais gastou em outubro',
      'Próximas contas',
      'Cartões',
      'Conselheiro de Metas',
    ])
  })

  it('mostra_o_bloco_de_cartoes_do_mes_selecionado', async () => {
    responderResumo(resumo())
    const consultas = responderCartoes()
    renderizar('/?ano=2026&mes=10')

    const cartoes = await bloco('Cartões')
    expect(within(cartoes).getByText('Aurora')).toBeInTheDocument()
    expect(consultas).toEqual(['?ano=2026&mes=10'])
  })

  it('sem_cartoes_o_bloco_nao_aparece_e_a_pagina_continua', async () => {
    responderResumo(resumo())
    const consultas = responderCartoes([])
    renderizar()

    await bloco('Sobra do mês')
    await waitFor(() => expect(consultas).toHaveLength(1))
    // Só depois de a consulta responder o bloco de gastos ocupa a largura toda: aí a ausência de "Cartões" é real.
    await waitFor(() => expect(screen.getByRole('region', { name: 'Onde você mais gastou em outubro' })).toHaveClass('md:col-span-35'))
    expect(await bloco('Próximas contas')).toBeInTheDocument()
    expect(await bloco('Resultado de cada mês em 2026')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Cartões' })).not.toBeInTheDocument()
  })

  it('falha_na_consulta_de_cartoes_nao_derruba_a_pagina', async () => {
    responderResumo(resumo())
    let consultasDeCartoes = 0
    servidor.use(
      http.get('/api/cartoes', () => {
        consultasDeCartoes += 1
        return HttpResponse.json({ erro: 'Falha nos cartões.' }, { status: 500 })
      }),
    )
    renderizar()

    expect(await bloco('Sobra do mês')).toBeInTheDocument()
    await waitFor(() => expect(consultasDeCartoes).toBeGreaterThanOrEqual(1))
    await waitFor(() => expect(screen.getByRole('region', { name: 'Onde você mais gastou em outubro' })).toHaveClass('md:col-span-35'))
    expect(await bloco('Próximas contas')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Cartões' })).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('trocar_mes_refaz_a_consulta_com_ano_e_mes', async () => {
    const consultas = responderResumo(resumo())
    renderizar('/?ano=2026&mes=12')
    await bloco('Sobra do mês')
    expect(consultas).toEqual(['?ano=2026&mes=12'])

    await userEvent.click(screen.getByRole('button', { name: 'Mês seguinte' }))

    await waitFor(() => expect(consultas).toEqual(['?ano=2026&mes=12', '?ano=2027&mes=1']))
    expect(await screen.findByRole('region', { name: 'Onde você mais gastou em janeiro' })).toBeInTheDocument()
  })

  it('mostra_erro_com_botao_para_tentar_de_novo', async () => {
    servidor.use(http.get('/api/resumo', () => HttpResponse.json({ erro: 'Falha ao montar o resumo.' }, { status: 500 })))
    renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao montar o resumo.')

    servidor.use(http.get('/api/resumo', () => HttpResponse.json(resumo())))
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(await bloco('Sobra do mês')).toBeInTheDocument()
  })
})
