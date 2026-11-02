import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { renderComApp } from '../../teste/render'
import { servidor } from '../../teste/servidor'
import { EditorCategoria } from './EditorCategoria'

describe('EditorCategoria', () => {
  it('renderiza campos de nome, cor e icone', () => {
    renderComApp(<EditorCategoria tipo="DESPESA" aoFechar={vi.fn()} />)

    expect(screen.getByRole('heading', { name: /nova categoria/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/nome da categoria/i)).toBeInTheDocument()
    expect(screen.getByText(/cor da categoria/i)).toBeInTheDocument()
    expect(screen.getByText('Ícone')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /salvar e criar nova/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^salvar$/i })).toBeInTheDocument()
  })

  it('salva nova categoria com nome, tipo, icone e cor', async () => {
    const user = userEvent.setup()
    let corpoRecebido: unknown = null
    servidor.use(
      http.post('/api/categorias', async ({ request }) => {
        corpoRecebido = await request.json()
        return HttpResponse.json({
          id: 99,
          nome: 'Educação',
          tipo: 'DESPESA',
          ordem: 1,
          icone: 'livro',
          cor: '#7c3aed',
          itens: [],
        })
      }),
    )

    const aoFechar = vi.fn()
    renderComApp(<EditorCategoria tipo="DESPESA" aoFechar={aoFechar} />)

    await user.type(screen.getByLabelText(/nome da categoria/i), 'Educação')
    await user.click(screen.getByRole('button', { name: /^salvar$/i }))

    await waitFor(() => {
      expect(corpoRecebido).toEqual(
        expect.objectContaining({
          nome: 'Educação',
          tipo: 'DESPESA',
        }),
      )
      expect(aoFechar).toHaveBeenCalled()
    })
  })

  it('acao salvar e criar nova persiste e mantem o modal aberto limpando o nome', async () => {
    const user = userEvent.setup()
    let contagem = 0
    servidor.use(
      http.post('/api/categorias', async () => {
        contagem++
        return HttpResponse.json({
          id: 100 + contagem,
          nome: 'Cat ' + contagem,
          tipo: 'DESPESA',
          ordem: contagem,
          icone: 'outros',
          cor: '#3b82f6',
          itens: [],
        })
      }),
    )

    const aoFechar = vi.fn()
    renderComApp(<EditorCategoria tipo="DESPESA" aoFechar={aoFechar} />)

    const inputNome = screen.getByLabelText(/nome da categoria/i)
    await user.type(inputNome, 'Supermercado')
    await user.click(screen.getByRole('button', { name: /salvar e criar nova/i }))

    await waitFor(() => {
      expect(contagem).toBe(1)
      expect(inputNome).toHaveValue('')
      expect(aoFechar).not.toHaveBeenCalled()
    })
  })
})
