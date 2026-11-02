export type ModoTema = 'claro' | 'escuro' | 'sistema'
export type PresetCor = 'azul' | 'lima' | 'esmeralda' | 'indigo'
export type LayoutLargura = 'centralizado' | 'largura-total'

export interface PreferenciasUsuario {
  modoTema: ModoTema
  presetCor: PresetCor
  layoutLargura: LayoutLargura
  barraFixa: boolean
  dockRecolhida: boolean
}
