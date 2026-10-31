import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderComApp } from '../teste/render'
import { HeaderPrincipal } from './HeaderPrincipal'

describe('HeaderPrincipal', () => {
  it('renderiza o campo de busca e aciona onAbrirBusca ao clicar', async () => {
    const user = userEvent.setup()
    const onAbrirBusca = vi.fn()
    renderComApp(<HeaderPrincipal nomeUsuario="Lucas" onAbrirBusca={onAbrirBusca} />)

    const busca = screen.getByRole('button', { name: /buscar/i })
    expect(busca).toBeInTheDocument()
    expect(screen.getByText('Search…')).toBeInTheDocument()

    await user.click(busca)
    expect(onAbrirBusca).toHaveBeenCalledTimes(1)
  })

  it('mostra o botão de notificações', () => {
    renderComApp(<HeaderPrincipal nomeUsuario="Lucas" />)

    const notificacoes = screen.getByRole('button', { name: /notificações/i })
    expect(notificacoes).toBeInTheDocument()
  })

  it('exibe o nome do usuário e a inicial', () => {
    renderComApp(<HeaderPrincipal nomeUsuario="Lucas Maciel" />)

    expect(screen.getByText('Lucas Maciel')).toBeInTheDocument()
    expect(screen.getByText('L')).toBeInTheDocument()
    expect(screen.getByText('Aprumo')).toBeInTheDocument()
  })

  it('clicar no perfil abre o menu suspenso com Tema, Alterar senha e Sair', async () => {
    const user = userEvent.setup()
    const aoSair = vi.fn()
    renderComApp(<HeaderPrincipal nomeUsuario="Lucas" aoSair={aoSair} />)

    const botaoPerfil = screen.getByRole('button', { name: /perfil do usuário/i })
    expect(botaoPerfil).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    await user.click(botaoPerfil)
    expect(botaoPerfil).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Tema escuro' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Alterar senha' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Sair' })).toBeInTheDocument()

    await user.click(screen.getByRole('menuitem', { name: 'Sair' }))
    expect(aoSair).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('pressionar Escape fecha o menu suspenso', async () => {
    const user = userEvent.setup()
    renderComApp(<HeaderPrincipal nomeUsuario="Lucas" />)

    const botaoPerfil = screen.getByRole('button', { name: /perfil do usuário/i })
    await user.click(botaoPerfil)
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(botaoPerfil).toHaveFocus()
  })
})
