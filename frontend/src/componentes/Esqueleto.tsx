import type { HTMLAttributes } from 'react'

export interface EsqueletoProps extends HTMLAttributes<HTMLDivElement> {
  /** Tipo de esqueleto visual. Padrão: 'texto'. */
  variante?: 'texto' | 'circulo' | 'card'
  /** Quantidade de linhas para simular parágrafos/tabelas (válido quando variante === 'texto'). Padrão: 1. */
  linhas?: number
  /** Rótulo acessível para leitores de tela. Padrão: 'Carregando…'. */
  rotuloAcessivel?: string
  /** Classes Tailwind extras. */
  className?: string
}

/**
 * Componente de esqueleto acessível com animação de pulso sutil nas cores do tema.
 * Mantém a estrutura de página durante carregamento sem quebrar leitores de tela nem causar layout shifts.
 * Respeita prefers-reduced-motion: reduce.
 */
export function Esqueleto({
  variante = 'texto',
  linhas = 1,
  rotuloAcessivel = 'Carregando…',
  className = '',
  ...resto
}: EsqueletoProps) {
  const baseClasses = 'esqueleto-shimmer'

  if (variante === 'circulo') {
    return (
      <div
        role="status"
        aria-label={rotuloAcessivel}
        aria-busy="true"
        className={`${baseClasses} shrink-0 rounded-full ${className}`}
        {...resto}
      />
    )
  }

  if (variante === 'card') {
    return (
      <div
        role="status"
        aria-label={rotuloAcessivel}
        aria-busy="true"
        className={`${baseClasses} rounded-2xl ${className}`}
        {...resto}
      />
    )
  }

  if (linhas > 1) {
    return (
      <div
        role="status"
        aria-label={rotuloAcessivel}
        aria-busy="true"
        className={`flex flex-col gap-2.5 ${className}`}
        {...resto}
      >
        {Array.from({ length: linhas }).map((_, i) => (
          <div
            key={i}
            className={`esqueleto-linha ${baseClasses} h-4 rounded-md ${
              i === linhas - 1 ? 'w-3/4' : 'w-full'
            }`}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      role="status"
      aria-label={rotuloAcessivel}
      aria-busy="true"
      className={`esqueleto-linha ${baseClasses} h-4 rounded-md ${className || 'w-full'}`}
      {...resto}
    />
  )
}
