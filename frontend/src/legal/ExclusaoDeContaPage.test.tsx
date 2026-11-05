import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from '../App'
import { AuthProvider } from '../auth/AuthProvider'
import { semSessao } from '../teste/auth'
import { renderComApp } from '../teste/render'
import { CONTATO_EMAIL } from './responsavel'

function renderizar() {
  return renderComApp(
    <AuthProvider>
      <App />
    </AuthProvider>,
    '/excluir-conta',
  )
}

describe('ExclusaoDeContaPage', () => {
  it('abre_sem_login_com_o_titulo', async () => {
    semSessao()
    renderizar()

    expect(await screen.findByRole('heading', { level: 1, name: /Excluir sua conta do Aprumo/ })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Entrar' })).not.toBeInTheDocument()
  })

  it('lista_os_passos_para_excluir_pelo_app', async () => {
    semSessao()
    renderizar()

    const passos = await screen.findAllByRole('listitem')
    const texto = passos.map((p) => p.textContent ?? '').join(' | ')
    expect(texto).toMatch(/Abra o app/i)
    expect(texto).toMatch(/Preferências|menu/i)
    expect(texto).toMatch(/botão de menu.*barra do topo/i)
    expect(texto).not.toMatch(/ícone de menu no topo/i)
    expect(texto).toContain('Excluir conta')
    expect(screen.getByRole('list', { name: 'Passos para excluir a conta' })).toBeInTheDocument()
  })

  it('cita_o_que_e_apagado_o_prazo_e_o_email', async () => {
    semSessao()
    const { container } = renderizar()
    await screen.findByRole('heading', { level: 1 })
    const texto = container.textContent ?? ''

    for (const termo of ['tarefas', 'notas', 'lançamentos', 'cartões', 'categorias', 'projetos']) {
      expect(texto).toContain(termo)
    }
    expect(texto).toContain('imediata e definitiva')
    expect(screen.getAllByRole('link', { name: CONTATO_EMAIL })[0]).toHaveAttribute('href', `mailto:${CONTATO_EMAIL}`)
  })

  it('liga_para_a_politica_de_privacidade', async () => {
    semSessao()
    renderizar()

    expect(await screen.findByRole('link', { name: /Política de Privacidade/ })).toHaveAttribute('href', '/privacidade')
  })
})
