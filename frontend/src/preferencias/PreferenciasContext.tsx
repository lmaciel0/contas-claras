import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  lerPreferenciasSalvas,
  gravarPreferencias,
  PREFERENCIAS_PADRAO,
} from './preferenciasStorage'
import type {
  PreferenciasUsuario,
  ModoTema,
  PresetCor,
  LayoutLargura,
  IdAtalhoMobile,
} from './preferenciasTipos'
import { aplicarTema } from '../tema/tema'

export interface PreferenciasContextValor {
  preferencias: PreferenciasUsuario
  setModoTema: (modo: ModoTema) => void
  setPresetCor: (preset: PresetCor) => void
  setLayoutLargura: (largura: LayoutLargura) => void
  setBarraFixa: (fixa: boolean) => void
  setDockRecolhida: (recolhida: boolean | ((antiga: boolean) => boolean)) => void
  setAtalhosMobile: (atalhos: IdAtalhoMobile[]) => void
  restaurarPadroes: () => void
}

export const PreferenciasContext = createContext<PreferenciasContextValor | null>(null)

export function PreferenciasProvider({ children }: { children: ReactNode }) {
  const [preferencias, setPreferencias] = useState<PreferenciasUsuario>(() => lerPreferenciasSalvas())

  // Sincroniza tema real e escuta tema do sistema quando modo === 'sistema'
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      const temaEfetivo = preferencias.modoTema === 'sistema' ? 'claro' : preferencias.modoTema
      aplicarTema(temaEfetivo)
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const aplicar = () => {
      let temaEfetivo: 'claro' | 'escuro' = 'claro'
      if (preferencias.modoTema === 'sistema') {
        temaEfetivo = mediaQuery.matches ? 'escuro' : 'claro'
      } else {
        temaEfetivo = preferencias.modoTema
      }
      aplicarTema(temaEfetivo)
    }

    aplicar()
    mediaQuery.addEventListener?.('change', aplicar)
    return () => mediaQuery.removeEventListener?.('change', aplicar)
  }, [preferencias.modoTema])

  // Sincroniza preset de cor no html
  useEffect(() => {
    document.documentElement.dataset.preset = preferencias.presetCor
  }, [preferencias.presetCor])

  // Persiste no localStorage
  useEffect(() => {
    gravarPreferencias(preferencias)
  }, [preferencias])

  const setModoTema = useCallback((modoTema: ModoTema) => {
    setPreferencias((p) => ({ ...p, modoTema }))
  }, [])

  const setPresetCor = useCallback((presetCor: PresetCor) => {
    setPreferencias((p) => ({ ...p, presetCor }))
  }, [])

  const setLayoutLargura = useCallback((layoutLargura: LayoutLargura) => {
    setPreferencias((p) => ({ ...p, layoutLargura }))
  }, [])

  const setBarraFixa = useCallback((barraFixa: boolean) => {
    setPreferencias((p) => ({ ...p, barraFixa }))
  }, [])

  const setDockRecolhida = useCallback((recolhida: boolean | ((antiga: boolean) => boolean)) => {
    setPreferencias((p) => ({
      ...p,
      dockRecolhida: typeof recolhida === 'function' ? recolhida(p.dockRecolhida) : recolhida,
    }))
  }, [])

  const setAtalhosMobile = useCallback((atalhosMobile: IdAtalhoMobile[]) => {
    setPreferencias((p) => ({ ...p, atalhosMobile }))
  }, [])

  const restaurarPadroes = useCallback(() => {
    setPreferencias(PREFERENCIAS_PADRAO)
  }, [])

  const valor = useMemo<PreferenciasContextValor>(
    () => ({
      preferencias,
      setModoTema,
      setPresetCor,
      setLayoutLargura,
      setBarraFixa,
      setDockRecolhida,
      setAtalhosMobile,
      restaurarPadroes,
    }),
    [preferencias, setModoTema, setPresetCor, setLayoutLargura, setBarraFixa, setDockRecolhida, setAtalhosMobile, restaurarPadroes]
  )

  return <PreferenciasContext.Provider value={valor}>{children}</PreferenciasContext.Provider>
}
