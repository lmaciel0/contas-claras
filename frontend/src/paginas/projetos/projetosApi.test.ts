import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { servidor } from '../../teste/servidor'
import { projetosApi } from './projetosApi'
import type { Projeto, Subtarefa } from './tipos'

const mockProjeto: Projeto = {
  id: 1,
  titulo: 'Projeto Teste',
  descricao: 'Descrição do projeto',
  categoria: 'Dev',
  estagio: 'A_FAZER',
  prioridade: 'ALTA',
  cor: 'azul',
  ordem: 0,
  prazo: '2026-12-01',
  porcentagemProgresso: 50,
  totalSubtarefas: 2,
  subtarefasConcluidas: 1,
  subtarefas: [
    { id: 10, titulo: 'Item 1', concluida: true, ordem: 0 },
    { id: 11, titulo: 'Item 2', concluida: false, ordem: 1 },
  ],
  criadoEm: '2026-11-02T10:00:00Z',
  atualizadoEm: '2026-11-02T10:00:00Z',
}

const mockSubtarefa: Subtarefa = {
  id: 12,
  titulo: 'Item Novo',
  concluida: false,
  ordem: 2,
}

describe('projetosApi', () => {
  it('listar busca projetos e aceita query params', async () => {
    let urlRequisicao = ''
    servidor.use(
      http.get('/api/projetos', ({ request }) => {
        urlRequisicao = request.url
        return HttpResponse.json([mockProjeto])
      }),
    )

    const resultado = await projetosApi.listar({ busca: 'teste', prioridade: 'ALTA' })
    expect(resultado).toEqual([mockProjeto])
    expect(urlRequisicao).toContain('busca=teste')
    expect(urlRequisicao).toContain('prioridade=ALTA')
  })

  it('obterPorId consulta projeto específico', async () => {
    servidor.use(
      http.get('/api/projetos/1', () => {
        return HttpResponse.json(mockProjeto)
      }),
    )

    const resultado = await projetosApi.obterPorId(1)
    expect(resultado.id).toBe(1)
    expect(resultado.titulo).toBe('Projeto Teste')
  })

  it('criar envia POST com dados do projeto', async () => {
    let corpoRecebido: unknown
    servidor.use(
      http.post('/api/projetos', async ({ request }) => {
        corpoRecebido = await request.json()
        return HttpResponse.json(mockProjeto, { status: 201 })
      }),
    )

    const resultado = await projetosApi.criar({
      titulo: 'Novo Projeto',
      categoria: 'Dev',
      estagio: 'A_FAZER',
      subtarefas: ['Sub 1'],
    })

    expect(resultado.id).toBe(1)
    expect(corpoRecebido).toEqual({
      titulo: 'Novo Projeto',
      categoria: 'Dev',
      estagio: 'A_FAZER',
      subtarefas: ['Sub 1'],
    })
  })

  it('atualizar envia PUT com metadados alterados', async () => {
    let corpoRecebido: unknown
    servidor.use(
      http.put('/api/projetos/1', async ({ request }) => {
        corpoRecebido = await request.json()
        return HttpResponse.json({ ...mockProjeto, titulo: 'Atualizado' })
      }),
    )

    const resultado = await projetosApi.atualizar(1, { titulo: 'Atualizado' })
    expect(resultado.titulo).toBe('Atualizado')
    expect(corpoRecebido).toEqual({ titulo: 'Atualizado' })
  })

  it('moverEstagio envia PATCH com novo estagio e ordem', async () => {
    let corpoRecebido: unknown
    servidor.use(
      http.patch('/api/projetos/1/estagio', async ({ request }) => {
        corpoRecebido = await request.json()
        return HttpResponse.json({ ...mockProjeto, estagio: 'EM_ANDAMENTO', ordem: 2 })
      }),
    )

    const resultado = await projetosApi.moverEstagio(1, { estagio: 'EM_ANDAMENTO', novaOrdem: 2 })
    expect(resultado.estagio).toBe('EM_ANDAMENTO')
    expect(resultado.ordem).toBe(2)
    expect(corpoRecebido).toEqual({ estagio: 'EM_ANDAMENTO', novaOrdem: 2 })
  })

  it('excluir envia DELETE para o id', async () => {
    let chamado = false
    servidor.use(
      http.delete('/api/projetos/1', () => {
        chamado = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await projetosApi.excluir(1)
    expect(chamado).toBe(true)
  })

  it('subtarefas: adicionar, alternar e excluir chamam as rotas corretas', async () => {
    let corpoSub: unknown
    let alternado = false
    let excluido = false

    servidor.use(
      http.post('/api/projetos/1/subtarefas', async ({ request }) => {
        corpoSub = await request.json()
        return HttpResponse.json(mockSubtarefa, { status: 201 })
      }),
      http.patch('/api/projetos/1/subtarefas/12/alternar', () => {
        alternado = true
        return HttpResponse.json({ ...mockSubtarefa, concluida: true })
      }),
      http.delete('/api/projetos/1/subtarefas/12', () => {
        excluido = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    const nova = await projetosApi.adicionarSubtarefa(1, { titulo: 'Item Novo' })
    expect(nova.titulo).toBe('Item Novo')
    expect(corpoSub).toEqual({ titulo: 'Item Novo' })

    const alterada = await projetosApi.alternarSubtarefa(1, 12)
    expect(alterada.concluida).toBe(true)
    expect(alternado).toBe(true)

    await projetosApi.excluirSubtarefa(1, 12)
    expect(excluido).toBe(true)
  })
})
