import { useCallback, useEffect, useState } from 'react'
import { aplicarTema, gravarTema, lerTemaSalvo, TEMA_PADRAO, type Tema } from './tema'

/**
 * Tema da interface. A escolha salva vence; sem escolha, o padrão é o claro (o sistema operacional não conta).
 * Aplica o resultado em `<html data-tema>` (o que o CSS lê) e na cor da barra do navegador.
 */
export function useTema(): { tema: Tema; alternar: () => void } {
  const [escolha, setEscolha] = useState<Tema | null>(lerTemaSalvo)
  const tema = escolha ?? TEMA_PADRAO

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
