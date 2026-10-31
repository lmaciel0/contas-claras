import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { CelulaRelatorio, RelatorioAnualResponse } from '../../api/tipos'
import { mesAtual } from '../../formato/mes'
import { renderComApp } from '../../teste/render'
import { servidor } from '../../teste/servidor'
import { RelatoriosPage } from './RelatoriosPage'

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']

const paga = (valor: string): CelulaRelatorio => ({ valor, status: 'PAGO' })
const prevista = (valor: string): CelulaRelatorio => ({ valor, status: 'PREVISTO' })

/** 12 meses, `null` onde não há lançamento; `parcial` usa o número do mês (1 a 12). */
const meses = (parcial: Record<number, CelulaRelatorio>): (CelulaRelatorio | null)[] =>
  Array.from({ length: 12 }, (_, i) => parcial[i + 1] ?? null)

/** 12 totais: os primeiros vêm de `inicio`, o resto é zero. */
const totais = (...inicio: string[]): string[] => Array.from({ length: 12 }, (_, i) => inicio[i] ?? '0.00')

// Valores fictícios. Receitas 3.000 por mês até março; em março a despesa passa da receita (diferença negativa).
function relatorio(ano = 2026): RelatorioAnualResponse {
  return {
    ano,
    categorias: [
      {
        categoriaId: 1,
        nome: 'Receitas',
        tipo: 'RECEITA',
        itens: [
          {
            itemId: 9,
            nome: 'Salário',
            meses: meses({ 1: paga('3000.00'), 2: paga('3000.00'), 3: prevista('3000.00') }),
            total: '9000.00',
          },
        ],
        totaisMes: totais('3000.00', '3000.00', '3000.00'),
        total: '9000.00',
      },
      {
        categoriaId: 2,
        nome: 'Moradia',
        tipo: 'DESPESA',
        itens: [
          {
            itemId: 20,
            nome: 'Aluguel',
            meses: meses({ 1: paga('1500.00'), 2: paga('1500.00'), 3: prevista('1500.00') }),
            total: '4500.00',
          },
          { itemId: 21, nome: 'Luz', meses: meses({ 2: prevista('180.40') }), total: '180.40' },
        ],
        totaisMes: totais('1500.00', '1680.40', '1500.00'),
        total: '4680.40',
      },
      {
        categoriaId: 3,
        nome: 'Lazer',
        tipo: 'DESPESA',
        itens: [{ itemId: 30, nome: 'Viagem', meses: meses({ 3: prevista('2000.00') }), total: '2000.00' }],
        totaisMes: totais('0.00', '0.00', '2000.00'),
        total: '2000.00',
      },
    ],
    receitasMes: totais('3000.00', '3000.00', '3000.00'),
    despesasMes: totais('1500.00', '1680.40', '3500.00'),
    diferencaMes: totais('1500.00', '1319.60', '-500.00'),
    receitasAno: '9000.00',
    despesasAno: '6680.40',
    diferencaAno: '2319.60',
  }
}

const vazio = (ano: number): RelatorioAnualResponse => ({
  ano,
  categorias: [],
  receitasMes: totais(),
  despesasMes: totais(),
  diferencaMes: totais(),
  receitasAno: '0.00',
  despesasAno: '0.00',
  diferencaAno: '0.00',
})

/** Registra o handler do relatório e devolve a lista dos anos consultados. */
function responderRelatorio(corpo: (ano: number) => RelatorioAnualResponse = relatorio) {
  const anos: number[] = []
  servidor.use(
    http.get('/api/relatorios/ano/:ano', ({ params }) => {
      const ano = Number(params.ano)
      anos.push(ano)
      return HttpResponse.json(corpo(ano))
    }),
  )
  return anos
}

function Busca() {
  return <span data-testid="busca">{useLocation().search}</span>
}

function renderizar(rota = '/relatorios?ano=2026&mes=10') {
  return renderComApp(
    <Routes>
      <Route
        path="/relatorios"
        element={
          <>
            <RelatoriosPage />
            <Busca />
          </>
        }
      />
      <Route path="/lancamentos" element={<h1>Tela de lançamentos</h1>} />
    </Routes>,
    rota,
  )
}

/** Linha da tabela pelo nome do cabeçalho de linha (item, categoria ou total). */
function linha(nome: string): HTMLElement {
  const cabecalho = screen.getByRole('rowheader', { name: nome })
  const tr = cabecalho.closest('tr')
  if (tr === null) {
    throw new Error(`Linha "${nome}" sem <tr>`)
  }
  return tr
}

/** Células de dados da linha: JAN..DEZ e depois Ano (13 células). */
const celulas = (nome: string) => within(linha(nome)).getAllByRole('cell')

describe('RelatoriosPage', () => {
  it('tabela_tem_12_meses_e_coluna_ano', async () => {
    const anos = responderRelatorio()
    renderizar()

    const tabela = await screen.findByRole('table', { name: /2026/ })
    expect(anos).toEqual([2026])

    const cabecalhos = within(tabela)
      .getAllByRole('columnheader')
      .map((th) => th.textContent)
    expect(cabecalhos).toEqual(['Item', ...MESES, 'Ano'])

    // Cada linha de item tem os 12 meses e o total do ano.
    const aluguel = celulas('Aluguel')
    expect(aluguel).toHaveLength(13)
    expect(aluguel[0]).toHaveTextContent('1.500,00')
    expect(aluguel[1]).toHaveTextContent('1.500,00')
    expect(aluguel[2]).toHaveTextContent('1.500,00')
    expect(aluguel[12]).toHaveTextContent('4.500,00')
  })

  it('agrupa_por_categoria_com_subtotal_e_receitas_primeiro', async () => {
    responderRelatorio()
    renderizar()
    await screen.findByRole('table')

    const cabecalhosDeLinha = screen.getAllByRole('rowheader').map((th) => th.textContent)
    expect(cabecalhosDeLinha).toEqual([
      'Receitas',
      'Salário',
      'Moradia',
      'Aluguel',
      'Luz',
      'Lazer',
      'Viagem',
      'Despesas totais',
      'Diferença de caixa',
    ])

    // Subtotal da categoria: soma de cada mês e do ano.
    const moradia = celulas('Moradia')
    expect(moradia[0]).toHaveTextContent('1.500,00')
    expect(moradia[1]).toHaveTextContent('1.680,40')
    expect(moradia[12]).toHaveTextContent('4.680,40')

    // Linhas finais.
    const despesas = celulas('Despesas totais')
    expect(despesas[0]).toHaveTextContent('1.500,00')
    expect(despesas[2]).toHaveTextContent('3.500,00')
    expect(despesas[12]).toHaveTextContent('6.680,40')
    const diferenca = celulas('Diferença de caixa')
    expect(diferenca[0]).toHaveTextContent('1.500,00')
    expect(diferenca[12]).toHaveTextContent('2.319,60')
  })

  it('celula_paga_tem_classe_de_pago', async () => {
    responderRelatorio()
    renderizar()
    await screen.findByRole('table')

    const aluguel = celulas('Aluguel')
    // JAN e FEV pagos; MAR previsto fica na cor normal.
    expect(aluguel[0]).toHaveClass('celula-paga')
    expect(aluguel[1]).toHaveClass('celula-paga')
    expect(aluguel[2]).not.toHaveClass('celula-paga')
    // A cor não é o único sinal: o leitor de tela ouve o status.
    expect(aluguel[0]).toHaveTextContent('pago')
    expect(aluguel[2]).toHaveTextContent('previsto')
    // Totais não são lançamentos: não ganham a cor de pago.
    expect(aluguel[12]).not.toHaveClass('celula-paga')
    expect(celulas('Moradia')[0]).not.toHaveClass('celula-paga')
  })

  it('diferenca_negativa_em_vermelho', async () => {
    responderRelatorio()
    renderizar()
    await screen.findByRole('table')

    const diferenca = celulas('Diferença de caixa')
    // MAR: 3.000 de receita contra 3.500 de despesa.
    expect(diferenca[2]).toHaveTextContent('-500,00')
    expect(diferenca[2]).toHaveClass('diferenca-negativa')
    // Positiva e zerada ficam na cor normal.
    expect(diferenca[0]).not.toHaveClass('diferenca-negativa')
    expect(diferenca[5]).toHaveTextContent('0,00')
    expect(diferenca[5]).not.toHaveClass('diferenca-negativa')
    expect(diferenca[12]).not.toHaveClass('diferenca-negativa')
  })

  it('diferenca_do_ano_negativa_tambem_fica_vermelha', async () => {
    responderRelatorio((ano) => ({ ...relatorio(ano), diferencaAno: '-1234.50' }))
    renderizar()
    await screen.findByRole('table')

    const total = celulas('Diferença de caixa')[12]
    expect(total).toHaveTextContent('-1.234,50')
    expect(total).toHaveClass('diferenca-negativa')
  })

  it('mes_sem_lancamento_mostra_traco_acessivel', async () => {
    responderRelatorio()
    renderizar()
    await screen.findByRole('table')

    const salario = celulas('Salário')
    // ABR em diante não tem lançamento.
    expect(salario[3]).toHaveTextContent('–')
    expect(salario[3]).toHaveAccessibleName('sem lançamento')
    expect(salario[3]).not.toHaveClass('celula-paga')
    expect(salario[11]).toHaveTextContent('–')
  })

  it('primeira_coluna_fixa_e_rolagem_so_dentro_da_tabela', async () => {
    responderRelatorio()
    renderizar()
    const tabela = await screen.findByRole('table')

    // Só o contêiner da tabela rola de lado; a página não.
    const rolagem = screen.getByRole('region', { name: /2026/ })
    expect(rolagem).toHaveClass('overflow-x-auto')
    // Posicionado para segurar os textos `sr-only` (absolutos) dentro da rolagem, senão a página ganha barra lateral.
    expect(rolagem).toHaveClass('relative')
    expect(rolagem).toContainElement(tabela)
    expect(rolagem).toHaveAttribute('tabindex', '0')

    // Item (cabeçalho e linhas) fica colado à esquerda.
    expect(screen.getByRole('columnheader', { name: 'Item' })).toHaveClass('sticky', 'left-0')
    expect(screen.getByRole('rowheader', { name: 'Aluguel' })).toHaveClass('sticky', 'left-0')
    expect(screen.getByRole('rowheader', { name: 'Moradia' })).toHaveClass('sticky', 'left-0')
    expect(screen.getByRole('rowheader', { name: 'Diferença de caixa' })).toHaveClass('sticky', 'left-0')
  })

  it('numeros_alinhados_a_direita_em_tabular_nums', async () => {
    responderRelatorio()
    renderizar()
    await screen.findByRole('table')

    const [janeiro] = celulas('Aluguel')
    expect(janeiro).toHaveClass('text-right', 'tabular-nums')
  })

  it('explica_a_legenda_da_tabela', async () => {
    responderRelatorio()
    renderizar()

    expect(await screen.findByText(/Valores em reais/)).toBeInTheDocument()
  })

  it('trocar_ano_refaz_consulta', async () => {
    const anos = responderRelatorio()
    renderizar()
    await screen.findByRole('table', { name: /2026/ })

    await userEvent.click(screen.getByRole('button', { name: 'Ano seguinte' }))

    expect(await screen.findByRole('table', { name: /2027/ })).toBeInTheDocument()
    expect(anos).toEqual([2026, 2027])
    expect(screen.getByRole('group', { name: 'Ano' })).toHaveTextContent('2027')

    await userEvent.click(screen.getByRole('button', { name: 'Ano anterior' }))

    expect(await screen.findByRole('table', { name: /2026/ })).toBeInTheDocument()
    await waitFor(() => expect(anos).toEqual([2026, 2027, 2026]))
  })

  it('ano_fica_na_url_e_a_url_manda_no_ano', async () => {
    const anos = responderRelatorio()
    renderizar('/relatorios?ano=2025&mes=10')

    // Recarregar com ?ano= abre o ano da URL.
    await screen.findByRole('table', { name: /2025/ })
    expect(anos).toEqual([2025])

    await userEvent.click(screen.getByRole('button', { name: 'Ano seguinte' }))
    await waitFor(() => expect(screen.getByTestId('busca')).toHaveTextContent('?ano=2026&mes=10'))
  })

  it('sem_ano_na_url_usa_o_ano_atual', async () => {
    const anos = responderRelatorio()
    renderizar('/relatorios')

    await screen.findByRole('table')
    expect(anos).toEqual([mesAtual().ano])
  })

  it('limites_do_seletor_de_ano', async () => {
    responderRelatorio()
    renderizar('/relatorios?ano=2000&mes=1')

    await screen.findByRole('table', { name: /2000/ })
    expect(screen.getByRole('button', { name: 'Ano anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Ano seguinte' })).toBeEnabled()
  })

  it('ano_sem_lancamentos_mostra_estado_vazio', async () => {
    responderRelatorio(vazio)
    renderizar()

    expect(await screen.findByText(/Nenhum lançamento em 2026/)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    // O seletor continua à mão para olhar outro ano.
    expect(screen.getByRole('button', { name: 'Ano anterior' })).toBeEnabled()
    expect(screen.getByRole('link', { name: 'Orçamento' })).toHaveAttribute('href', '/lancamentos?ano=2026&mes=10')
  })

  it('mostra_carregando_enquanto_busca', async () => {
    responderRelatorio()
    renderizar()

    expect(screen.getByRole('status')).toHaveTextContent('Carregando o relatório…')
    await screen.findByRole('table')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('erro_mostra_a_mensagem_e_tenta_de_novo', async () => {
    let falhar = true
    servidor.use(
      http.get('/api/relatorios/ano/:ano', () =>
        falhar
          ? HttpResponse.json({ erro: 'Algo deu errado no servidor.' }, { status: 500 })
          : HttpResponse.json(relatorio()),
      ),
    )
    renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Algo deu errado no servidor.')

    falhar = false
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByRole('table', { name: /2026/ })).toBeInTheDocument()
  })
})
