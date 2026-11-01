import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderComApp } from '../../teste/render'
import { CardReflexao } from './CardReflexao'

function relogioEm(iso: string) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(iso))
}

afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
})

describe('CardReflexao', () => {
  it('renderiza o cabeçalho Reflexão do dia, o subtítulo e a citação', () => {
    relogioEm('2026-10-31T15:00:00Z')
    renderComApp(<CardReflexao />)

    expect(screen.getByRole('heading', { level: 2, name: /reflexão do dia/i })).toBeInTheDocument()
    expect(screen.getByText('Sabedoria diária')).toBeInTheDocument()
    // Verifica que existe uma citação com autor
    expect(screen.getByText(/Marco Aurélio|Sêneca|Epicteto/)).toBeInTheDocument()
  })

  it('permite alternar para outra reflexão ao clicar no botão', async () => {
    relogioEm('2026-10-31T15:00:00Z')
    renderComApp(<CardReflexao />)

    const botaoOutra = screen.getByRole('button', { name: /outra reflexão/i })
    const autorInicial = screen.getByTestId('autor-reflexao').textContent

    await userEvent.click(botaoOutra)
    const autorNovo = screen.getByTestId('autor-reflexao').textContent

    // Deve mudar de citação
    expect(autorNovo).not.toBe(autorInicial)
    expect(screen.getByTestId('frase-reflexao')).toBeInTheDocument()
  })

  it('permite favoritar e desfavoritar a reflexão atual', async () => {
    relogioEm('2026-10-31T15:00:00Z')
    renderComApp(<CardReflexao />)

    const botaoFav = screen.getByRole('button', { name: /favoritar reflexão/i })
    expect(botaoFav).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(botaoFav)
    expect(botaoFav).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /remover dos favoritos/i })).toBeInTheDocument()

    await userEvent.click(botaoFav)
    expect(botaoFav).toHaveAttribute('aria-pressed', 'false')
  })

  it('permite copiar a reflexão para a área de transferência', async () => {
    relogioEm('2026-10-31T15:00:00Z')
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    })

    renderComApp(<CardReflexao />)

    const botaoCopiar = screen.getByRole('button', { name: /copiar reflexão/i })
    await userEvent.click(botaoCopiar)

    expect(writeTextMock).toHaveBeenCalledTimes(1)
    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('“'))
  })
})
