import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import type { CartoesResponse, RelatorioAnualResponse, ResumoResponse } from './api/tipos'
import { App } from './App'
import { AuthProvider } from './auth/AuthProvider'
import { comSessao, semSessao } from './teste/auth'
import { responderCategorias } from './teste/lancamentos'
import { renderComApp } from './teste/render'
import { servidor } from './teste/servidor'

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1280 })
})

function renderizar(rota: string) {
  return renderComApp(
    <AuthProvider>
      <App />
    </AuthProvider>,
    rota,
  )
}

describe('rota inexistente', () => {
  it('logado_mostra_pagina_nao_encontrada_dentro_da_moldura', async () => {
    comSessao()
    renderizar('/rota-que-nao-existe')

    expect(await screen.findByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Menu principal' })).toBeInTheDocument()
  })

  it('o_link_voltar_para_o_inicio_leva_para_a_raiz', async () => {
    comSessao()
    renderizar('/lancamentos/1/algo-que-nao-existe')

    expect(await screen.findByRole('link', { name: 'Voltar para o início' })).toHaveAttribute('href', '/')
  })

  it('visitante_nunca_ve_tela_em_branco_e_cai_no_login', async () => {
    semSessao()
    renderizar('/rota-que-nao-existe')

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
  })
})

const serieVazia = Array.from({ length: 12 }, (_, i) => ({
  mes: i + 1,
  receitas: '0.00',
  receitasPrevistas: '0.00',
  despesas: '0.00',
  despesasPrevistas: '0.00',
}))

const resumoVazio: ResumoResponse = {
  receitas: '0.00',
  despesas: '0.00',
  sobra: '0.00',
  sobraAno: '0.00',
  anterior: null,
  categorias: [],
  proximas: [],
  serieAno: serieVazia,
}

const cartoesVazio: CartoesResponse = { totalFaturas: '0.00', limiteTotal: '0.00', usoGeral: null, cartoes: [] }

/** Respostas vazias para todas as telas que a moldura pode abrir. */
function responderTudo() {
  responderCategorias([])
  servidor.use(
    http.get('/api/resumo', () => HttpResponse.json(resumoVazio)),
    http.get('/api/lancamentos', () => HttpResponse.json([])),
    http.get('/api/cartoes', () => HttpResponse.json(cartoesVazio)),
    http.get('/api/relatorios/ano/:ano', () => HttpResponse.json({} as RelatorioAnualResponse)),
  )
}

const seletorDeMes = () => screen.queryByRole('button', { name: 'Mês anterior' })

describe('rotas financeiras', () => {
  it('financeiro_mostra_o_painel_financeiro_com_a_faixa', async () => {
    comSessao()
    responderTudo()
    renderizar('/financeiro?ano=2026&mes=10')

    expect(await screen.findByRole('heading', { name: 'Visão geral' })).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'Sobra do mês' })).toBeInTheDocument()
    expect(screen.getByText('Outubro 2026')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '+ Lançar' })).toHaveAttribute('href', '/lancamentos/novo?ano=2026&mes=10')
  })

  it('lancamentos_e_cartoes_mostram_a_faixa', async () => {
    comSessao()
    responderTudo()
    const { unmount } = renderizar('/lancamentos?ano=2026&mes=10')

    expect(await screen.findByRole('heading', { name: 'Orçamento' })).toBeInTheDocument()
    expect(seletorDeMes()).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '+ Lançar' })).toBeInTheDocument()
    unmount()

    renderizar('/cartoes?ano=2026&mes=10')
    expect(await screen.findByRole('heading', { name: 'Cartões' })).toBeInTheDocument()
    expect(seletorDeMes()).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '+ Lançar' })).toBeInTheDocument()
  })

  it('relatorios_e_categorias_nao_mostram_a_faixa', async () => {
    comSessao()
    responderTudo()
    const { unmount } = renderizar('/relatorios')

    expect(await screen.findByRole('heading', { name: 'Relatórios' })).toBeInTheDocument()
    expect(seletorDeMes()).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '+ Lançar' })).not.toBeInTheDocument()
    unmount()

    renderizar('/categorias')
    expect(await screen.findByRole('heading', { name: 'Categorias' })).toBeInTheDocument()
    expect(seletorDeMes()).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '+ Lançar' })).not.toBeInTheDocument()
  })

  it('o_mes_escolhido_em_financeiro_continua_em_lancamentos_pelo_menu', async () => {
    comSessao()
    responderTudo()
    renderizar('/financeiro?ano=2026&mes=10')

    await screen.findByRole('heading', { name: 'Visão geral' })
    await userEvent.click(screen.getByRole('button', { name: 'Mês anterior' }))
    expect(screen.getByText('Setembro 2026')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('link', { name: 'Orçamento' }))

    expect(await screen.findByRole('heading', { name: 'Orçamento' })).toBeInTheDocument()
    expect(screen.getByText('Setembro 2026')).toBeInTheDocument()
  })
})

describe('toast de saída', () => {
  it('saindo_fica_em_bottom_6_e_nao_em_bottom_24', async () => {
    comSessao()
    responderTudo()
    servidor.use(http.post('/api/auth/logout', () => new Promise<never>(() => undefined)))
    renderizar('/financeiro?ano=2026&mes=10')

    await userEvent.click(await screen.findByRole('button', { name: 'Sair' }))

    const aviso = await screen.findByText('Saindo…')
    expect(aviso.parentElement).toHaveClass('bottom-6')
    expect(aviso.parentElement).not.toHaveClass('bottom-24')
  })
})
