import { useEffect, useRef, type KeyboardEvent } from 'react'
import { usePreferencias } from './usePreferencias'
import type { ModoTema, PresetCor, LayoutLargura } from './preferenciasTipos'
import { travarRolagem } from '../layout/travaRolagem'

interface PreferenciasModalProps {
  aberta: boolean
  aoFechar: () => void
}

const foco =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]'

const PRESETS: Array<{ id: PresetCor; nome: string; cor: string }> = [
  { id: 'azul', nome: 'Azul Aprumo', cor: '#3b82f6' },
  { id: 'lima', nome: 'Lima', cor: '#84cc16' },
  { id: 'esmeralda', nome: 'Esmeralda', cor: '#10b981' },
  { id: 'indigo', nome: 'Índigo', cor: '#6366f1' },
]

export function PreferenciasModal({ aberta, aoFechar }: PreferenciasModalProps) {
  const {
    preferencias,
    setModoTema,
    setPresetCor,
    setLayoutLargura,
    setBarraFixa,
    restaurarPadroes,
  } = usePreferencias()

  const modalRef = useRef<HTMLDivElement>(null)
  const botaoFecharRef = useRef<HTMLButtonElement>(null)

  // Guarda quem tinha o foco ao abrir (o botão "Preferências" da dock, da página Mais ou do menu) e o devolve ao fechar.
  // Vem antes do efeito abaixo, que move o foco para dentro do modal. Só depende de `aberta`: `aoFechar` muda a cada render.
  const origemDoFoco = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!aberta) {
      return
    }
    origemDoFoco.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    return () => {
      if (origemDoFoco.current?.isConnected) {
        origemDoFoco.current.focus()
      }
      origemDoFoco.current = null
    }
  }, [aberta])

  useEffect(() => {
    if (!aberta) {
      return
    }

    const soltarRolagem = travarRolagem()
    botaoFecharRef.current?.focus()

    const aoPressionarTeclado = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        aoFechar()
      }
    }

    window.addEventListener('keydown', aoPressionarTeclado)
    return () => {
      soltarRolagem()
      window.removeEventListener('keydown', aoPressionarTeclado)
    }
  }, [aberta, aoFechar])

  if (!aberta) {
    return null
  }

  const prenderFoco = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (evento.key !== 'Tab' || !modalRef.current) {
      return
    }
    const focaveis = modalRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    if (focaveis.length === 0) return
    const primeiro = focaveis[0]
    const ultimo = focaveis[focaveis.length - 1]
    if (!primeiro || !ultimo) return

    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault()
      ultimo.focus()
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault()
      primeiro.focus()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        data-testid="preferencias-backdrop"
        aria-hidden="true"
        onClick={aoFechar}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
      />

      {/* Caixa do Diálogo */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-preferencias"
        onKeyDown={prenderFoco}
        className="relative z-10 w-full max-w-md rounded-3xl border border-[var(--cor-linha)] bg-[var(--cor-card)] p-6 shadow-2xl transition-all duration-200"
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--cor-linha)]">
          <div>
            <h2 id="titulo-preferencias" className="text-xl font-bold tracking-tight text-[var(--cor-texto)]">
              Preferências
            </h2>
            <p className="mt-1 text-sm text-[var(--cor-mutado)]">
              Personalize as preferências de layout e tema do seu painel.
            </p>
          </div>
          <button
            ref={botaoFecharRef}
            type="button"
            aria-label="Fechar preferências"
            onClick={aoFechar}
            className={`grid size-9 shrink-0 place-items-center rounded-full text-[var(--cor-mutado)] transition-colors hover:bg-[var(--cor-fundo)] hover:text-[var(--cor-texto)] ${foco}`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Corpo com controles */}
        <div className="mt-5 flex flex-col gap-5 text-sm">
          {/* Preset de tema */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-[var(--cor-mutado)] uppercase">
              Preset de cor
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {PRESETS.map((p) => {
                const ativo = preferencias.presetCor === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPresetCor(p.id)}
                    className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left font-medium transition-colors ${
                      ativo
                        ? 'border-[var(--cor-principal)] bg-[var(--cor-principal)]/10 text-[var(--cor-texto)] font-semibold shadow-xs'
                        : 'border-[var(--cor-linha)] bg-[var(--cor-fundo)] text-[var(--cor-mutado)] hover:border-[var(--cor-principal-clara)] hover:text-[var(--cor-texto)]'
                    } ${foco}`}
                  >
                    <span
                      aria-hidden="true"
                      className="size-3.5 rounded-full shrink-0 ring-1 ring-black/10"
                      style={{ backgroundColor: p.cor }}
                    />
                    <span className="truncate">{p.nome}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Modo do tema (Light, Dark, System) */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-[var(--cor-mutado)] uppercase">
              Modo do tema
            </label>
            <div className="mt-2 flex rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-fundo)] p-1">
              {(
                [
                  { id: 'claro', rotulo: 'Claro' },
                  { id: 'escuro', rotulo: 'Escuro' },
                  { id: 'sistema', rotulo: 'Sistema' },
                ] as const
              ).map((m) => {
                const ativo = preferencias.modoTema === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModoTema(m.id as ModoTema)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                      ativo
                        ? 'bg-[var(--cor-card)] text-[var(--cor-texto)] shadow-xs ring-1 ring-[var(--cor-linha)]'
                        : 'text-[var(--cor-mutado)] hover:text-[var(--cor-texto)]'
                    } ${foco}`}
                  >
                    {m.rotulo}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Layout da página (Centralizado / Largura total) */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-[var(--cor-mutado)] uppercase">
              Layout da página
            </label>
            <div className="mt-2 flex rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-fundo)] p-1">
              {(
                [
                  { id: 'centralizado', rotulo: 'Centralizado' },
                  { id: 'largura-total', rotulo: 'Largura total' },
                ] as const
              ).map((l) => {
                const ativo = preferencias.layoutLargura === l.id
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLayoutLargura(l.id as LayoutLargura)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                      ativo
                        ? 'bg-[var(--cor-card)] text-[var(--cor-texto)] shadow-xs ring-1 ring-[var(--cor-linha)]'
                        : 'text-[var(--cor-mutado)] hover:text-[var(--cor-texto)]'
                    } ${foco}`}
                  >
                    {l.rotulo}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Comportamento da barra de navegação (Fixa / Rolar) */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-[var(--cor-mutado)] uppercase">
              Comportamento da barra
            </label>
            <div className="mt-2 flex rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-fundo)] p-1">
              {[
                { valor: true, rotulo: 'Fixa (Sticky)' },
                { valor: false, rotulo: 'Rolar com página' },
              ].map((b) => {
                const ativo = preferencias.barraFixa === b.valor
                return (
                  <button
                    key={String(b.valor)}
                    type="button"
                    onClick={() => setBarraFixa(b.valor)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                      ativo
                        ? 'bg-[var(--cor-card)] text-[var(--cor-texto)] shadow-xs ring-1 ring-[var(--cor-linha)]'
                        : 'text-[var(--cor-mutado)] hover:text-[var(--cor-texto)]'
                    } ${foco}`}
                  >
                    {b.rotulo}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Rodapé com botão Restaurar Padrões */}
        <div className="mt-6 pt-4 border-t border-[var(--cor-linha)] flex justify-end">
          <button
            type="button"
            onClick={restaurarPadroes}
            className={`rounded-xl px-4 py-2 text-xs font-semibold text-[var(--cor-mutado)] transition-colors hover:bg-[var(--cor-fundo)] hover:text-[var(--cor-texto)] ${foco}`}
          >
            Restaurar padrões
          </button>
        </div>
      </div>
    </div>
  )
}
