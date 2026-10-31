import { createContext, useContext } from 'react'

/** Minúsculas e sem acentos, para comparar o que a pessoa digita com os rótulos do menu. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

export interface PaletaControle {
  abrir: () => void
}

/** Sem `AppShell` por perto (testes de página isolada) o botão existe, mas não faz nada. */
export const PaletaContext = createContext<PaletaControle>({
  abrir: () => undefined,
})

/** Controle da paleta "Ir para…" (Ctrl K), provido pelo `AppShell`. */
export function usePaleta(): PaletaControle {
  return useContext(PaletaContext)
}
