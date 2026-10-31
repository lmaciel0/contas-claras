import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Outlet } from 'react-router'
import { AvisoServidor } from './AvisoServidor'
import { Logo } from './Logo'
import { PaletaContext } from './paleta'
import { PaletaNavegacao } from './PaletaNavegacao'
import { Sidebar } from './Sidebar'
import { travarRolagem } from './travaRolagem'
import { useEhDesktop } from './useEhDesktop'

interface Props {
  nomeUsuario?: string
  aoSair?: () => void
}

const foco = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]'
const botaoIcone = `grid min-h-11 min-w-11 shrink-0 cursor-pointer place-items-center rounded-xl text-[var(--cor-texto)] hover:bg-[var(--cor-fundo)] ${foco}`

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Moldura das telas logadas. Em ≥ 1280 px a sidebar fica fixa à esquerda. Abaixo disso há uma barra fina no topo com o
 * botão "Abrir menu"; o menu é a mesma `Sidebar`, num painel que desliza sobre um fundo escurecido (Esc, clique no
 * fundo ou navegar fecham; ao virar desktop ele fecha sozinho).
 */
export function AppShell({ nomeUsuario, aoSair = () => undefined }: Props) {
  const ehDesktop = useEhDesktop()
  const [aberto, setAberto] = useState(false)
  const [paletaAberta, setPaletaAberta] = useState(false)
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
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-[var(--cor-linha)] bg-[var(--cor-card)] px-3 py-2">
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

  const sidebarFixa = (
    <aside className="sticky top-0 flex h-dvh flex-col gap-3 overflow-y-auto border-r border-[var(--cor-linha)] bg-[var(--cor-card)] px-3 py-4">
      <div className="px-1">
        <Logo />
      </div>
      <div className="min-h-0 flex-1">
        <Sidebar nomeUsuario={nomeUsuario} aoSair={aoSair} />
      </div>
    </aside>
  )

  // O `<main>` (e a página dentro dele) fica sempre na mesma posição da árvore: só a sidebar fixa ou a barra do topo
  // trocam, então cruzar 1280 px não remonta a rota nem perde o que foi digitado.
  return (
    <PaletaContext value={paleta}>
      <div className="min-h-dvh bg-[var(--cor-fundo)]">
        <AvisoServidor />
        <div className={ehDesktop ? 'grid min-h-dvh grid-cols-[240px_1fr]' : undefined}>
          {ehDesktop ? sidebarFixa : barraSuperior}
          <main ref={principal} tabIndex={-1} className="mx-auto w-full max-w-6xl min-w-0 px-4 py-5 outline-none md:px-6">
            <Outlet />
          </main>
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
              className="menu-painel absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col gap-3 overflow-y-auto border-r border-[var(--cor-linha)] bg-[var(--cor-card)] px-3 py-3"
            >
              <div className="flex items-center justify-between gap-2 px-1">
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
                <Sidebar nomeUsuario={nomeUsuario} aoSair={aoSair} aoNavegar={fechar} />
              </div>
            </div>
          </div>
        )}

        <PaletaNavegacao aberta={paletaAberta} aoFechar={fecharPaleta} />
      </div>
    </PaletaContext>
  )
}
