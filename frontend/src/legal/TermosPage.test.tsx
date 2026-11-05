import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { TermosPage } from './TermosPage'
import { CONTATO_EMAIL, VIGENCIA } from './responsavel'

const SECOES = [
  'O serviço',
  'Quem pode usar',
  'Sua conta e senha',
  'Seu conteúdo',
  'O que não é permitido',
  'Não é aconselhamento financeiro',
  'Suspensão e exclusão de conta',
  'Limitação de responsabilidade',
  'Mudanças',
  'Lei aplicável e contato',
]

function renderizar() {
  return render(
    <MemoryRouter>
      <TermosPage />
    </MemoryRouter>,
  )
}

describe('TermosPage', () => {
  it('tem_o_titulo_e_a_vigencia', () => {
    renderizar()

    expect(screen.getByRole('heading', { level: 1, name: 'Termos de Uso' })).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`Vigência:? ${VIGENCIA}`))).toBeInTheDocument()
  })

  it('tem_um_h2_para_cada_secao_na_ordem', () => {
    renderizar()

    const titulos = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent ?? '')
    expect(titulos).toHaveLength(SECOES.length)
    SECOES.forEach((secao, i) => {
      expect(titulos[i]).toContain(secao)
    })
  })

  it('cita_contato_e_maioridade', () => {
    const { container } = renderizar()
    const texto = container.textContent ?? ''

    expect(texto).toContain(CONTATO_EMAIL)
    expect(texto).toContain('18 anos')
  })

  it('o_email_de_contato_e_um_link_mailto', () => {
    renderizar()

    expect(screen.getAllByRole('link', { name: CONTATO_EMAIL })[0]).toHaveAttribute('href', `mailto:${CONTATO_EMAIL}`)
  })

  it('linka_para_a_politica_de_privacidade', () => {
    renderizar()

    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade')
  })

  it('nao_tem_link_com_href_vazio', () => {
    renderizar()

    for (const link of screen.queryAllByRole('link')) {
      expect(link.getAttribute('href') ?? '').not.toBe('')
    }
  })
})
