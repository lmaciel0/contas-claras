import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, matchPath, useLocation } from 'react-router'
import { FolhaAcaoRapida, ID_FOLHA_ACAO_RAPIDA } from './AcaoRapida'
import { foco } from './classesFoco'
import { ICONES } from './icones'
import { ITENS_DOCK, type ItemMenu } from './itensMenu'
import { useMesSelecionado } from './useMesSelecionado'

const baseItem = `flex min-h-11 min-w-11 items-center justify-center rounded-full text-xs font-bold no-underline transition-colors duration-200 ease-out motion-safe:active:scale-95 motion-reduce:transition-none ${foco}`

/** Ativo na própria rota (exata, no caso do Início) ou em qualquer rota do grupo que o item representa. */
function estaAtivo(item: ItemMenu, pathname: string): boolean {
  const caminhos = [item.caminho, ...(item.tambemAtivoEm ?? [])]
  return caminhos.some((caminho) => matchPath({ path: caminho, end: item.exata ?? false }, pathname) !== null)
}

/** Quantos itens vêm antes do botão "Criar" (Início e Notas). */
const ANTES_DO_CRIAR = 2

/**
 * Dock flutuante do celular (menos de 768 px): pílula fixa embaixo com toda a navegação (Início, Notas, Orçamento e
 * Mais) e, no centro, entre Notas e Orçamento, o botão "Criar" elevado, que abre a folha de ações rápidas. Só o item
 * ativo mostra o rótulo (o `aria-label` vale para todos e a cor não é o único sinal: o ativo é um bloco preenchido com
 * texto). O rótulo entra com fade e leve deslocamento (`.dock-rotulo`, desligado em `prefers-reduced-motion`). Só cor,
 * opacidade e transform animam.
 *
 * A folha é irmã do `<nav>`, não filha: o `backdrop-blur` do nav cria um bloco de contenção e quebraria o `fixed inset-0`
 * dela. Trocar de rota com a folha aberta (gesto de voltar do Android/TWA, que não tem Esc) fecha a folha.
 */
export function DockInferior() {
  const { busca } = useMesSelecionado()
  const { pathname } = useLocation()
  const [aberta, setAberta] = useState(false)
  const [pathnameAnterior, setPathnameAnterior] = useState(pathname)
  const botaoCriar = useRef<HTMLButtonElement>(null)

  // Estado derivado na renderização (como no AppShell); ao desmontar a folha o hook solta a rolagem do corpo.
  if (pathnameAnterior !== pathname) {
    setPathnameAnterior(pathname)
    if (aberta) {
      setAberta(false)
    }
  }

  const fechar = useCallback(() => setAberta(false), [])

  // Devolve o foco ao botão "Criar" ao fechar a folha, por qualquer caminho (Esc, fundo, item ou troca de rota).
  const estavaAberta = useRef(false)
  useEffect(() => {
    if (aberta) {
      estavaAberta.current = true
    } else if (estavaAberta.current) {
      estavaAberta.current = false
      botaoCriar.current?.focus()
    }
  }, [aberta])

  const botao = (
    <button
      key="criar"
      ref={botaoCriar}
      type="button"
      aria-label="Criar"
      aria-haspopup="dialog"
      aria-expanded={aberta}
      aria-controls={aberta ? ID_FOLHA_ACAO_RAPIDA : undefined}
      onClick={() => setAberta(true)}
      className={`-mt-6 grid size-14 min-h-11 min-w-11 shrink-0 cursor-pointer place-items-center rounded-full bg-[var(--cor-principal)] text-[var(--cor-sobre-principal)] shadow-[0_8px_18px_color-mix(in_srgb,var(--cor-principal)_45%,transparent)] ring-4 ring-[var(--cor-card)] transition-transform duration-200 ease-out motion-safe:active:scale-95 motion-reduce:transition-none ${foco}`}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  )

  const itens = ITENS_DOCK.map((item) => {
    const ativo = estaAtivo(item, pathname)
    return (
      <Link
        key={item.caminho}
        to={{ pathname: item.caminho, search: item.comMes ? busca : '' }}
        aria-label={item.rotulo}
        aria-current={ativo ? 'page' : undefined}
        className={`${baseItem} ${
          ativo
            ? 'gap-1.5 bg-[var(--cor-principal)] pr-3.5 pl-3 text-[var(--cor-sobre-principal)]'
            : 'text-[var(--cor-mutado)] hover:bg-[var(--cor-fundo)] hover:text-[var(--cor-texto)]'
        }`}
      >
        {ICONES[item.caminho]}
        {ativo && <span className="dock-rotulo">{item.rotulo}</span>}
      </Link>
    )
  })

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-2.5 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md items-center justify-between gap-0.5 rounded-full border border-[var(--cor-linha)] bg-[color-mix(in_srgb,var(--cor-card)_88%,transparent)] p-1.5 shadow-[0_10px_24px_color-mix(in_srgb,var(--cor-principal)_18%,transparent)] backdrop-blur-[10px]"
      >
        {[...itens.slice(0, ANTES_DO_CRIAR), botao, ...itens.slice(ANTES_DO_CRIAR)]}
      </nav>
      <FolhaAcaoRapida aberta={aberta} aoFechar={fechar} />
    </>
  )
}
