import { vi } from 'vitest'

export interface ConfiguracaoGoogle {
  client_id: string
  callback: (resposta: { credential: string }) => void
}

/** Biblioteca do Google já "carregada": o componente a usa sem baixar o script (nada de rede nos testes). */
export function instalarGoogleFalso() {
  const inicializar = vi.fn<(configuracao: ConfiguracaoGoogle) => void>()
  const desenharBotao = vi.fn<(elemento: HTMLElement, opcoes: object) => void>()
  Object.defineProperty(window, 'google', {
    configurable: true,
    value: { accounts: { id: { initialize: inicializar, renderButton: desenharBotao } } },
  })
  return { inicializar, desenharBotao }
}

/** Desfaz `instalarGoogleFalso` e qualquer `<script>` do Google deixado na página. */
export function removerGoogleFalso() {
  Reflect.deleteProperty(window, 'google')
  document.querySelectorAll('script[src*="accounts.google.com"]').forEach((script) => script.remove())
}
