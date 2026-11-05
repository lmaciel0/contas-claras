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

  it('cita_transferencia_internacional_maioridade_e_retencao_real', () => {
    const { container } = renderizar()
    const texto = container.textContent ?? ''

    expect(texto).toContain('art. 33')
    expect(texto).toContain('18 anos')
    expect(texto).toContain('primeiro pedido feito depois de 24 horas')
    expect(texto).toContain('apagado no uso seguinte')
  })

  it('nao_afirma_retencao_que_o_backend_nao_cumpre', () => {
    const { container } = renderizar()
    const texto = container.textContent ?? ''

    expect(texto).not.toContain('HMAC do IP e do e-mail):</strong> até 24 horas')
    expect(texto).not.toContain('Vale só enquanto a sessão durar')
    expect(texto).toContain('até 24 horas ou ao sair')
  })

  it('diz_que_o_aprumo_nao_grava_o_ip_e_que_os_provedores_guardam_logs', () => {
    const { container } = renderizar()
    const texto = container.textContent ?? ''

    expect(texto).toContain('O Aprumo não grava o IP em texto aberto')
    expect(texto).not.toContain('e o IP não é gravado em texto aberto')
    expect(texto).toContain('IP e dados técnicos de acesso nos próprios logs')
  })

  it('cita_a_exclusao_de_conta_imediata_e_definitiva_no_app_e_por_email', () => {
    const { container } = renderizar()
    const texto = container.textContent ?? ''

    expect(texto).toContain('imediata e definitiva')
    expect(texto).toContain('Excluir conta')
    expect(texto).not.toContain('Hoje esses pedidos são feitos por e-mail')
    expect(screen.getByRole('link', { name: /excluir sua conta/i })).toHaveAttribute('href', '/excluir-conta')
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
