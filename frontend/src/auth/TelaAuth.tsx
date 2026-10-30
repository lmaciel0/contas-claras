import type { ReactNode } from 'react'
import { AvisoServidor } from '../layout/AvisoServidor'

/** Marca no topo das telas sem moldura (mesma pílula do app: bolinha índigo com "C" + nome). */
function Marca() {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white py-1.5 pr-4 pl-1.5 font-bold text-[var(--cor-texto)] shadow-sm">
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-full bg-[var(--cor-principal)] font-extrabold text-white"
      >
        C
      </span>
      <span>Contas Claras</span>
    </div>
  )
}

/** Fundo da página + logo + card branco centralizado (login e cadastro). */
export function TelaAuth({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--cor-fundo)]">
      <AvisoServidor />
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-4 py-8">
        <Marca />
        <section className="card w-full p-6 shadow-sm sm:p-8">
          <h1 className="m-0 mb-5 text-center text-xl font-bold">{titulo}</h1>
          {children}
        </section>
      </main>
    </div>
  )
}

/** Tela enquanto a sessão é conferida (na primeira visita pode demorar se a API estiver acordando). */
export function TelaCarregando() {
  return (
    <div className="min-h-dvh bg-[var(--cor-fundo)]">
      <AvisoServidor />
      <p role="status" className="m-0 grid min-h-dvh place-items-center text-sm">
        Carregando…
      </p>
    </div>
  )
}
