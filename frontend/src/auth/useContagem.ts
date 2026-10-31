import { useEffect, useState } from 'react'

const SEGUNDOS = 60

/**
 * Contagem regressiva de 60 s até 0 (espera do "Reenviar"; a API também recusa reenvio dentro desse prazo). Começa ao
 * montar. Mede pelo relógio, não por quantos ticks passaram: aba em segundo plano atrasa os timers, e a contagem
 * continua certa quando a pessoa volta.
 */
export function useContagem(): { restante: number; reiniciar: () => void } {
  const [fim, setFim] = useState(() => Date.now() + SEGUNDOS * 1000)
  const [agora, setAgora] = useState(() => Date.now())
  const acabou = agora >= fim

  useEffect(() => {
    if (acabou) {
      return
    }
    const intervalo = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(intervalo)
  }, [fim, acabou])

  return {
    restante: Math.max(0, Math.ceil((fim - agora) / 1000)),
    reiniciar: () => {
      const inicio = Date.now()
      setFim(inicio + SEGUNDOS * 1000)
      setAgora(inicio)
    },
  }
}
