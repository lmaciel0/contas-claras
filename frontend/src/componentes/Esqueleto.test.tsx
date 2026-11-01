import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Esqueleto } from './Esqueleto'

describe('Esqueleto', () => {
  it('renderiza com papel status e rótulo acessível por padrão', () => {
    render(<Esqueleto />)
    const el = screen.getByRole('status')
    expect(el).toBeInTheDocument()
    expect(el).toHaveAttribute('aria-label', 'Carregando…')
    expect(el).toHaveAttribute('aria-busy', 'true')
  })

  it('permite customizar rótulo acessível', () => {
    render(<Esqueleto rotuloAcessivel="Carregando lista de tarefas…" />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Carregando lista de tarefas…')
  })

  it('renderiza variante circulo com cantos arredondados full', () => {
    render(<Esqueleto variante="circulo" className="size-10" />)
    const el = screen.getByRole('status')
    expect(el).toHaveClass('rounded-full')
  })

  it('renderiza variante card', () => {
    render(<Esqueleto variante="card" className="h-32 w-full" />)
    const el = screen.getByRole('status')
    expect(el).toHaveClass('rounded-2xl')
  })

  it('renderiza múltiplas linhas de texto quando especificado', () => {
    const { container } = render(<Esqueleto variante="texto" linhas={3} />)
    const linhas = container.querySelectorAll('.esqueleto-linha')
    expect(linhas).toHaveLength(3)
  })
})
