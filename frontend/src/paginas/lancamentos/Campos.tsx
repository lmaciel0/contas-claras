import { useId } from 'react'
import type { ReactNode, SelectHTMLAttributes } from 'react'

const foco = 'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--cor-principal)]'

type PropsSelect = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'className'> & { rotulo: string }

/** Lista suspensa com rótulo visível ligado ao `<select>` (mesmo visual de `CampoTexto`). */
export function CampoSelect({ rotulo, children, ...resto }: PropsSelect) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {rotulo}
      </label>
      <select
        id={id}
        {...resto}
        className={`min-h-11 rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-card)] px-3 text-base text-[var(--cor-texto)] disabled:bg-[var(--cor-fundo)] disabled:text-[var(--cor-mutado)] ${foco}`}
      >
        {children}
      </select>
    </div>
  )
}

export interface OpcaoSegmentada<T extends string> {
  valor: T
  rotulo: string
}

interface PropsSegmentado<T extends string> {
  /** Nome do grupo para leitores de tela (não aparece na tela). */
  legenda: string
  nome: string
  opcoes: readonly OpcaoSegmentada<T>[]
  valor: T
  aoMudar: (valor: T) => void
  desabilitado?: boolean
}

/** Duas ou mais opções exclusivas lado a lado (`Despesa | Receita`, `Previsto | Pago`), feitas de radios nativos. */
export function Segmentado<T extends string>({
  legenda,
  nome,
  opcoes,
  valor,
  aoMudar,
  desabilitado = false,
}: PropsSegmentado<T>): ReactNode {
  return (
    <fieldset
      className="m-0 grid gap-1 rounded-2xl border-0 bg-[var(--cor-card)] p-1"
      style={{ gridTemplateColumns: `repeat(${opcoes.length}, minmax(0, 1fr))` }}
    >
      <legend className="sr-only">{legenda}</legend>
      {opcoes.map((opcao) => (
        <label key={opcao.valor} className="relative block">
          <input
            type="radio"
            name={nome}
            value={opcao.valor}
            checked={valor === opcao.valor}
            disabled={desabilitado}
            onChange={() => aoMudar(opcao.valor)}
            className="peer sr-only"
          />
          <span className="block min-h-11 cursor-pointer rounded-xl px-3 py-2.5 text-center text-sm font-medium peer-checked:bg-[var(--cor-principal)] peer-checked:font-semibold peer-checked:text-[var(--cor-sobre-principal)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-[var(--cor-principal)] peer-disabled:cursor-not-allowed peer-disabled:opacity-60">
            {opcao.rotulo}
          </span>
        </label>
      ))}
    </fieldset>
  )
}
