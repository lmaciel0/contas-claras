import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/cliente'
import { PreferenciasProvider } from '../preferencias/PreferenciasContext'
import { gravarPreferencias, PREFERENCIAS_PADRAO } from '../preferencias/preferenciasStorage'
import { renderComApp } from '../teste/render'
import { servidor } from '../teste/servidor'
import { AppShell } from './AppShell'

beforeEach(() => {
  localStorage.clear()
})

function definirLargura(largura: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: largura })
  window.dispatchEvent(new Event('resize'))
}

type Envoltorio = (props: { children: ReactNode }) => ReactNode

const semEnvoltorio: Envoltorio = ({ children }) => children

function renderizar(rota = '/?ano=2026&mes=10', aoSair = vi.fn(), Envoltorio: Envoltorio = semEnvoltorio) {
  renderComApp(
    <Envoltorio>
      <Routes>
        <Route element={<AppShell nomeUsuario="Ana" aoSair={aoSair} />}>
          <Route path="/" element={<p>Conteúdo do Início</p>} />
          <Route path="/formulario" element={<input aria-label="Descrição" />} />
          <Route path="/lancamentos" element={<p>Conteúdo dos Lançamentos</p>} />
          <Route path="/cartoes" element={<p>Conteúdo dos Cartões</p>} />
          <Route path="/categorias" element={<p>Conteúdo das Categorias</p>} />
          <Route path="/relatorios" element={<p>Conteúdo dos Relatórios</p>} />
        </Route>
      </Routes>
    </Envoltorio>,
    rota,
  )
  return { aoSair }
}

describe('AppShell no computador (1280 px ou mais)', () => {
  it.each([1280, 1440])('em %i px mostra a sidebar e nenhum botão de menu', (largura) => {
    definirLargura(largura)
    renderizar()

    expect(screen.getByRole('navigation', { name: 'Menu principal' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Abrir menu' })).not.toBeInTheDocument()
    expect(screen.getByText('Conteúdo do Início')).toBeInTheDocument()
  })

  it('clicar em Preferências na dock abre o modal de preferências', async () => {
    definirLargura(1280)
    renderizar()

    const botaoPrefs = screen.getByRole('button', { name: /^preferências$/i })
    await userEvent.click(botaoPrefs)

    expect(screen.getByRole('dialog', { name: /preferências/i })).toBeInTheDocument()
  })
})

describe('grid do desktop', () => {
  it('desktop_usa_grid_de_duas_linhas', () => {
    definirLargura(1400)
    renderizar()

    const main = screen.getByRole('main')
    const grid = main.closest('.grid-rows-\\[auto_1fr\\]')
    expect(grid).not.toBeNull()
    const banner = screen.getByRole('banner')
    expect(main.parentElement).toBe(grid)
    expect(banner.parentElement?.parentElement).toBe(grid)
    expect(banner.parentElement).toHaveClass('row-start-1')
    expect(main).toHaveClass('row-start-2')
    expect(banner.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('painel_aberto_abaixo_de_2xl_ganha_terceira_coluna', async () => {
    definirLargura(1400)
    renderizar()
    const grid = screen.getByRole('main').closest('.grid-rows-\\[auto_1fr\\]')
    expect(grid).not.toHaveClass('grid-cols-[auto_1fr_20rem]')

    await userEvent.click(screen.getByRole('button', { name: 'Alternar painel de produtividade' }))

    expect(grid).toHaveClass('grid-cols-[auto_1fr_20rem]')
  })
})

describe('barra do topo fixa', () => {
  it('barraFixa ligada: topo sticky com camada de esmaecimento separada do header', () => {
    gravarPreferencias({ ...PREFERENCIAS_PADRAO, barraFixa: true })
    definirLargura(1400)
    renderizar(undefined, undefined, PreferenciasProvider)

    const envoltorio = screen.getByRole('banner').parentElement
    expect(envoltorio).toHaveClass('sticky', 'top-3', 'z-20')
    const camada = screen.getByTestId('fundo-da-barra-fixa')
    expect(envoltorio).toContainElement(camada)
    expect(screen.getByRole('banner')).not.toContainElement(camada)
  })

  it('barraFixa desligada: topo relative e sem camada de esmaecimento', () => {
    gravarPreferencias({ ...PREFERENCIAS_PADRAO, barraFixa: false })
    definirLargura(1400)
    renderizar(undefined, undefined, PreferenciasProvider)

    expect(screen.getByRole('banner').parentElement).toHaveClass('relative', 'z-20')
    expect(screen.queryByTestId('fundo-da-barra-fixa')).not.toBeInTheDocument()
  })

  it('barraFixa ligada no desktop: o scroll reserva espaço no topo para o foco não ficar sob as pílulas', () => {
    gravarPreferencias({ ...PREFERENCIAS_PADRAO, barraFixa: true })
    definirLargura(1400)
    renderizar(undefined, undefined, PreferenciasProvider)

    expect(document.documentElement.style.scrollPaddingTop).toBe('5rem')
  })

  it('barraFixa desligada, ou abaixo de 1280 px, não reserva espaço no topo', () => {
    gravarPreferencias({ ...PREFERENCIAS_PADRAO, barraFixa: false })
    definirLargura(1400)
    const { unmount } = renderComApp(
      <PreferenciasProvider>
        <Routes>
          <Route element={<AppShell nomeUsuario="Ana" />}>
            <Route path="/" element={<p>Início</p>} />
          </Route>
        </Routes>
      </PreferenciasProvider>,
    )
    expect(document.documentElement.style.scrollPaddingTop).toBe('')
    unmount()

    gravarPreferencias({ ...PREFERENCIAS_PADRAO, barraFixa: true })
    definirLargura(390)
    renderizar(undefined, undefined, PreferenciasProvider)
    expect(document.documentElement.style.scrollPaddingTop).toBe('')
  })

  it('ao sair do shell o scroll-padding é removido', () => {
    gravarPreferencias({ ...PREFERENCIAS_PADRAO, barraFixa: true })
    definirLargura(1400)
    const { unmount } = renderComApp(
      <PreferenciasProvider>
        <Routes>
          <Route element={<AppShell nomeUsuario="Ana" />}>
            <Route path="/" element={<p>Início</p>} />
          </Route>
        </Routes>
      </PreferenciasProvider>,
    )
    expect(document.documentElement.style.scrollPaddingTop).toBe('5rem')
    unmount()
    expect(document.documentElement.style.scrollPaddingTop).toBe('')
  })
})

describe('padding do main', () => {
  it('desktop: sem padding próprio (o vão vem do grid), nos dois modos de largura', () => {
    definirLargura(1400)
    renderizar()
    const main = screen.getByRole('main')
    expect(main.className).not.toMatch(/(^|\s)(md:)?p[xy]-\d/)
    expect(main).toHaveClass('max-w-6xl', 'mx-auto')
  })

  it('desktop com largura-total: sem padding e sem max-w', () => {
    gravarPreferencias({ ...PREFERENCIAS_PADRAO, layoutLargura: 'largura-total' })
    definirLargura(1400)
    renderizar(undefined, undefined, PreferenciasProvider)
    const main = screen.getByRole('main')
    expect(main.className).not.toMatch(/(^|\s)(md:)?p[xy]-\d/)
    expect(main).not.toHaveClass('max-w-6xl')
    expect(main).toHaveClass('w-full')
  })

  it('abaixo de 1280 px mantém o padding original', () => {
    definirLargura(390)
    renderizar()
    expect(screen.getByRole('main')).toHaveClass('px-4', 'py-5', 'md:px-6')
  })
})

describe('AppShell abaixo de 1280 px', () => {
  it.each([390, 768, 1279])('em %i px mostra "Abrir menu" fechado e esconde a sidebar', (largura) => {
    definirLargura(largura)
    renderizar()

    const botao = screen.getByRole('button', { name: 'Abrir menu' })

    expect(botao).toHaveAttribute('aria-expanded', 'false')
    expect(botao).not.toHaveAttribute('aria-controls')
    expect(botao).toHaveClass('min-h-11', 'min-w-11')
    expect(screen.queryByRole('navigation', { name: 'Menu principal' })).not.toBeInTheDocument()
  })

  it('barra_fina_usa_superficie_flutuante', () => {
    definirLargura(900)
    renderizar()

    const barra = screen.getByRole('banner')

    expect(barra).toHaveClass('superficie', 'sticky', 'top-3', 'rounded-2xl', 'm-3')
    expect(barra).not.toHaveClass('border-b')
    expect(barra).not.toHaveClass('bg-[var(--cor-card)]')
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveClass('min-h-11')
  })

  it('gaveta_do_menu_usa_superficie_flutuante', async () => {
    definirLargura(390)
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))

    const painel = screen.getByRole('dialog', { name: 'Menu' })

    expect(painel).toHaveClass('superficie', 'rounded-3xl')
    expect(painel).not.toHaveClass('border-r')
    expect(painel).not.toHaveClass('bg-[var(--cor-card)]')
  })

  it('abrir o menu mostra o painel; Esc fecha e devolve o foco ao botão', async () => {
    definirLargura(390)
    renderizar()
    const botao = screen.getByRole('button', { name: 'Abrir menu' })

    await userEvent.click(botao)

    expect(botao).toHaveAttribute('aria-expanded', 'true')
    const painel = screen.getByRole('dialog', { name: 'Menu' })
    expect(botao).toHaveAttribute('aria-controls', painel.id)
    expect(within(painel).getByRole('navigation', { name: 'Menu principal' })).toBeInTheDocument()
    expect(painel.contains(document.activeElement)).toBe(true)

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
    expect(botao).toHaveAttribute('aria-expanded', 'false')
    expect(botao).toHaveFocus()
  })

  it('clicar no fundo escurecido fecha o painel', async () => {
    definirLargura(390)
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))

    await userEvent.click(screen.getByTestId('fundo-do-menu'))

    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
  })

  it('clicar num link do painel navega e fecha o painel', async () => {
    definirLargura(390)
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))

    await userEvent.click(within(screen.getByRole('dialog', { name: 'Menu' })).getByRole('link', { name: 'Cartões' }))

    expect(screen.getByText('Conteúdo dos Cartões')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
  })

  it('Sair no painel chama aoSair', async () => {
    definirLargura(390)
    const { aoSair } = renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))

    expect(aoSair).toHaveBeenCalledTimes(1)
  })

  it('o Tab fica preso dentro do painel', async () => {
    definirLargura(390)
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
    const painel = screen.getByRole('dialog', { name: 'Menu' })

    for (let i = 0; i < 30; i++) {
      await userEvent.tab()
      expect(painel.contains(document.activeElement)).toBe(true)
    }
    for (let i = 0; i < 30; i++) {
      await userEvent.tab({ shift: true })
      expect(painel.contains(document.activeElement)).toBe(true)
    }
  })

  it('redimensionar para 1280 px ou mais com o painel aberto fecha o painel e mostra a sidebar fixa', async () => {
    definirLargura(1279)
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))

    act(() => definirLargura(1280))

    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Abrir menu' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('navigation', { name: 'Menu principal' })).toHaveLength(1)

    act(() => definirLargura(1279))

    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('troca de layout ao cruzar 1280 px', () => {
  it('o foco vai para o main quando o painel aberto some por redimensionamento', async () => {
    definirLargura(1279)
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))

    act(() => definirLargura(1280))

    expect(screen.getByRole('main')).toHaveFocus()
  })

  it('o foco não é roubado quando o painel fecha pelo teclado', async () => {
    definirLargura(1279)
    renderizar()
    const botao = screen.getByRole('button', { name: 'Abrir menu' })
    await userEvent.click(botao)
    await userEvent.keyboard('{Escape}')

    expect(botao).toHaveFocus()
    expect(screen.getByRole('main')).not.toHaveFocus()
  })

  it('a página não remonta: o que foi digitado sobrevive ao cruzar o breakpoint nos dois sentidos', async () => {
    definirLargura(1440)
    renderizar('/formulario?ano=2026&mes=10')
    const campo = screen.getByRole('textbox', { name: 'Descrição' })
    await userEvent.type(campo, 'Mercado')

    act(() => definirLargura(390))
    expect(screen.getByRole('textbox', { name: 'Descrição' })).toBe(campo)
    expect(campo).toHaveValue('Mercado')

    act(() => definirLargura(1440))
    expect(screen.getByRole('textbox', { name: 'Descrição' })).toBe(campo)
    expect(campo).toHaveValue('Mercado')
  })
})

describe('trava de rolagem', () => {
  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('abrir o menu trava o body e fechar restaura', async () => {
    definirLargura(390)
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
    expect(document.body.style.overflow).toBe('hidden')

    await userEvent.keyboard('{Escape}')
    expect(document.body.style.overflow).toBe('')
  })
})

describe('moldura', () => {
  it.each([768, 1280])('não existe a dock inferior em %i px', (largura) => {
    definirLargura(largura)
    renderizar()

    expect(screen.queryByRole('navigation', { name: 'Navegação principal' })).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Abas' })).not.toBeInTheDocument()
  })

  it.each([390, 1280])('o logo diz Aprumo e leva a / em %i px', (largura) => {
    definirLargura(largura)
    renderizar('/lancamentos?ano=2026&mes=10')

    expect(screen.getByRole('link', { name: 'Aprumo' })).toHaveAttribute('href', '/')
    expect(screen.queryByText(/contas claras/i)).not.toBeInTheDocument()
  })

  it('o conteúdo da rota aparece dentro de main', () => {
    definirLargura(1280)
    renderizar('/lancamentos?ano=2026&mes=10')

    expect(within(screen.getByRole('main')).getByText('Conteúdo dos Lançamentos')).toBeInTheDocument()
  })
})

describe('dock inferior no celular (menos de 768 px)', () => {
  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('em 600 px renderiza a dock e a barra de topo', () => {
    definirLargura(600)
    renderizar()

    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toBeInTheDocument()
  })

  it.each([900, 1300])('em %i px não renderiza a dock', (largura) => {
    definirLargura(largura)
    renderizar()

    expect(screen.queryByRole('navigation', { name: 'Navegação principal' })).not.toBeInTheDocument()
  })

  it('em 1300 px mantém a lateral', () => {
    definirLargura(1300)
    renderizar()

    expect(screen.getByRole('navigation', { name: 'Menu principal' })).toBeInTheDocument()
  })

  it('o limite é 767/768 px', () => {
    definirLargura(767)
    renderizar()
    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument()

    act(() => definirLargura(768))
    expect(screen.queryByRole('navigation', { name: 'Navegação principal' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toBeInTheDocument()
  })

  it('o main reserva espaço para a dock e para a área segura do aparelho', () => {
    definirLargura(600)
    renderizar()

    const main = screen.getByRole('main')
    expect(main.className).toMatch(/(^|\s)pb-/)
    expect(main.className).toMatch(/safe-area-inset-bottom/)
  })

  it.each([768, 1300])('fora do celular (%i px) o main não reserva espaço para a dock', (largura) => {
    definirLargura(largura)
    renderizar()

    expect(screen.getByRole('main').className).not.toMatch(/safe-area-inset-bottom/)
  })

  it('o menu "Abrir menu" abre sobre a dock e o link "Excluir conta" está nele', async () => {
    definirLargura(600)
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))

    const painel = screen.getByRole('dialog', { name: 'Menu' })
    expect(within(painel).getByRole('link', { name: 'Excluir conta' })).toHaveAttribute('href', '/conta/excluir')
  })

  it('redimensionar de 600 para 1300 px com o menu aberto fecha o menu e tira a dock', async () => {
    definirLargura(600)
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeInTheDocument()

    act(() => definirLargura(1300))

    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Navegação principal' })).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
    expect(screen.getByRole('main')).toHaveFocus()
  })

  it('cruzar 767/768 px com o menu aberto fecha o menu, sem estado preso na volta', async () => {
    definirLargura(767)
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))

    act(() => definirLargura(768))

    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')

    act(() => definirLargura(767))

    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument()
  })

  it('a dock marca o item da rota atual como ativo', async () => {
    definirLargura(600)
    renderizar()
    const dock = screen.getByRole('navigation', { name: 'Navegação principal' })

    expect(within(dock).getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page')
  })
})

describe('aviso de servidor acordando', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('aparece depois de 3 s sem resposta e some quando a API responde', async () => {
    definirLargura(1280)
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    servidor.use(
      http.get('/api/resumo', async () => {
        await delay(5000)
        return HttpResponse.json({})
      }),
    )
    renderizar()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    void api('/api/resumo')
    await act(() => vi.advanceTimersByTimeAsync(3100))
    expect(screen.getByRole('status')).toHaveTextContent('Acordando o servidor… isso pode levar até 1 minuto')

    await act(() => vi.advanceTimersByTimeAsync(2500))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

describe('AppShell: ação rápida', () => {
  it('o botão "Criar" aparece no celular', () => {
    definirLargura(390)
    renderizar()
    expect(screen.getByRole('button', { name: 'Criar' })).toBeInTheDocument()
  })

  it.each([768, 1280])('em %i px não há botão "Criar"', (largura) => {
    definirLargura(largura)
    renderizar()
    expect(screen.queryByRole('button', { name: 'Criar' })).not.toBeInTheDocument()
  })

  it('a folha do "Criar" não interfere no menu: os dois diálogos abrem e fecham separados', async () => {
    definirLargura(390)
    renderizar()

    await userEvent.click(screen.getByRole('button', { name: 'Criar' }))
    expect(screen.getByRole('dialog', { name: 'Criar' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Criar' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeInTheDocument()
  })

  it('crescer para 768 px com a folha aberta some com ela e solta a rolagem do corpo', async () => {
    definirLargura(390)
    renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Criar' }))
    expect(document.body.style.overflow).toBe('hidden')

    act(() => definirLargura(768))

    expect(screen.queryByRole('dialog', { name: 'Criar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Criar' })).not.toBeInTheDocument()
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})
