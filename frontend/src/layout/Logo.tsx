import { Link } from 'react-router'

/** Marca do app: "A" num círculo e o nome. Leva ao Início. */
export function Logo() {
  return (
    <Link
      to="/"
      className="flex shrink-0 items-center gap-2.5 rounded-full py-1 pr-3 pl-1 font-bold whitespace-nowrap text-[var(--cor-texto)] no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
    >
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-full bg-[var(--cor-principal)] font-extrabold text-[var(--cor-sobre-principal)]"
      >
        A
      </span>
      <span>Aprumo</span>
    </Link>
  )
}
