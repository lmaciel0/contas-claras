import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LimiteDeErro } from './LimiteDeErro'

function Quebra(): never {
  throw new Error('estourou')
}

describe('LimiteDeErro', () => {
  beforeEach(() => {
    // O React loga o erro capturado; o teste não precisa dessa saída.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('sem_erro_mostra_os_filhos', () => {
    render(
      <LimiteDeErro>
        <p>conteúdo</p>
      </LimiteDeErro>,
    )

    expect(screen.getByText('conteúdo')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('filho_que_lanca_erro_mostra_a_tela_de_erro_em_portugues', () => {
    render(
      <LimiteDeErro>
        <Quebra />
      </LimiteDeErro>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Algo deu errado')).toBeInTheDocument()
    expect(screen.getByText('Recarregue a página para continuar. Seus dados estão salvos.')).toBeInTheDocument()
  })

  it('botao_recarregar_chama_window_location_reload', async () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    render(
      <LimiteDeErro>
        <Quebra />
      </LimiteDeErro>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Recarregar' }))

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('ao_erro_recebe_o_erro_e_a_pilha_de_componentes', () => {
    const aoErro = vi.fn()
    render(
      <LimiteDeErro aoErro={aoErro}>
        <Quebra />
      </LimiteDeErro>,
    )

    expect(aoErro).toHaveBeenCalledTimes(1)
    const [erro, pilha] = aoErro.mock.calls[0] as [Error, string | undefined]
    expect(erro.message).toBe('estourou')
    expect(typeof pilha).toBe('string')
  })
})
