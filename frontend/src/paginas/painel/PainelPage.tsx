import { useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { usePaleta } from '../../layout/paleta'
import { CardReflexao } from './CardReflexao'
import { FinancasDoMes } from './FinancasDoMes'
import { TarefasDeHoje } from './TarefasDeHoje'
import { dataPorExtenso, primeiroNome, saudacao } from './saudacao'

/** Tela inicial (`/`): saudação com o primeiro nome, a data por extenso, a reflexão do dia, as tarefas de hoje e as finanças do mês atual. */
export function PainelPage() {
  const { usuario } = useAuth()
  // Fixa a hora da primeira renderização: a saudação não muda sozinha no meio do uso.
  const [agora] = useState(() => new Date())
  const nome = primeiroNome(usuario?.nome)
  const { abrir } = usePaleta()

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="m-0 text-[28px] leading-tight font-extrabold tracking-tight md:text-[34px]">
          {saudacao(agora)}
          {nome !== null && (
            <>
              , <span className="text-[var(--cor-principal)]">{nome}</span>
            </>
          )}
        </h1>
        <p className="m-0 mt-1.5 text-[13px] text-[var(--cor-mutado)]">{dataPorExtenso(agora)}</p>
      </header>
      <button
        type="button"
        onClick={abrir}
        aria-keyshortcuts="Control+K Meta+K"
        className="flex min-h-11 w-full max-w-sm cursor-pointer items-center justify-between gap-3 rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-card)] px-3.5 text-left text-sm text-[var(--cor-texto)] hover:border-[var(--cor-principal)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
      >
        <span>Ir para…</span>
        <kbd
          aria-hidden="true"
          className="hidden rounded-md bg-[var(--cor-fundo)] px-1.5 py-0.5 font-sans text-[11px] text-[var(--cor-texto)] sm:inline"
        >
          Ctrl K
        </kbd>
      </button>
      <div className="item-entra" style={{ '--i': 1 } as React.CSSProperties}>
        <CardReflexao />
      </div>
      <div className="item-entra" style={{ '--i': 2 } as React.CSSProperties}>
        <TarefasDeHoje />
      </div>
      <div className="item-entra" style={{ '--i': 3 } as React.CSSProperties}>
        <FinancasDoMes />
      </div>
    </div>
  )
}
