const base = { viewBox: '0 0 24 24', width: 18, height: 18, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

/** Alfinete; cheio quando a nota está fixada. */
export function IconeAlfinete({ cheio }: { cheio: boolean }) {
  return (
    <svg {...base} fill={cheio ? 'currentColor' : 'none'} stroke="currentColor">
      <path d="M12 17v5M9 3h6l-1 6 3 3H7l3-3-1-6z" />
    </svg>
  )
}

export function IconeLapis() {
  return (
    <svg {...base} width={16} height={16} fill="none" stroke="currentColor">
      <path d="M17 3a2.83 2.83 0 014 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  )
}
