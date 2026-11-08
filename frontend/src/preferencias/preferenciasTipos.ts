export type ModoTema = 'claro' | 'escuro' | 'sistema'
export type PresetCor = 'azul' | 'lima' | 'esmeralda' | 'indigo'
export type LayoutLargura = 'centralizado' | 'largura-total'

export type IdAtalhoMobile =
  | 'novo-lancamento'
  | 'nova-receita'
  | 'nova-tarefa'
  | 'nova-nota'
  | 'cartoes'
  | 'orcamento'
  | 'projetos'
  | 'relatorios'
  | 'categorias'
  | 'visao-geral'

export interface PreferenciasUsuario {
  modoTema: ModoTema
  presetCor: PresetCor
  layoutLargura: LayoutLargura
  barraFixa: boolean
  dockRecolhida: boolean
  atalhosMobile: IdAtalhoMobile[]
}
