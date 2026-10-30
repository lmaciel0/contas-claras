import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { CategoriaRequest, CategoriaResponse, ItemRequest } from '../../api/tipos'
import { item } from '../../teste/lancamentos'
import { renderComApp } from '../../teste/render'
import { servidor } from '../../teste/servidor'
import { CategoriasPage } from './CategoriasPage'

// Valores fictícios. Ordem global: Salários, Moradia, Lazer.
const dadosIniciais = (): CategoriaResponse[] => [
  { id: 1, nome: 'Salários', tipo: 'RECEITA', ordem: 1, itens: [item({ id: 10, nome: 'Salário', diaVencimento: 5 })] },
  {
    id: 2,
    nome: 'Moradia',
    tipo: 'DESPESA',
    ordem: 2,
    itens: [
      item({ id: 20, nome: 'Luz', diaVencimento: 10 }),
      item({ id: 22, nome: 'Gás', arquivado: true }),
    ],
  },
  {
    id: 3,
    nome: 'Lazer',
    tipo: 'DESPESA',
    ordem: 3,
    itens: [item({ id: 30, nome: 'Cartão Azul', diaVencimento: 5, cartao: true, limite: '4000.00' })],
  },
]

/** `GET /api/categorias` responde com `dados`, que os testes podem mudar entre as chamadas. */
function responder(dados: CategoriaResponse[] = dadosIniciais()) {
  const estado = { dados }
  servidor.use(http.get('/api/categorias', () => HttpResponse.json(estado.dados)))
  return estado
}

const renderizar = () => renderComApp(<CategoriasPage />, '/categorias')

const regiao = (nome: string) => screen.findByRole('region', { name: nome })

describe('CategoriasPage', () => {
  it('lista_separa_receitas_e_despesas_com_itens', async () => {
    responder()
    renderizar()

    const receitas = await regiao('Receitas')
    const despesas = await regiao('Despesas')
    expect(within(receitas).getByRole('region', { name: 'Salários' })).toBeInTheDocument()
    expect(within(receitas).queryByRole('region', { name: 'Moradia' })).not.toBeInTheDocument()

    const moradia = within(despesas).getByRole('region', { name: 'Moradia' })
    expect(within(moradia).getByText('Luz')).toBeInTheDocument()
    expect(moradia).toHaveTextContent('dia 10')
    expect(moradia).toHaveTextContent('Gás')
    expect(moradia).toHaveTextContent('Arquivado')

    const lazer = within(despesas).getByRole('region', { name: 'Lazer' })
    expect(lazer).toHaveTextContent('Cartão de crédito')
    expect(lazer).toHaveTextContent('limite R$ 4.000,00')
  })

  it('categorias_cria_e_renomeia', async () => {
    const estado = responder()
    renderizar()
    const corpos: Array<{ id?: string; corpo: CategoriaRequest; metodo: string }> = []
    servidor.use(
      http.post('/api/categorias', async ({ request }) => {
        const corpo = (await request.json()) as CategoriaRequest
        corpos.push({ corpo, metodo: 'POST' })
        estado.dados = [...estado.dados, { id: 4, nome: corpo.nome, tipo: 'DESPESA', ordem: 4, itens: [] }]
        return HttpResponse.json(estado.dados[3], { status: 201 })
      }),
      http.put('/api/categorias/:id', async ({ request, params }) => {
        const corpo = (await request.json()) as CategoriaRequest
        corpos.push({ id: String(params.id), corpo, metodo: 'PUT' })
        estado.dados = estado.dados.map((c) => (String(c.id) === params.id ? { ...c, nome: corpo.nome } : c))
        return HttpResponse.json(estado.dados[1])
      }),
    )

    // Cria uma categoria de despesa.
    const despesas = await regiao('Despesas')
    await userEvent.click(within(despesas).getByRole('button', { name: '+ Nova categoria' }))
    await userEvent.type(await screen.findByLabelText('Nome da categoria'), 'Mercado')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(corpos).toEqual([{ metodo: 'POST', corpo: { nome: 'Mercado', tipo: 'DESPESA' } }]))
    expect(await screen.findByRole('region', { name: 'Mercado' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    // Renomeia Moradia.
    await userEvent.click(screen.getByRole('button', { name: 'Editar categoria Moradia' }))
    const nome = await screen.findByLabelText('Nome da categoria')
    expect(nome).toHaveValue('Moradia')
    await userEvent.clear(nome)
    await userEvent.type(nome, 'Casa')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(corpos[1]).toEqual({ metodo: 'PUT', id: '2', corpo: { nome: 'Casa' } }))
    expect(await screen.findByRole('region', { name: 'Casa' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Moradia' })).not.toBeInTheDocument()
  })

  it('nome_de_categoria_repetido_mostra_a_mensagem_da_api', async () => {
    responder()
    servidor.use(
      http.post('/api/categorias', () =>
        HttpResponse.json({ erro: 'Já existe uma categoria com esse nome.' }, { status: 409 }),
      ),
    )
    renderizar()

    const receitas = await regiao('Receitas')
    await userEvent.click(within(receitas).getByRole('button', { name: '+ Nova categoria' }))
    await userEvent.type(await screen.findByLabelText('Nome da categoria'), 'Salários')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe uma categoria com esse nome.')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('nome_vazio_nao_envia', async () => {
    responder()
    renderizar()

    const receitas = await regiao('Receitas')
    await userEvent.click(within(receitas).getByRole('button', { name: '+ Nova categoria' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Informe o nome da categoria.')
  })

  it('apagar_categoria_com_lancamentos_mostra_mensagem_409', async () => {
    responder()
    const mensagem = 'Categoria tem lançamentos. Arquive os itens em vez de apagar.'
    servidor.use(http.delete('/api/categorias/3', () => HttpResponse.json({ erro: mensagem }, { status: 409 })))
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Editar categoria Lazer' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir categoria' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sim, excluir' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(mensagem)
    // Continua aberto e a categoria continua na lista.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getAllByRole('region', { name: 'Lazer' }).length).toBeGreaterThan(0)
  })

  it('apagar_categoria_sem_lancamentos_remove_da_lista', async () => {
    const estado = responder()
    servidor.use(
      http.delete('/api/categorias/3', () => {
        estado.dados = estado.dados.filter((c) => c.id !== 3)
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Editar categoria Lazer' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir categoria' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sim, excluir' }))

    await waitFor(() => expect(screen.queryByRole('region', { name: 'Lazer' })).not.toBeInTheDocument())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('editar_item_marca_cartao_e_salva_limite_convertido', async () => {
    responder()
    const corpos: Array<{ id: string; corpo: ItemRequest }> = []
    servidor.use(
      http.put('/api/itens/:id', async ({ request, params }) => {
        corpos.push({ id: String(params.id), corpo: (await request.json()) as ItemRequest })
        return HttpResponse.json(item({ id: 20, nome: 'Luz' }))
      }),
    )
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Editar item Luz' }))
    // Limite só aparece depois de marcar o item como cartão.
    expect(screen.queryByLabelText('Limite')).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole('checkbox', { name: 'É cartão de crédito' }))
    await userEvent.type(screen.getByLabelText('Limite'), '4.000,00')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(corpos).toHaveLength(1))
    expect(corpos[0]).toEqual({
      id: '20',
      corpo: { nome: 'Luz', diaVencimento: 10, cartao: true, limite: '4000.00', arquivado: false },
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('editar_item_com_limite_invalido_nao_envia', async () => {
    responder()
    const corpos: ItemRequest[] = []
    servidor.use(
      http.put('/api/itens/:id', async ({ request }) => {
        corpos.push((await request.json()) as ItemRequest)
        return HttpResponse.json(item({ id: 20, nome: 'Luz' }))
      }),
    )
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Editar item Luz' }))
    await userEvent.click(await screen.findByRole('checkbox', { name: 'É cartão de crédito' }))
    await userEvent.type(screen.getByLabelText('Limite'), '10,999')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Use até 2 casas decimais')
    expect(corpos).toEqual([])
  })

  it('desmarcar_cartao_envia_limite_nulo_e_arquivar_envia_arquivado', async () => {
    responder()
    const corpos: ItemRequest[] = []
    servidor.use(
      http.put('/api/itens/:id', async ({ request }) => {
        corpos.push((await request.json()) as ItemRequest)
        return HttpResponse.json(item({ id: 30, nome: 'Cartão Azul' }))
      }),
    )
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Editar item Cartão Azul' }))
    // Vem preenchido com o que está salvo.
    expect(await screen.findByLabelText('Limite')).toHaveValue('4000,00')
    await userEvent.click(screen.getByRole('checkbox', { name: 'É cartão de crédito' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Arquivar este item' }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(corpos).toHaveLength(1))
    expect(corpos[0]).toEqual({
      nome: 'Cartão Azul',
      diaVencimento: 5,
      cartao: false,
      limite: null,
      arquivado: true,
    })
  })

  it('novo_item_envia_post_na_categoria', async () => {
    responder()
    const chamadas: Array<{ categoria: string; corpo: ItemRequest }> = []
    servidor.use(
      http.post('/api/categorias/:id/itens', async ({ request, params }) => {
        chamadas.push({ categoria: String(params.id), corpo: (await request.json()) as ItemRequest })
        return HttpResponse.json(item({ id: 40, nome: 'Água' }), { status: 201 })
      }),
    )
    renderizar()

    const moradia = await regiao('Moradia')
    await userEvent.click(within(moradia).getByRole('button', { name: '+ Novo item' }))
    await userEvent.type(await screen.findByLabelText('Nome do item'), 'Água')
    await userEvent.type(screen.getByLabelText('Dia de vencimento (opcional)'), '15')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(chamadas).toHaveLength(1))
    expect(chamadas[0]).toEqual({
      categoria: '2',
      corpo: { nome: 'Água', diaVencimento: 15, cartao: false, limite: null },
    })
  })

  it('item_repetido_mostra_a_mensagem_da_api', async () => {
    responder()
    servidor.use(
      http.put('/api/itens/20', () => HttpResponse.json({ erro: 'Já existe um item com esse nome.' }, { status: 409 })),
    )
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Editar item Luz' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe um item com esse nome.')
  })

  it('reordenar_envia_lista_completa_de_ids', async () => {
    const estado = responder()
    const corpos: Array<{ ids: number[] }> = []
    servidor.use(
      http.put('/api/categorias/ordem', async ({ request }) => {
        const corpo = (await request.json()) as { ids: number[] }
        corpos.push(corpo)
        estado.dados = estado.dados.map((c) => ({ ...c, ordem: corpo.ids.indexOf(c.id) + 1 }))
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Subir categoria Lazer' }))
    await waitFor(() => expect(corpos).toEqual([{ ids: [1, 3, 2] }]))

    // Agora Lazer vem antes de Moradia: descer troca de volta, sempre com todos os ids (receitas incluídas).
    const descer = screen.getByRole('button', { name: 'Descer categoria Lazer' })
    await waitFor(() => expect(descer).toBeEnabled())
    await userEvent.click(descer)
    await waitFor(() => expect(corpos).toEqual([{ ids: [1, 3, 2] }, { ids: [1, 2, 3] }]))
  })

  it('reordenar_troca_so_com_a_vizinha_do_mesmo_tipo', async () => {
    // Despesa A, Receita B, Despesa C: subir C troca com A e leva a lista inteira.
    responder([
      { id: 1, nome: 'Aluguel', tipo: 'DESPESA', ordem: 1, itens: [] },
      { id: 2, nome: 'Bônus', tipo: 'RECEITA', ordem: 2, itens: [] },
      { id: 3, nome: 'Contas', tipo: 'DESPESA', ordem: 3, itens: [] },
    ])
    const corpos: Array<{ ids: number[] }> = []
    servidor.use(
      http.put('/api/categorias/ordem', async ({ request }) => {
        corpos.push((await request.json()) as { ids: number[] })
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Subir categoria Contas' }))
    await waitFor(() => expect(corpos).toEqual([{ ids: [3, 2, 1] }]))
  })

  it('primeira_nao_sobe_e_ultima_nao_desce', async () => {
    responder()
    renderizar()

    expect(await screen.findByRole('button', { name: 'Subir categoria Moradia' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Descer categoria Lazer' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Subir categoria Salários' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Descer categoria Salários' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Descer categoria Moradia' })).toBeEnabled()
  })

  it('erro_ao_reordenar_mostra_a_mensagem', async () => {
    responder()
    servidor.use(
      http.put('/api/categorias/ordem', () => HttpResponse.json({ erro: 'Lista de categorias incompleta.' }, { status: 400 })),
    )
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Subir categoria Lazer' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Lista de categorias incompleta.')
  })

  it('erro_ao_carregar_permite_tentar_de_novo', async () => {
    let falhar = true
    servidor.use(
      http.get('/api/categorias', () =>
        falhar ? HttpResponse.json({ erro: 'Algo deu errado no servidor.' }, { status: 500 }) : HttpResponse.json(dadosIniciais()),
      ),
    )
    renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Algo deu errado no servidor.')
    falhar = false
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await regiao('Moradia')).toBeInTheDocument()
  })

  it('salvar_invalida_categorias_cartoes_lancamentos_e_resumo', async () => {
    responder()
    servidor.use(http.put('/api/itens/20', () => HttpResponse.json(item({ id: 20, nome: 'Luz' }))))
    const { queryClient } = renderizar()
    await regiao('Moradia')
    const chaves: unknown[] = []
    const original = queryClient.invalidateQueries.bind(queryClient)
    queryClient.invalidateQueries = ((filtros: { queryKey?: unknown }) => {
      chaves.push(filtros.queryKey)
      return original(filtros as never)
    }) as typeof queryClient.invalidateQueries

    await userEvent.click(screen.getByRole('button', { name: 'Editar item Luz' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(chaves).toEqual(expect.arrayContaining([['categorias'], ['cartoes'], ['lancamentos'], ['resumo']])))
  })
})
