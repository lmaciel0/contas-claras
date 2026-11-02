import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PreferenciasModal } from './PreferenciasModal'
import { PreferenciasProvider } from './PreferenciasContext'

describe('PreferenciasModal', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('não renderiza conteúdo quando aberta é false', () => {
    render(
      <PreferenciasProvider>
        <PreferenciasModal aberta={false} aoFechar={() => {}} />
      </PreferenciasProvider>
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renderiza título, opções e controles quando aberta', () => {
    render(
      <PreferenciasProvider>
        <PreferenciasModal aberta={true} aoFechar={() => {}} />
      </PreferenciasProvider>
    )
    expect(screen.getByRole('dialog', { name: /preferências/i })).toBeInTheDocument()
    expect(screen.getByText(/personalize as preferências de layout/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^escuro$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /largura total/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /restaurar padrões/i })).toBeInTheDocument()
  })

  it('chama aoFechar ao pressionar Escape', () => {
    const fechar = vi.fn()
    render(
      <PreferenciasProvider>
        <PreferenciasModal aberta={true} aoFechar={fechar} />
      </PreferenciasProvider>
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(fechar).toHaveBeenCalledTimes(1)
  })

  it('chama aoFechar ao clicar no botão fechar ou no backdrop', () => {
    const fechar = vi.fn()
    render(
      <PreferenciasProvider>
        <PreferenciasModal aberta={true} aoFechar={fechar} />
      </PreferenciasProvider>
    )
    fireEvent.click(screen.getByLabelText(/fechar preferências/i))
    expect(fechar).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('preferencias-backdrop'))
    expect(fechar).toHaveBeenCalledTimes(2)
  })

  it('permite selecionar modo escuro e preset lima', () => {
    render(
      <PreferenciasProvider>
        <PreferenciasModal aberta={true} aoFechar={() => {}} />
      </PreferenciasProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: /^escuro$/i }))
    expect(document.documentElement.dataset.tema).toBe('escuro')

    fireEvent.click(screen.getByRole('button', { name: /lima/i }))
    expect(document.documentElement.dataset.preset).toBe('lima')
  })
})
