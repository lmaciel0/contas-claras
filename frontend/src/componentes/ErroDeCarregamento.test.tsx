import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErroDeCarregamento } from './ErroDeCarregamento'

function Quebra(): never {
  throw new Error('Failed to fetch dynamically imported module')
}

describe('ErroDeCarregamento', () => {
  beforeEach(() => {
    // O React loga o erro capturado; o teste não precisa dessa saída.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sem_erro_mostra_os_filhos', () => {
    render(
      <ErroDeCarregamento>
        <p>conteúdo</p>
      </ErroDeCarregamento>,
    )

    expect(screen.getByText('conteúdo')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('com_erro_mostra_alerta_em_portugues_e_o_botao_recarregar', async () => {
    const recarregar = vi.fn()
    render(
      <ErroDeCarregamento aoRecarregar={recarregar}>
        <Quebra />
      </ErroDeCarregamento>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar esta tela')
    await userEvent.click(screen.getByRole('button', { name: 'Recarregar' }))
    expect(recarregar).toHaveBeenCalledTimes(1)
  })
})
