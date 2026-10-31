import { useId } from 'react'
import type { InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'> & { rotulo: string }

/** Campo com rótulo visível ligado ao input (clicar no rótulo foca o campo; leitores de tela leem o nome). */
export function CampoTexto({ rotulo, ...resto }: Props) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {rotulo}
      </label>
      <input
        id={id}
        {...resto}
        className="min-h-11 rounded-xl border border-[var(--cor-linha)] bg-white px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--cor-principal)]"
      />
    </div>
  )
}

/** Mensagem de erro de formulário; `role="alert"` faz o leitor de tela anunciá-la ao aparecer. */
export function MensagemDeErro({ texto }: { texto: string | null }) {
  if (texto === null) {
    return null
  }
  return (
    <p role="alert" className="m-0 rounded-xl border border-[var(--cor-negativo)] bg-[#fdecec] px-3 py-2 text-sm text-[var(--cor-texto)]">
      {texto}
    </p>
  )
}

export const classeBotaoPrimario =
  'min-h-11 rounded-full bg-[var(--cor-principal)] px-5 text-base font-semibold text-white ' +
  'disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]'
