import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CATALOGO_ICONES, ICONE_PADRAO, renderizarIcone } from './catalogoIcones'

describe('catalogoIcones', () => {
  it('contem todos os icones das referencias', () => {
    const ids = CATALOGO_ICONES.map((i) => i.id)
    expect(ids).toContain('livro') // Educação
    expect(ids).toContain('computador') // Eletrônicos
    expect(ids).toContain('praia') // Lazer
    expect(ids).toContain('restaurante') // Restaurante
    expect(ids).toContain('saude') // Saúde
    expect(ids).toContain('servicos') // Serviços
    expect(ids).toContain('supermercado') // Supermercado
    expect(ids).toContain('transporte') // Transporte
    expect(ids).toContain('casa') // Casa
    expect(ids).toContain('salario') // Salário
    expect(ids).toContain('estrela') // Férias/Décimo
    expect(ids).toContain('presente') // Presente
    expect(ids).toContain('grafico') // Investimentos/Tendência
    expect(ids).toContain('outros') // Outros
  })

  it('renderiza o icone SVG correspondente', () => {
    const { container } = render(<div>{renderizarIcone('livro', 'size-5')}</div>)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveClass('size-5')
  })

  it('renderiza icone padrao para id desconhecido ou nulo', () => {
    const { container } = render(<div>{renderizarIcone('id-desconhecido')}</div>)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })
})
