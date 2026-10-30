import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { ItemResponse, LancamentoResponse, SalvarLancamentoRequest } from '../../api/tipos'
import {
  categoriasFicticias,
  item,
  lancamento,
  responderCategorias,
  responderLancamentos,
} from '../../teste/lancamentos'
import { renderComApp } from '../../teste/render'
import { servidor } from '../../teste/servidor'
import { LancamentoForm } from './LancamentoForm'
import { LancamentosPage } from './LancamentosPage'

const luzDeOutubro = lancamento({
  id: 1,
  itemId: 20,
  itemNome: 'Luz',
  valor: '180.40',
  vencimento: '2026-10-12',
  status: 'PAGO',
})

function renderizar(rota: string, existentes: LancamentoResponse[] = []) {
  responderCategorias()
  responderLancamentos(() => existentes)
  return renderComApp(
    <Routes>
      <Route path="/lancamentos" element={<LancamentosPage />}>
        <Route path="novo" element={<LancamentoForm />} />
        <Route path=":id" element={<LancamentoForm />} />
      </Route>
    </Routes>,
    rota,
  )
}

/** `PUT /api/lancamentos` registra o corpo recebido e responde com um lançamento qualquer. */
function capturarPut() {
  const corpos: SalvarLancamentoRequest[] = []
  servidor.use(
    http.put('/api/lancamentos', async ({ request }) => {
      corpos.push((await request.json()) as SalvarLancamentoRequest)
      return HttpResponse.json([lancamento({ id: 9, itemId: 20, itemNome: 'Luz' })])
    }),
  )
  return corpos
}

const campo = (nome: string) => screen.findByLabelText(nome)

async function preencherLuz(valor: string) {
  await userEvent.selectOptions(await campo('Item'), 'Luz')
  await userEvent.type(screen.getByLabelText('Valor'), valor)
}

describe('LancamentoForm (novo)', () => {
  it('form_envia_put_com_valor_convertido', async () => {
    renderizar('/lancamentos/novo?ano=2026&mes=10')
    const corpos = capturarPut()

    await preencherLuz('1.234,56')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(corpos).toHaveLength(1))
    expect(corpos[0]).toEqual({
      itemId: 20,
      ano: 2026,
      mes: 10,
      valor: '1234.56',
      status: 'PREVISTO',
      vencimento: '2026-10-10',
    })
    // Salvou: o formulário fecha e volta para a lista do mês.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('aceita_virgula_sem_milhar_e_uma_casa', async () => {
    renderizar('/lancamentos/novo?ano=2026&mes=10')
    const corpos = capturarPut()

    await preencherLuz('251,3')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(corpos).toHaveLength(1))
    expect(corpos[0]?.valor).toBe('251.30')
  })

  it('form_recusa_valor_com_tres_casas', async () => {
    renderizar('/lancamentos/novo?ano=2026&mes=10')
    const corpos = capturarPut()

    await preencherLuz('10,999')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Use até 2 casas decimais.')).toBeInTheDocument()
    expect(screen.getByLabelText('Valor')).toBeInvalid()
    expect(corpos).toHaveLength(0)
  })

  it('exige_escolher_o_item_antes_de_enviar', async () => {
    renderizar('/lancamentos/novo?ano=2026&mes=10')
    const corpos = capturarPut()

    await userEvent.type(await campo('Valor'), '10')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Escolha um item.')).toBeInTheDocument()
    expect(corpos).toHaveLength(0)
  })

  it('form_preenche_vencimento_pelo_dia_do_item', async () => {
    renderizar('/lancamentos/novo?ano=2026&mes=2')

    // Condomínio vence todo dia 31; fevereiro/2026 só vai até 28.
    await userEvent.selectOptions(await campo('Item'), 'Condomínio')

    expect(screen.getByLabelText('Vencimento')).toHaveValue('2026-02-28')
    expect(screen.getByText('Padrão do item: dia 31 (28/02/2026 neste mês)')).toBeInTheDocument()
  })

  it('vencimento_em_fevereiro_bissexto_cai_no_dia_29', async () => {
    renderizar('/lancamentos/novo?ano=2028&mes=2')

    await userEvent.selectOptions(await campo('Item'), 'Condomínio')

    expect(screen.getByLabelText('Vencimento')).toHaveValue('2028-02-29')
  })

  it('vencimento_editado_na_mao_nao_e_trocado_ao_mudar_o_mes', async () => {
    renderizar('/lancamentos/novo?ano=2026&mes=2')
    await userEvent.selectOptions(await campo('Item'), 'Luz')
    const vencimento = screen.getByLabelText('Vencimento')
    expect(vencimento).toHaveValue('2026-02-10')

    await userEvent.clear(vencimento)
    await userEvent.type(vencimento, '2026-02-20')
    await userEvent.selectOptions(screen.getByLabelText('Mês'), 'Março 2026')

    expect(vencimento).toHaveValue('2026-02-20')
  })

  it('repetir_ate_envia_repetirAte', async () => {
    renderizar('/lancamentos/novo?ano=2026&mes=10')
    const corpos = capturarPut()

    await preencherLuz('100')
    expect(screen.queryByLabelText('Repetir até')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('switch', { name: 'Repetir nos próximos meses' }))
    await userEvent.selectOptions(screen.getByLabelText('Repetir até'), 'Dezembro 2026')
    await userEvent.click(screen.getByRole('radio', { name: 'Pago' }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(corpos).toHaveLength(1))
    expect(corpos[0]).toMatchObject({ status: 'PAGO', valor: '100.00', repetirAte: { ano: 2026, mes: 12 } })
  })

  it('sem_o_interruptor_nao_envia_repetirAte', async () => {
    renderizar('/lancamentos/novo?ano=2026&mes=10')
    const corpos = capturarPut()

    await preencherLuz('100')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(corpos).toHaveLength(1))
    expect(corpos[0]).not.toHaveProperty('repetirAte')
  })

  it('novo_item_inline_aparece_selecionado', async () => {
    let criado: ItemResponse | null = null
    const enviados: unknown[] = []
    renderizar('/lancamentos/novo?ano=2026&mes=10')
    servidor.use(
      http.get('/api/categorias', () => {
        const categorias = categoriasFicticias()
        if (criado !== null) {
          categorias[1]?.itens.push(criado)
        }
        return HttpResponse.json(categorias)
      }),
      http.post('/api/categorias/:id/itens', async ({ request, params }) => {
        enviados.push({ categoria: params.id, corpo: await request.json() })
        criado = item({ id: 99, nome: 'Internet', diaVencimento: 15 })
        return HttpResponse.json(criado, { status: 201 })
      }),
    )

    await userEvent.click(await screen.findByRole('button', { name: '+ novo item' }))
    await userEvent.type(screen.getByLabelText('Nome do novo item'), 'Internet')
    await userEvent.type(screen.getByLabelText('Dia de vencimento (opcional)'), '15')
    await userEvent.click(screen.getByRole('button', { name: 'Criar item' }))

    await waitFor(() => expect(screen.getByLabelText('Item')).toHaveValue('99'))
    expect(within(screen.getByLabelText('Item')).getByRole('option', { name: 'Internet' })).toBeInTheDocument()
    expect(enviados).toEqual([
      { categoria: '2', corpo: { nome: 'Internet', diaVencimento: 15, cartao: false, limite: null } },
    ])
    expect(screen.getByLabelText('Vencimento')).toHaveValue('2026-10-15')
    expect(screen.queryByLabelText('Nome do novo item')).not.toBeInTheDocument()
  })

  it('novo_item_com_nome_repetido_mostra_o_erro_da_api', async () => {
    renderizar('/lancamentos/novo?ano=2026&mes=10')
    servidor.use(
      http.post('/api/categorias/:id/itens', () =>
        HttpResponse.json({ erro: 'Já existe um item com esse nome.' }, { status: 409 }),
      ),
    )

    await userEvent.click(await screen.findByRole('button', { name: '+ novo item' }))
    await userEvent.type(screen.getByLabelText('Nome do novo item'), 'Luz')
    await userEvent.click(screen.getByRole('button', { name: 'Criar item' }))

    expect(await screen.findByText('Já existe um item com esse nome.')).toBeInTheDocument()
  })

  it('item_arquivado_nao_aparece_no_seletor', async () => {
    renderizar('/lancamentos/novo?ano=2026&mes=10')

    const seletor = await campo('Item')
    const nomes = within(seletor)
      .getAllByRole('option')
      .map((opcao) => opcao.textContent)

    expect(nomes).toEqual(['Escolha o item', 'Luz', 'Condomínio'])
  })

  it('categoria_so_lista_as_do_tipo_escolhido', async () => {
    renderizar('/lancamentos/novo?ano=2026&mes=10')
    const categoria = await campo('Categoria')
    expect(within(categoria).getAllByRole('option').map((o) => o.textContent)).toEqual(['Moradia', 'Lazer'])

    await userEvent.click(screen.getByRole('radio', { name: 'Receita' }))

    expect(within(screen.getByLabelText('Categoria')).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Receitas',
    ])
    expect(within(screen.getByLabelText('Item')).getByRole('option', { name: 'Salário' })).toBeInTheDocument()
  })

  it('mostra_o_erro_da_api_e_continua_no_formulario', async () => {
    renderizar('/lancamentos/novo?ano=2026&mes=10')
    servidor.use(http.put('/api/lancamentos', () => HttpResponse.json({ erro: 'Item arquivado.' }, { status: 409 })))

    await preencherLuz('10')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Item arquivado.')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('salvar_invalida_lancamentos_e_resumo', async () => {
    const { queryClient } = renderizar('/lancamentos/novo?ano=2026&mes=10')
    capturarPut()
    queryClient.setQueryData(['resumo', 2026, 10], { sobra: '0.00' })

    await preencherLuz('10')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(queryClient.getQueryState(['resumo', 2026, 10])?.isInvalidated).toBe(true))
  })
})

describe('LancamentoForm (edição)', () => {
  it('abre_preenchido_com_o_lancamento_do_mes', async () => {
    renderizar('/lancamentos/1?ano=2026&mes=10', [luzDeOutubro])

    expect(await screen.findByLabelText('Valor')).toHaveValue('180,40')
    expect(screen.getByLabelText('Vencimento')).toHaveValue('2026-10-12')
    expect(screen.getByRole('radio', { name: 'Pago' })).toBeChecked()
    expect(screen.getByLabelText('Item')).toBeDisabled()
    expect(screen.getByLabelText('Item')).toHaveDisplayValue('Luz')
    expect(screen.getByLabelText('Mês')).toBeDisabled()
  })

  it('salva_a_edicao_com_put', async () => {
    renderizar('/lancamentos/1?ano=2026&mes=10', [luzDeOutubro])
    const corpos = capturarPut()

    const valor = await screen.findByLabelText('Valor')
    await userEvent.clear(valor)
    await userEvent.type(valor, '200')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(corpos).toHaveLength(1))
    expect(corpos[0]).toEqual({
      itemId: 20,
      ano: 2026,
      mes: 10,
      valor: '200.00',
      status: 'PAGO',
      vencimento: '2026-10-12',
    })
  })

  it('excluir_pede_confirmacao_e_chama_delete', async () => {
    renderizar('/lancamentos/1?ano=2026&mes=10', [luzDeOutubro])
    const excluidos: string[] = []
    servidor.use(
      http.delete('/api/lancamentos/:id', ({ params }) => {
        excluidos.push(String(params.id))
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await userEvent.click(await screen.findByRole('button', { name: 'Excluir' }))
    expect(excluidos).toEqual([])
    expect(screen.getByText('Excluir este lançamento?')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Sim, excluir' }))

    await waitFor(() => expect(excluidos).toEqual(['1']))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('cancelar_a_exclusao_nao_chama_delete', async () => {
    renderizar('/lancamentos/1?ano=2026&mes=10', [luzDeOutubro])
    const excluidos: string[] = []
    servidor.use(
      http.delete('/api/lancamentos/:id', ({ params }) => {
        excluidos.push(String(params.id))
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await userEvent.click(await screen.findByRole('button', { name: 'Excluir' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByText('Excluir este lançamento?')).not.toBeInTheDocument()
    expect(excluidos).toEqual([])
  })

  it('lancamento_que_nao_esta_no_mes_mostra_aviso', async () => {
    renderizar('/lancamentos/77?ano=2026&mes=10', [luzDeOutubro])

    expect(await screen.findByText('Lançamento não encontrado neste mês.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument()
  })
})
