import { useContext } from 'react'
import { PreferenciasContext, type PreferenciasContextValor } from './PreferenciasContext'
import { PREFERENCIAS_PADRAO } from './preferenciasStorage'

const VALOR_FALLBACK: PreferenciasContextValor = {
  preferencias: PREFERENCIAS_PADRAO,
  setModoTema: () => {},
  setPresetCor: () => {},
  setLayoutLargura: () => {},
  setBarraFixa: () => {},
  setDockRecolhida: () => {},
  restaurarPadroes: () => {},
}

export function usePreferencias(): PreferenciasContextValor {
  const contexto = useContext(PreferenciasContext)
  return contexto ?? VALOR_FALLBACK
}
