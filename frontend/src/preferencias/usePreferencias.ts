import { useContext } from 'react'
import { PreferenciasContext, type PreferenciasContextValor } from './PreferenciasContext'

export function usePreferencias(): PreferenciasContextValor {
  const contexto = useContext(PreferenciasContext)
  if (!contexto) {
    throw new Error('usePreferencias deve ser usado dentro de um PreferenciasProvider')
  }
  return contexto
}
