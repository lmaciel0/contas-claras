import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Carregando } from './Carregando'

describe('Carregando', () => {
  it('renderiza com role="status" e texto padrão', () => {
    render(<Carregando />)

    const status = screen.getByRole('status')
    expect(status).toBeInTheDocument()
    expect(status).toHaveTextContent('Carregando…')
  })

  it('renderiza com texto customizado', () => {
    render(<Carregando texto="Carregando os dados…" />)

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Carregando os dados…')
  })

  it('contém a estrutura do dot-spinner com 8 pontos', () => {
    const { container } = render(<Carregando />)

    const spinner = container.querySelector('.dot-spinner')
    expect(spinner).toBeInTheDocument()
    expect(spinner?.querySelectorAll('.dot-spinner__dot')).toHaveLength(8)
  })
})
