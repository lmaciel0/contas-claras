import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import type { CategoriaNotaResponse } from '../../api/tipos'
import { renderComApp } from '../../teste/render'
import { servidor } from '../../teste/servidor'
import { FaixaCategorias } from './FaixaCategorias'

const categoria = (id: number, parcial: Partial<CategoriaNotaResponse> = {}): CategoriaNotaResponse => ({
  id,
  nome: `Categoria ${id}`,
  cor: 'azul',
  totalNotas: 0,
  ...parcial,
})

function renderizar(
  categorias: CategoriaNotaResponse[] = [categoria(1, { nome: 'Trabalho' }), categoria(2, { nome: 'Casa' })],
  selecionada: 'todas' | 'sem' | number = 'todas',
) {
  const aoSelecionar = vi.fn()
  renderComApp(<FaixaCategorias categorias={categorias} selecionada={selecionada} aoSelecionar={aoSelecionar} />)
  return { aoSelecionar }
}

describe('FaixaCategorias', () => {
  it('criarCategoriaComNomeECor', async () => {
    const user = userEvent.setup()
    let corpo: unknown
    servidor.use(
      http.post('/api/categorias-nota', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json(categoria(9, { nome: 'Ideias', cor: 'verde' }), { status: 201 })
      }),
    )
    renderizar()

    await user.click(screen.getByRole('button', { name: '+ Categoria' }))
    await user.type(screen.getByLabelText('Nome da categoria'), 'Ideias')
    await user.click(screen.getByRole('button', { name: 'verde' }))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(corpo).toEqual({ nome: 'Ideias', cor: 'verde' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('nomeRepetidoMostraErro409', async () => {
    const user = userEvent.setup()
    servidor.use(
      http.post('/api/categorias-nota', () =>
        HttpResponse.json({ erro: 'Já existe uma categoria com esse nome.' }, { status: 409 }),
      ),
    )
    renderizar()

    await user.click(screen.getByRole('button', { name: '+ Categoria' }))
    await user.type(screen.getByLabelText('Nome da categoria'), 'Casa')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe uma categoria com esse nome.')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('renomearETrocarCor', async () => {
    const user = userEvent.setup()
    let corpo: unknown
    servidor.use(
      http.put('/api/categorias-nota/1', async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json(categoria(1, { nome: 'Trabalho 2', cor: 'rosa' }))
      }),
    )
    renderizar()

    await user.click(screen.getByRole('button', { name: 'Editar categoria Trabalho' }))
    expect(screen.getByRole('button', { name: 'azul' })).toHaveAttribute('aria-pressed', 'true')
    const campo = screen.getByLabelText('Nome da categoria')
    await user.clear(campo)
    await user.type(campo, 'Trabalho 2')
    await user.click(screen.getByRole('button', { name: 'rosa' }))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(corpo).toEqual({ nome: 'Trabalho 2', cor: 'rosa' }))
  })

  it('excluirPedeConfirmacaoComQuantidadeDeNotas', async () => {
    const user = userEvent.setup()
    let apagou = false
    servidor.use(
      http.delete('/api/categorias-nota/1', () => {
        apagou = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderizar([categoria(1, { nome: 'Trabalho', totalNotas: 3 })])

    await user.click(screen.getByRole('button', { name: 'Editar categoria Trabalho' }))
    await user.click(screen.getByRole('button', { name: 'Excluir categoria' }))
    expect(screen.getByText(/3 notas ficarão sem categoria/)).toBeInTheDocument()
    expect(apagou).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Sim, excluir' }))
    await waitFor(() => expect(apagou).toBe(true))
  })

  it('categoriaSelecionadaFicaMarcadaComAriaPressed', async () => {
    const user = userEvent.setup()
    const { aoSelecionar } = renderizar(undefined, 2)

    expect(screen.getByRole('button', { name: 'Casa' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Trabalho' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByRole('button', { name: 'Sem categoria' }))
    expect(aoSelecionar).toHaveBeenCalledWith('sem')
    await user.click(screen.getByRole('button', { name: 'Trabalho' }))
    expect(aoSelecionar).toHaveBeenCalledWith(1)
    await user.click(screen.getByRole('button', { name: 'Todas' }))
    expect(aoSelecionar).toHaveBeenCalledWith('todas')
  })
})
