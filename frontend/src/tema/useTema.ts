import { useCallback, useState } from 'react'
import { usePreferencias } from '../preferencias/usePreferencias'
import { aplicarTema, gravarTema, lerTemaSalvo, TEMA_PADRAO, type Tema } from './tema'

/** Tema em vigor agora: o que já está em `<html data-tema>` (definido por `tema-init.js` e pelas preferências); sem isso, a escolha salva ou o padrão. */
function lerTemaEmVigor(): Tema {
  const aplicado = document.documentElement.dataset.tema
  if (aplicado === 'claro' || aplicado === 'escuro') {
    return aplicado
  }
  return lerTemaSalvo() ?? TEMA_PADRAO
}

/**
 * Tema do switch sol/lua. Só lê o tema que já vale: montar o hook (abrir o menu do perfil) não aplica nem grava nada.
 * Só `alternar` muda o tema: aplica em `<html data-tema>` e na cor da barra, grava em `aprumo-tema` e avisa as
 * preferências, para que elas não desfaçam a troca depois.
 */
export function useTema(): { tema: Tema; alternar: () => void } {
  const { setModoTema } = usePreferencias()
  const [tema, setTema] = useState<Tema>(lerTemaEmVigor)

  const alternar = useCallback(() => {
    const proximo: Tema = tema === 'escuro' ? 'claro' : 'escuro'
    gravarTema(proximo)
    aplicarTema(proximo)
    setModoTema(proximo)
    setTema(proximo)
  }, [tema, setModoTema])

  return { tema, alternar }
}
