interface CarregandoProps {
  /** Texto visível e para leitores de tela. Opcional (padrão 'Carregando…'). */
  texto?: string
  /** Classes CSS extras para o contêiner. */
  className?: string
}

/**
 * Componente de carregamento com dot-spinner pulsante (8 pontos).
 * Usa --cor-principal do tema e respeita prefers-reduced-motion.
 */
export function Carregando({ texto = 'Carregando…', className = '' }: CarregandoProps) {
  return (
    <div role="status" className={`flex flex-col items-center justify-center gap-3 py-6 ${className}`}>
      <div className="dot-spinner" aria-hidden="true">
        <div className="dot-spinner__dot" />
        <div className="dot-spinner__dot" />
        <div className="dot-spinner__dot" />
        <div className="dot-spinner__dot" />
        <div className="dot-spinner__dot" />
        <div className="dot-spinner__dot" />
        <div className="dot-spinner__dot" />
        <div className="dot-spinner__dot" />
      </div>
      {texto && <span className="text-sm text-[var(--cor-mutado)]">{texto}</span>}
    </div>
  )
}
