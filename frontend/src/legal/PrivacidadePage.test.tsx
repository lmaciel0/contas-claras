import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { PrivacidadePage } from './PrivacidadePage'
import { CONTATO_EMAIL, VIGENCIA } from './responsavel'

const SECOES = [
  'Quem somos',
  'Dados que coletamos',
  'Para que usamos e base legal',
  'Com quem compartilhamos',
  'Cookies e armazenamento local',
  'Por quanto tempo guardamos',
  'Segurança',
  'Seus direitos',
  'Crianças e adolescentes',
  'Mudanças nesta política',
]

function renderizar() {
  return render(
    <MemoryRouter>
      <PrivacidadePage />
    </MemoryRouter>,
  )
}

describe('PrivacidadePage', () => {
  it('tem_o_titulo_e_a_vigencia', () => {
    renderizar()

    expect(screen.getByRole('heading', { level: 1, name: 'Política de Privacidade' })).toBeInTheDocument()
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

  it('cita_contato_provedores_cookie_e_prazo', () => {
    const { container } = renderizar()
    const texto = container.textContent ?? ''

    for (const termo of [CONTATO_EMAIL, 'Supabase', 'Render', 'Vercel', 'Google', 'cc_session', '15 dias']) {
      expect(texto).toContain(termo)
    }
  })

  it('nao_tem_link_com_href_vazio', () => {
    renderizar()

    for (const link of screen.queryAllByRole('link')) {
      expect(link.getAttribute('href') ?? '').not.toBe('')
    }
  })

  it('o_email_de_contato_e_um_link_mailto', () => {
    renderizar()

    expect(screen.getAllByRole('link', { name: CONTATO_EMAIL })[0]).toHaveAttribute('href', `mailto:${CONTATO_EMAIL}`)
  })
})
