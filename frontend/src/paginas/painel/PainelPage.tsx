import { useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { FinancasDoMes } from './FinancasDoMes'
import { dataPorExtenso, primeiroNome, saudacao } from './saudacao'

/** Tela inicial (`/`): saudação com o primeiro nome, a data por extenso e as finanças do mês atual. */
export function PainelPage() {
  const { usuario } = useAuth()
  // Fixa a hora da primeira renderização: a saudação não muda sozinha no meio do uso.
  const [agora] = useState(() => new Date())
  const nome = primeiroNome(usuario?.nome)

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
        <p className="m-0 mt-1.5 text-[13px] text-[var(--cor-mutado)]">
          {dataPorExtenso(agora)}
        </p>
      </header>
      <FinancasDoMes />
    </div>
  )
}
