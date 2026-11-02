export interface ItemCor {
  id: string
  hex: string
  nome: string
}

export const COR_PADRAO = '#7d7a99'

export const CORES_CATEGORIA: ItemCor[] = [
  { id: 'azul', hex: '#3b82f6', nome: 'Azul' },
  { id: 'ciano', hex: '#06b6d4', nome: 'Ciano' },
  { id: 'verde', hex: '#10b981', nome: 'Verde' },
  { id: 'oliva', hex: '#84cc16', nome: 'Oliva' },
  { id: 'amarelo', hex: '#f59e0b', nome: 'Amarelo' },
  { id: 'laranja', hex: '#f97316', nome: 'Laranja' },
  { id: 'vermelho', hex: '#ef4444', nome: 'Vermelho' },
  { id: 'roxo', hex: '#a855f7', nome: 'Roxo' },
  { id: 'cinza', hex: '#64748b', nome: 'Cinza' },
]

const PADRAO_HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export function obterCorValida(cor?: string): string {
  if (!cor) return COR_PADRAO
  const corLimpa = cor.trim()
  if (PADRAO_HEX.test(corLimpa)) {
    return corLimpa
  }
  const encontrada = CORES_CATEGORIA.find((c) => c.id === corLimpa)
  return encontrada ? encontrada.hex : COR_PADRAO
}
