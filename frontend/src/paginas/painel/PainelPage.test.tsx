import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PontoSerie, ResumoResponse } from '../../api/tipos'
import { AuthProvider } from '../../auth/AuthProvider'
import { RotaProtegida } from '../../auth/RotaProtegida'
import { comSessao, usuarioFicticio } from '../../teste/auth'
import { renderComApp } from '../../teste/render'
import { servidor } from '../../teste/servidor'
import { PainelPage } from './PainelPage'

const zeroSerie = (): PontoSerie[] =>
  Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    receitas: '0.00',
    receitasPrevistas: '0.00',
    despesas: '0.00',
    despesasPrevistas: '0.00',
  }))

// Valores fictícios.
const resumo: ResumoResponse = {
  receitas: '5000.00',
  despesas: '4200.50',
  sobra: '799.50',
  sobraAno: '-1234.00',
  anterior: { receitas: '4000.00', despesas: '5000.00', sobra: '-1000.00' },
  categorias: [],
  proximas: [
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
}

function responderResumo() {
  const consultas: string[] = []
  servidor.use(
    http.get('/api/resumo', ({ request }) => {
      consultas.push(new URL(request.url).search)
      return HttpResponse.json(resumo)
    }),
  )
  return consultas
}

/** Só o `Date` é falso: o msw e o `waitFor` seguem com os temporizadores reais. 15:00Z = 12:00 em São Paulo. */
function relogioEm(iso: string) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(iso))
}

function renderizar(rota = '/') {
  renderComApp(
    <AuthProvider>
      <Routes>
        <Route element={<RotaProtegida />}>
          <Route path="/" element={<PainelPage />} />
          <Route path="/financeiro" element={<h1>Visão geral</h1>} />
        </Route>
      </Routes>
    </AuthProvider>,
    rota,
  )
}

afterEach(() => {
  vi.useRealTimers()
})

describe('PainelPage', () => {
  it('mostra a saudação com o primeiro nome e a data', async () => {
    relogioEm('2026-10-31T15:00:00Z')
    comSessao({ ...usuarioFicticio, nome: 'Lucas Maciel' })
    responderResumo()
    renderizar()

    expect(await screen.findByRole('heading', { level: 1, name: 'Boa tarde, Lucas' })).toBeInTheDocument()
    expect(screen.getByText('sábado, 31 de outubro')).toBeInTheDocument()
  })

  it.each(['', '   '])('sem nome (%j) mostra só a saudação, sem vírgula sobrando', async (nome) => {
    relogioEm('2026-10-31T11:00:00Z')
    comSessao({ ...usuarioFicticio, nome })
    responderResumo()
    renderizar()

    expect(await screen.findByRole('heading', { level: 1, name: /^Bom dia/ })).toHaveAccessibleName('Bom dia')
  })

  it('nome de uma palavra só não leva espaço nem vírgula a mais', async () => {
    relogioEm('2026-10-31T23:00:00Z')
    comSessao({ ...usuarioFicticio, nome: '  Ana ' })
    responderResumo()
    renderizar()

    expect(await screen.findByRole('heading', { level: 1, name: 'Boa noite, Ana' })).toBeInTheDocument()
  })

  it('o resumo falhando mostra erro com Tentar de novo e mantém a saudação', async () => {
    comSessao()
    // Falha até o teste mandar parar: uma consulta que sobrou de teste anterior não pode "gastar" a falha.
    let falhar = true
    servidor.use(
      http.get('/api/resumo', () =>
        falhar ? HttpResponse.json({ erro: 'Falha no servidor.' }, { status: 500 }) : HttpResponse.json(resumo),
      ),
    )
    renderizar()

    const alerta = await screen.findByRole('alert')
    expect(within(alerta).getByText('Falha no servidor.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: /^(Bom dia|Boa tarde|Boa noite), Ana$/ })).toBeInTheDocument()

    falhar = false
    await userEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))

    expect(await screen.findByRole('region', { name: 'Sobra do mês' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('enquanto carrega mostra "Carregando" e já exibe a saudação', async () => {
    comSessao()
    servidor.use(http.get('/api/resumo', () => new Promise<never>(() => {})))
    renderizar()

    // O "Carregando…" da sessão também é um status; o do bloco só existe depois que a saudação aparece.
    expect(await screen.findByRole('heading', { level: 1, name: /, Ana$/ })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Carregando')
  })

  it('com resumo ok mostra os cartões e o link para /financeiro', async () => {
    comSessao()
    responderResumo()
    renderizar()

    expect(await screen.findByRole('heading', { level: 2, name: 'Finanças do mês' })).toBeInTheDocument()
    expect(within(await screen.findByRole('region', { name: 'Sobra do mês' })).getByText('R$ 799,50')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Receitas' })).getByText('R$ 5.000,00')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Despesas' })).getByText('R$ 4.200,50')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Próximas contas' })).getByText('Internet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver visão geral' })).toHaveAttribute('href', '/financeiro')
  })

  it('não mostra seletor de mês nem blocos de tarefas, agenda, projetos ou notas', async () => {
    comSessao()
    responderResumo()
    renderizar()

    await screen.findByRole('region', { name: 'Sobra do mês' })
    expect(screen.queryByRole('button', { name: /mês/i })).not.toBeInTheDocument()
    for (const bloco of [/tarefas/i, /agenda/i, /projetos/i, /notas/i]) {
      expect(screen.queryByRole('heading', { name: bloco })).not.toBeInTheDocument()
    }
  })

  it('abre sem erro com ?ano=2026&mes=10 na URL e consulta o mês atual', async () => {
    relogioEm('2026-11-15T15:00:00Z')
    comSessao()
    const consultas = responderResumo()
    renderizar('/?ano=2026&mes=10')

    expect(await screen.findByRole('region', { name: 'Sobra do mês' })).toBeInTheDocument()
    await waitFor(() => expect(consultas).toHaveLength(1))
    expect(new URLSearchParams(consultas[0])).toEqual(new URLSearchParams({ ano: '2026', mes: '11' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
