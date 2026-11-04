import { render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PontoSerie } from '../../api/tipos'
import { GraficoResultado } from './GraficoResultado'
import { formatarComSinal, resultadoAcumulado } from './valores'

const semNbsp = (texto: string | null | undefined) => (texto ?? '').replace(/ /g, ' ')

const zeroSerie = (): PontoSerie[] =>
  Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    receitas: '0.00',
    receitasPrevistas: '0.00',
    despesas: '0.00',
    despesasPrevistas: '0.00',
  }))

// Valores fictícios: novembro tem 1000 de receitas (400 previstas) e 800 de despesas (200 previstas).
const serieDeTeste = (): PontoSerie[] => {
  const serie = zeroSerie()
  serie[10] = { mes: 11, receitas: '1000.00', receitasPrevistas: '400.00', despesas: '800.00', despesasPrevistas: '200.00' }
  return serie
}

async function renderizar(serie = serieDeTeste()) {
  render(<GraficoResultado ano={2026} mes={10} serie={serie} />)
  const grafico = await screen.findByRole('group', { name: 'Gráfico do resultado de cada mês em 2026' })
  await waitFor(() => expect(grafico.querySelectorAll('.recharts-bar')).toHaveLength(4))
  return grafico
}

describe('GraficoResultado', () => {
  it('tem_regiao_nomeada_grupo_e_legenda', async () => {
    await renderizar()

    expect(screen.getByRole('region', { name: 'Resultado de cada mês em 2026' })).toBeInTheDocument()
    const legenda = screen.getByRole('list', { name: 'Legenda do gráfico' })
    expect(within(legenda).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Receitas',
      'Despesas',
      'Previsto',
    ])
  })

  it('barras_espelhadas_com_parte_prevista_listrada', async () => {
    const grafico = await renderizar()

    const [receitasPagas, receitasPrevistas, despesasPagas, despesasPrevistas] = [
      ...grafico.querySelectorAll('.recharts-bar'),
    ].map((barra) => barra.querySelector('path.recharts-rectangle'))
    const numero = (barra: Element | null | undefined, atributo: string) => Number(barra?.getAttribute(atributo))

    expect(receitasPagas).toHaveAttribute('fill', 'var(--cor-grafico-receitas)')
    expect(despesasPagas).toHaveAttribute('fill', 'var(--cor-grafico-despesas)')
    const padroes = [...grafico.querySelectorAll('pattern')].map((padrao) => `url(#${padrao.id})`)
    expect(padroes).toHaveLength(2)
    expect(padroes).toContain(receitasPrevistas?.getAttribute('fill'))
    expect(padroes).toContain(despesasPrevistas?.getAttribute('fill'))
    // Receitas 600 + 400 = 1000; despesas 600 + 200 = 800 (as previstas fazem parte do total).
    // Nas barras que descem o Recharts devolve `height` negativo: o que importa é o tamanho.
    const altura = (barra: Element | null | undefined) => Math.abs(numero(barra, 'height'))
    expect(altura(receitasPagas) / altura(receitasPrevistas)).toBeCloseTo(1.5)
    expect(altura(despesasPagas) / altura(despesasPrevistas)).toBeCloseTo(3)
    const totalReceitas = altura(receitasPagas) + altura(receitasPrevistas)
    const totalDespesas = altura(despesasPagas) + altura(despesasPrevistas)
    expect(totalReceitas / totalDespesas).toBeCloseTo(1.25)
    // Espelhadas: a barra de despesas começa onde a de receitas termina (a linha zero) e desce.
    const baseDasReceitas = numero(receitasPagas, 'y') + altura(receitasPagas)
    expect(numero(despesasPagas, 'y')).toBeGreaterThanOrEqual(baseDasReceitas)
  })

  it('mostra_o_resultado_com_sinal_abaixo_do_mes', async () => {
    const grafico = await renderizar()

    expect(within(grafico).getByText('+200')).toBeInTheDocument()
    expect(within(grafico).getAllByText('0')).toHaveLength(11)
    expect(within(grafico).getByText('Out')).toHaveAttribute('data-selecionado', 'true')
    expect(within(grafico).getByText('Nov')).not.toHaveAttribute('data-selecionado', 'true')
    expect(within(grafico).getByText('Jan')).not.toHaveAttribute('data-selecionado', 'true')
  })

  it('mostra_o_acumulado_do_ano_ate_o_mes_selecionado', async () => {
    const serie = zeroSerie()
    serie[0] = { mes: 1, receitas: '500.00', receitasPrevistas: '0.00', despesas: '800.00', despesasPrevistas: '0.00' }
    await renderizar(serie)

    const esperado = formatarComSinal(resultadoAcumulado(serie, 10))
    expect(semNbsp(esperado)).toBe('− R$ 300,00')
    expect(semNbsp(screen.getByText(/^Acumulado até outubro/).textContent)).toContain(semNbsp(esperado))
  })

  it('resultado_menor_que_um_real_sai_0_na_cor_mutada', async () => {
    const serie = zeroSerie()
    serie[0] = { mes: 1, receitas: '500.30', receitasPrevistas: '0.00', despesas: '500.00', despesasPrevistas: '0.00' }
    serie[1] = { mes: 2, receitas: '500.00', receitasPrevistas: '0.00', despesas: '500.30', despesasPrevistas: '0.00' }
    const grafico = await renderizar(serie)

    const rotulos = within(grafico).getAllByText('0')
    expect(rotulos).toHaveLength(12)
    for (const rotulo of rotulos) {
      expect(rotulo).toHaveAttribute('fill', 'var(--cor-mutado)')
    }
  })

  it('tabela_escondida_com_os_doze_meses', async () => {
    await renderizar()

    const tabela = screen.getByRole('table', { name: 'Resultado de cada mês em 2026' })
    const linhas = within(tabela).getAllByRole('row')
    expect(linhas).toHaveLength(13)
    const celulas = (linha: HTMLElement) => [...linha.querySelectorAll('th, td')].map((c) => semNbsp(c.textContent))
    expect(celulas(linhas[0]!)).toEqual(['Mês', 'Receitas', 'Despesas', 'Resultado'])
    expect(celulas(linhas[11]!)).toEqual(['Nov', 'R$ 1.000,00', 'R$ 800,00', 'R$ 200,00'])
  })

  it('serie_vazia_nao_quebra', async () => {
    render(<GraficoResultado ano={2026} mes={10} serie={[]} />)

    expect(await screen.findByRole('region', { name: 'Resultado de cada mês em 2026' })).toBeInTheDocument()
    const grafico = await screen.findByRole('group', { name: 'Gráfico do resultado de cada mês em 2026' })
    await waitFor(() => expect(grafico.querySelector('.recharts-wrapper')).toBeInTheDocument())
    expect(semNbsp(screen.getByText(/^Acumulado até outubro/).textContent)).toContain('R$ 0,00')
    const tabela = screen.getByRole('table', { name: 'Resultado de cada mês em 2026' })
    expect(within(tabela).getAllByRole('row')).toHaveLength(1)
  })
})
