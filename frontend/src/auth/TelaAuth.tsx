import type { ReactNode } from 'react'
import { AvisoServidor } from '../layout/AvisoServidor'

/**
 * Conteúdo de uma tela de auth: o título e o formulário. O fundo, a marca, o card e o Google são do `LayoutAuth`
 * (rota-layout), que também anima a troca de tela.
 */
export function TelaAuth({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <>
      <h1>{titulo}</h1>
      {children}
    </>
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
