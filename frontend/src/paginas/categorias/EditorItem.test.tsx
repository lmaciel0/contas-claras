import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import type { CategoriaResponse } from '../../api/tipos'
import { renderComApp } from '../../teste/render'
import { servidor } from '../../teste/servidor'
import { EditorItem } from './EditorItem'

const categoriaMock: CategoriaResponse = {
  id: 10,
  nome: 'Transporte',
  tipo: 'DESPESA',
  ordem: 1,
  icone: 'transporte',
  cor: '#3b82f6',
  itens: [],
}

describe('EditorItem', () => {
  it('renderiza os campos para criacao de novo item', () => {
    renderComApp(<EditorItem categoria={categoriaMock} aoFechar={vi.fn()} />)

    expect(screen.getByRole('heading', { name: /novo item/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/nome do item/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/dia de vencimento/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/é cartão de crédito/i)).toBeInTheDocument()
  })

  it('salva novo item com sucesso', async () => {
    const user = userEvent.setup()
    let corpoRecebido: unknown = null
    servidor.use(
      http.post('/api/categorias/10/itens', async ({ request }) => {
        corpoRecebido = await request.json()
        return HttpResponse.json({
          id: 55,
          nome: 'Combustível',
          diaVencimento: 15,
          cartao: false,
          limite: null,
          arquivado: false,
          titular: null,
        })
      }),
    )

    const aoFechar = vi.fn()
    renderComApp(<EditorItem categoria={categoriaMock} aoFechar={aoFechar} />)

    await user.type(screen.getByLabelText(/nome do item/i), 'Combustível')
    await user.type(screen.getByLabelText(/dia de vencimento/i), '15')
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(corpoRecebido).toEqual(
        expect.objectContaining({
          nome: 'Combustível',
          diaVencimento: 15,
          cartao: false,
        }),
      )
      expect(aoFechar).toHaveBeenCalled()
    })
  })
})
