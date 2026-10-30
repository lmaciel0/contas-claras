import { useSyncExternalStore } from 'react'
import { aoMudarServidorAcordando, servidorAcordando } from '../api/cliente'

/** Faixa no topo enquanto a API grátis acorda (cold start): evita parecer travado ou com erro. */
export function AvisoServidor() {
  const acordando = useSyncExternalStore(aoMudarServidorAcordando, servidorAcordando)

  return (
    <div aria-live="polite" className="sticky top-0 z-50">
      {acordando && (
        <p
          role="status"
          className="m-0 bg-[var(--cor-principal)] px-4 py-2 text-center text-sm font-medium text-white"
        >
          Acordando o servidor… isso pode levar até 1 minuto
        </p>
      )}
    </div>
  )
}
