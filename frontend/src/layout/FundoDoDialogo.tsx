interface Props {
  aoClicar: () => void
  testId: string
}

/** Fundo escurecido atrás de um diálogo modal do celular; clicar nele fecha. Aparece com fade (`.menu-fundo`). */
export function FundoDoDialogo({ aoClicar, testId }: Props) {
  return (
    <div
      data-testid={testId}
      aria-hidden="true"
      onClick={aoClicar}
      className="menu-fundo absolute inset-0 bg-[var(--cor-texto)]/50"
    />
  )
}
