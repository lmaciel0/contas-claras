import { useEffect, useRef } from 'react'

export const CHAVE_ULTIMA_ATIVIDADE = 'aprumo-ultima-atividade'
export const TIMEOUT_INATIVIDADE_PADRAO_MS = 30 * 60 * 1000 // 30 minutos
const THROTTLE_ATIVIDADE_MS = 5_000 // Atualiza no maximo a cada 5s
const INTERVALO_CHECAGEM_MS = 15_000 // Verifica a cada 15s

interface OpcoesTimeoutInatividade {
  ativo: boolean
  timeoutMs?: number
  aoExpirar: () => void
}

export function useTimeoutInatividade({
  ativo,
  timeoutMs = TIMEOUT_INATIVIDADE_PADRAO_MS,
  aoExpirar,
}: OpcoesTimeoutInatividade) {
  const aoExpirarRef = useRef(aoExpirar)
  aoExpirarRef.current = aoExpirar

  const ultimaGravacaoRef = useRef<number>(0)
  const expirouRef = useRef(false)
  const estavaAtivoRef = useRef(false)

  useEffect(() => {
    if (!ativo) {
      expirouRef.current = false
      // Logout: descarta o timestamp para o próximo login não herdar atividade antiga.
      if (estavaAtivoRef.current) {
        estavaAtivoRef.current = false
        try {
          localStorage.removeItem(CHAVE_ULTIMA_ATIVIDADE)
        } catch {
          // localStorage indisponivel
        }
      }
      return
    }
    estavaAtivoRef.current = true

    expirouRef.current = false
    const agora = Date.now()
    const salvo = Number(localStorage.getItem(CHAVE_ULTIMA_ATIVIDADE))
    const timestampInicial = Number.isFinite(salvo) && salvo > 0 ? salvo : agora
    try {
      localStorage.setItem(CHAVE_ULTIMA_ATIVIDADE, String(timestampInicial))
    } catch {
      // localStorage indisponivel (quota/modo privado restrito)
    }
    ultimaGravacaoRef.current = agora

    const registrarAtividade = () => {
      if (expirouRef.current) {
        return
      }
      const atual = Date.now()
      if (atual - ultimaGravacaoRef.current >= THROTTLE_ATIVIDADE_MS) {
        ultimaGravacaoRef.current = atual
        try {
          localStorage.setItem(CHAVE_ULTIMA_ATIVIDADE, String(atual))
        } catch {
          // localStorage indisponivel (quota/modo privado restrito)
        }
      }
    }

    const conferirExpiracao = () => {
      if (expirouRef.current) {
        return
      }
      const atual = Date.now()
      const gravado = Number(localStorage.getItem(CHAVE_ULTIMA_ATIVIDADE))
      const referencia = Number.isFinite(gravado) && gravado > 0 ? gravado : ultimaGravacaoRef.current

      if (atual - referencia >= timeoutMs) {
        expirouRef.current = true
        try {
          localStorage.removeItem(CHAVE_ULTIMA_ATIVIDADE)
        } catch {
          // ignore
        }
        aoExpirarRef.current()
      }
    }

    // Conferir expiracao imediata ao montar
    conferirExpiracao()

    // Eventos de interacao do usuario
    const eventos = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const
    eventos.forEach((evt) => window.addEventListener(evt, registrarAtividade, { passive: true }))

    // Retomada de foco / suspensao do computador
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === 'visible') {
        conferirExpiracao()
      }
    }
    document.addEventListener('visibilitychange', aoMudarVisibilidade)
    window.addEventListener('focus', conferirExpiracao)

    // Sincronizacao entre abas (storage event)
    const aoMudarStorage = (e: StorageEvent) => {
      if (e.key === CHAVE_ULTIMA_ATIVIDADE && e.newValue) {
        const val = Number(e.newValue)
        if (Number.isFinite(val) && val > 0) {
          ultimaGravacaoRef.current = val
        }
      }
    }
    window.addEventListener('storage', aoMudarStorage)

    // Checagem periodica
    const temporizador = setInterval(conferirExpiracao, INTERVALO_CHECAGEM_MS)

    return () => {
      eventos.forEach((evt) => window.removeEventListener(evt, registrarAtividade))
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
      window.removeEventListener('focus', conferirExpiracao)
      window.removeEventListener('storage', aoMudarStorage)
      clearInterval(temporizador)
    }
  }, [ativo, timeoutMs])
}
