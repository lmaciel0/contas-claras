import { useCallback, useEffect, useState } from 'react'
import { aplicarTema, CONSULTA_ESCURO, gravarTema, lerTemaSalvo, temaDoSistema, type Tema } from './tema'

/**
 * Tema da interface. A escolha salva vence o sistema; sem escolha, acompanha o sistema em tempo real.
 * Aplica o resultado em `<html data-tema>` (o que o CSS lê) e na cor da barra do navegador.
 */
export function useTema(): { tema: Tema; alternar: () => void } {
  const [escolha, setEscolha] = useState<Tema | null>(lerTemaSalvo)
  const [sistema, setSistema] = useState<Tema>(temaDoSistema)
  const tema = escolha ?? sistema

  useEffect(() => {
    if (escolha !== null || typeof window.matchMedia !== 'function') return
    const consulta = window.matchMedia(CONSULTA_ESCURO)
    const aoMudar = (evento: MediaQueryListEvent) => setSistema(evento.matches ? 'escuro' : 'claro')
    consulta.addEventListener('change', aoMudar)
    return () => consulta.removeEventListener('change', aoMudar)
  }, [escolha])

  useEffect(() => {
    aplicarTema(tema)
  }, [tema])

  const alternar = useCallback(() => {
    const proximo: Tema = tema === 'escuro' ? 'claro' : 'escuro'
    gravarTema(proximo)
    setEscolha(proximo)
  }, [tema])

  return { tema, alternar }
}
