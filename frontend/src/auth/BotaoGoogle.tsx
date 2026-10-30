import { useEffect, useRef } from 'react'
import { mensagemDoErro } from './mensagemDoErro'
import { useAuth } from './useAuth'

const URL_DO_SCRIPT = 'https://accounts.google.com/gsi/client'

/** Carrega o script do Google uma única vez; se a biblioteca já está na página, não baixa nada. */
function carregarScript(): Promise<void> {
  if (window.google?.accounts.id) {
    return Promise.resolve()
  }
  return new Promise((resolver, rejeitar) => {
    const existente = document.querySelector<HTMLScriptElement>(`script[src="${URL_DO_SCRIPT}"]`)
    const script = existente ?? document.createElement('script')
    script.addEventListener('load', () => resolver(), { once: true })
    script.addEventListener(
      'error',
      () => {
        script.remove() // permite nova tentativa na próxima visita à tela
        rejeitar(new Error('Falha ao carregar o script do Google.'))
      },
      { once: true },
    )
    if (!existente) {
      script.src = URL_DO_SCRIPT
      script.async = true
      document.head.append(script)
    }
  })
}

/**
 * "Continuar com Google" (Google Identity Services). O Google devolve um `credential` (ID token) ao callback,
 * que o envia à API em `entrarComGoogle`. Sem `VITE_GOOGLE_CLIENT_ID` não renderiza nada nem baixa o script.
 */
export function BotaoGoogle({ aoErro }: { aoErro: (mensagem: string) => void }) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const { entrarComGoogle } = useAuth()
  const alvo = useRef<HTMLDivElement>(null)

  // O Google guarda o callback do `initialize`; ele chama sempre a versão mais nova destas funções.
  const aoReceberCredential = useRef<(credential: string) => void>(() => undefined)
  const aoFalhar = useRef(aoErro)
  useEffect(() => {
    aoFalhar.current = aoErro
    aoReceberCredential.current = (credential) => {
      entrarComGoogle(credential).catch((erro: unknown) => aoErro(mensagemDoErro(erro)))
    }
  })

  useEffect(() => {
    if (!clientId) {
      return
    }
    let ativo = true
    carregarScript()
      .then(() => {
        const google = window.google?.accounts.id
        if (!ativo || !alvo.current || !google) {
          return
        }
        google.initialize({
          client_id: clientId,
          callback: ({ credential }) => aoReceberCredential.current(credential),
        })
        google.renderButton(alvo.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          locale: 'pt-BR',
        })
      })
      .catch(() => {
        if (ativo) aoFalhar.current('Não foi possível carregar o login com Google.')
      })
    return () => {
      ativo = false
    }
  }, [clientId])

  if (!clientId) {
    return null
  }
  return <div ref={alvo} data-testid="botao-google" className="flex min-h-11 justify-center" />
}
