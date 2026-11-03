import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Outlet } from 'react-router'
import { AvisoServidor } from './AvisoServidor'
import { HeaderPrincipal } from './HeaderPrincipal'
import { Logo } from './Logo'
import { PainelLateralDireito } from './PainelLateralDireito'
import { PaletaContext } from './paleta'
import { PaletaNavegacao } from './PaletaNavegacao'
import { DockLateral } from './DockLateral'
import { PreferenciasModal } from '../preferencias/PreferenciasModal'
import { usePreferencias } from '../preferencias/usePreferencias'
import { travarRolagem } from './travaRolagem'
import { useEhDesktop } from './useEhDesktop'

interface Props {
  nomeUsuario?: string
  aoSair?: () => void
}

const foco = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]'
const botaoIcone = `grid min-h-11 min-w-11 shrink-0 cursor-pointer place-items-center rounded-xl text-[var(--cor-texto)] hover:bg-[var(--cor-fundo)] ${foco}`

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** No desktop o vão vem do `gap-3 p-3` do grid, então o `main` não tem padding; abaixo de 1280 px mantém o de antes. */
function classesMain(larguraTotal: boolean, ehDesktop: boolean): string {
  const largura = larguraTotal ? 'w-full min-w-0 outline-none' : 'mx-auto w-full max-w-6xl min-w-0 outline-none'
  if (ehDesktop) {
    return `${largura} col-start-2 row-start-2`
  }
  return `${largura} px-4 py-5 ${larguraTotal ? 'md:px-8' : 'md:px-6'}`
}

/**
 * Moldura das telas logadas. Em ≥ 1280 px a DockLateral fica flutuante à esquerda. Abaixo disso há uma barra fina no topo com o
 * botão "Abrir menu"; o menu desliza sobre um fundo escurecido (Esc, clique no fundo ou navegar fecham; ao virar desktop fecha sozinho).
 */
export function AppShell({ nomeUsuario, aoSair = () => undefined }: Props) {
  const ehDesktop = useEhDesktop()
  const { preferencias } = usePreferencias()
  const [aberto, setAberto] = useState(false)
  const [paletaAberta, setPaletaAberta] = useState(false)
  const [painelProdutividadeAberto, setPainelProdutividadeAberto] = useState(false)
  const [modalPreferenciasAberta, setModalPreferenciasAberta] = useState(false)
  const botao = useRef<HTMLButtonElement>(null)
  const painel = useRef<HTMLDivElement>(null)
  const principal = useRef<HTMLElement>(null)
  const painelEstavaAberto = useRef(false)
  const idPainel = useId()

  const painelAberto = aberto && !ehDesktop

  // Virou desktop com o painel aberto: zera o estado já na renderização (padrão do React para estado derivado).
  if (ehDesktop && aberto) {
    setAberto(false)
  }

  const fechar = useCallback(() => {
    setAberto(false)
    botao.current?.focus()
  }, [])

  useEffect(() => {
    if (!painelAberto) {
      return
    }
    painel.current?.querySelector<HTMLElement>(FOCAVEIS)?.focus()
    const soltarRolagem = travarRolagem()
    const fecharComEsc = (evento: globalThis.KeyboardEvent) => {
      if (evento.key === 'Escape') {
        fechar()
      }
    }
    document.addEventListener('keydown', fecharComEsc)
    return () => {
      soltarRolagem()
      document.removeEventListener('keydown', fecharComEsc)
    }
  }, [painelAberto, fechar])

  // Painel aberto que some porque a tela virou desktop: o foco (que estava nele) iria para o body; leva ao conteúdo.
  useEffect(() => {
    if (painelEstavaAberto.current && !painelAberto && ehDesktop) {
      principal.current?.focus()
    }
    painelEstavaAberto.current = painelAberto
  }, [painelAberto, ehDesktop])

  // Atalho global da paleta "Ir para…". Com o painel do menu aberto (celular) só bloqueia o atalho do navegador.
  useEffect(() => {
    const abrirComAtalho = (evento: globalThis.KeyboardEvent) => {
      if (
        (evento.ctrlKey || evento.metaKey) &&
        !evento.altKey &&
        !evento.shiftKey &&
        evento.key.toLowerCase() === 'k'
      ) {
        evento.preventDefault()
        if (!painelAberto) {
          setPaletaAberta(true)
        }
      }
    }
    document.addEventListener('keydown', abrirComAtalho)
    return () => document.removeEventListener('keydown', abrirComAtalho)
  }, [painelAberto])

  // Barra fixa no desktop: quem rola é o documento, então o `scroll-padding-top` vai no <html>. Sem ele, o foco por
  // teclado (e âncoras) levaria o elemento para baixo das pílulas (WCAG 2.4.11).
  const reservaTopo = ehDesktop && preferencias.barraFixa
  useEffect(() => {
    if (!reservaTopo) {
      return
    }
    const raiz = document.documentElement
    raiz.style.scrollPaddingTop = '5rem'
    return () => {
      raiz.style.scrollPaddingTop = ''
    }
  }, [reservaTopo])

  const paleta = useMemo(() => ({ abrir: () => setPaletaAberta(true) }), [])
  const fecharPaleta = useCallback(() => setPaletaAberta(false), [])

  /** Mantém o Tab dentro do painel enquanto ele está aberto. */
  const prenderFoco = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (evento.key !== 'Tab' || !painel.current) {
      return
    }
    const itens = painel.current.querySelectorAll<HTMLElement>(FOCAVEIS)
    const primeiro = itens[0]
    const ultimo = itens[itens.length - 1]
    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault()
      ultimo?.focus()
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault()
      primeiro?.focus()
    }
  }

  const barraSuperior = (
    <header className="superficie sticky top-3 z-30 m-3 flex items-center gap-2 rounded-2xl px-3 py-2">
      <button
        ref={botao}
        type="button"
        aria-label="Abrir menu"
        aria-expanded={painelAberto}
        aria-controls={painelAberto ? idPainel : undefined}
        onClick={() => setAberto(true)}
        className={botaoIcone}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <Logo />
    </header>
  )

  const dockDesktop = (
    <div className="superficie row-span-2 row-start-1 col-start-1 sticky top-3 flex h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-3xl">
      <DockLateral
        nomeUsuario={nomeUsuario}
        aoSair={aoSair}
        aoAbrirPreferencias={() => setModalPreferenciasAberta(true)}
      />
    </div>
  )

  // Com o painel de produtividade aberto abaixo de 2xl o grid ganha a 3ª coluna; de 2xl em diante ela é sempre fixa.
  const colunasDesktop = painelProdutividadeAberto
    ? 'grid-cols-[auto_1fr_20rem]'
    : 'grid-cols-[auto_1fr] 2xl:grid-cols-[auto_1fr_20rem]'

  // O `<main>` (e a página dentro dele) fica sempre na mesma posição da árvore: só a dock ou a barra do topo
  // trocam, então cruzar 1280 px não remonta a rota nem perde o que foi digitado.
  return (
    <PaletaContext value={paleta}>
      <div className="min-h-dvh" style={{ background: 'var(--fundo-degrade)' }}>
        <AvisoServidor />
        <div className={ehDesktop ? `grid min-h-dvh grid-rows-[auto_1fr] gap-3 p-3 ${colunasDesktop}` : undefined}>
          {ehDesktop ? dockDesktop : barraSuperior}
          {ehDesktop && (
            <div
              className={`col-[2/-1] row-start-1 min-w-0 ${
                preferencias.barraFixa ? 'sticky top-3 z-20' : 'relative z-20'
              }`}
            >
              {/* Em modo fixo, esta camada esmaece o conteúdo que rola por baixo das pílulas. Fica separada do
                  <header> porque a máscara cortaria o menu do avatar, que se estende para fora do cabeçalho. */}
              {preferencias.barraFixa && (
                <div
                  aria-hidden="true"
                  data-testid="fundo-da-barra-fixa"
                  className="pointer-events-none absolute -inset-x-3 -top-3 -bottom-5 -z-10 bg-[var(--cor-fundo)]/60 backdrop-blur-md"
                  style={{
                    maskImage: 'linear-gradient(to bottom, black 85%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent)',
                  }}
                />
              )}
              <HeaderPrincipal
                nomeUsuario={nomeUsuario}
                aoSair={aoSair}
                onAbrirBusca={paleta.abrir}
                onAlternarPainelProdutividade={() => setPainelProdutividadeAberto((v) => !v)}
                painelProdutividadeAberto={painelProdutividadeAberto}
                onAbrirPreferencias={() => setModalPreferenciasAberta(true)}
              />
            </div>
          )}
          <main
            ref={principal}
            tabIndex={-1}
            className={classesMain(preferencias.layoutLargura === 'largura-total', ehDesktop)}
          >
            <Outlet />
          </main>
          {ehDesktop && (
            <PainelLateralDireito
              className={
                painelProdutividadeAberto
                  ? 'col-start-3 row-start-2'
                  : 'col-start-3 row-start-2 hidden 2xl:flex'
              }
              aoFechar={() => setPainelProdutividadeAberto(false)}
            />
          )}
        </div>

        {painelAberto && (
          <div className="fixed inset-0 z-40">
            <div
              data-testid="fundo-do-menu"
              aria-hidden="true"
              onClick={fechar}
              className="menu-fundo absolute inset-0 bg-[var(--cor-texto)]/50"
            />
            <div
              ref={painel}
              id={idPainel}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              onKeyDown={prenderFoco}
              className="menu-painel superficie absolute inset-y-3 left-3 flex w-[min(20rem,calc(100vw-1.5rem))] flex-col gap-3 overflow-y-auto rounded-3xl p-3"
            >
              <div className="flex items-center justify-between gap-2 px-1 pb-2 border-b border-[var(--cor-linha)]">
                <Logo />
                <button type="button" aria-label="Fechar menu" onClick={fechar} className={botaoIcone}>
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <DockLateral
                  forcarExpandida={true}
                  nomeUsuario={nomeUsuario}
                  aoSair={aoSair}
                  aoNavegar={fechar}
                  aoAbrirPreferencias={() => {
                    fechar()
                    setModalPreferenciasAberta(true)
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <PaletaNavegacao aberta={paletaAberta} aoFechar={fecharPaleta} />
        <PreferenciasModal
          aberta={modalPreferenciasAberta}
          aoFechar={() => setModalPreferenciasAberta(false)}
        />
      </div>
    </PaletaContext>
  )
}
