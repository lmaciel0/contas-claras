export interface PresetVisualMeta {
  id: string
  nome: string
  descricao: string
  icone: string
  corGradienteInicio: string
  corGradienteFim: string
  fotoPadrao: string
}

export type IdPresetVisual =
  | 'reserva'
  | 'viagem'
  | 'carro'
  | 'casa'
  | 'estudos'
  | 'personalizado'

export const PRESETS_VISUAIS: Record<IdPresetVisual, PresetVisualMeta> = {
  reserva: {
    id: 'reserva',
    nome: 'Reserva de Emergência',
    descricao: 'Segurança e tranquilidade para imprevistos',
    icone: 'shield',
    corGradienteInicio: '#047857', // emerald-700
    corGradienteFim: '#10b981', // emerald-500
    fotoPadrao: '/metas/reserva.jpg',
  },
  viagem: {
    id: 'viagem',
    nome: 'Viagem & Férias',
    descricao: 'Conhecer novos lugares e descansar',
    icone: 'plane',
    corGradienteInicio: '#0284c7', // sky-600
    corGradienteFim: '#38bdf8', // sky-400
    fotoPadrao: '/metas/viagem.jpg',
  },
  carro: {
    id: 'carro',
    nome: 'Carro & Transporte',
    descricao: 'IPVA, manutenção, seguro ou troca',
    icone: 'car',
    corGradienteInicio: '#7c3aed', // violet-600
    corGradienteFim: '#a855f7', // purple-500
    fotoPadrao: '/metas/carro.jpg',
  },
  casa: {
    id: 'casa',
    nome: 'Casa & Reforma',
    descricao: 'IPTU, mobília, decoração ou reforma',
    icone: 'home',
    corGradienteInicio: '#d97706', // amber-600
    corGradienteFim: '#f59e0b', // amber-500
    fotoPadrao: '/metas/casa.jpg',
  },
  estudos: {
    id: 'estudos',
    nome: 'Estudos & Carreira',
    descricao: 'Cursos, livros, equipamentos e especialização',
    icone: 'book',
    corGradienteInicio: '#0f766e', // teal-700
    corGradienteFim: '#14b8a6', // teal-500
    fotoPadrao: '/metas/estudos.jpg',
  },
  personalizado: {
    id: 'personalizado',
    nome: 'Personalizado',
    descricao: 'Seu objetivo com as cores e fotos que escolher',
    icone: 'target',
    corGradienteInicio: '#475569', // slate-600
    corGradienteFim: '#64748b', // slate-500
    fotoPadrao: '',
  },
}

export const LISTA_PRESETS: PresetVisualMeta[] = [
  PRESETS_VISUAIS.reserva,
  PRESETS_VISUAIS.viagem,
  PRESETS_VISUAIS.carro,
  PRESETS_VISUAIS.casa,
  PRESETS_VISUAIS.estudos,
  PRESETS_VISUAIS.personalizado,
]

export function obterPresetVisual(presetId?: string | null): PresetVisualMeta {
  if (!presetId) return PRESETS_VISUAIS.personalizado
  const mapa = PRESETS_VISUAIS as Record<string, PresetVisualMeta | undefined>
  return mapa[presetId] ?? PRESETS_VISUAIS.personalizado
}
