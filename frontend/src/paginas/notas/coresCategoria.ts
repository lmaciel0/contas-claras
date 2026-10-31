/** Chaves da paleta fixa de categorias; o backend (`CorCategoriaNota`) aceita exatamente estas. */
export const CORES_CATEGORIA_NOTA: readonly string[] = [
  'vermelho',
  'laranja',
  'amarelo',
  'verde',
  'azul',
  'roxo',
  'rosa',
  'cinza',
]

/** Token de cor da categoria; sem categoria ou com chave desconhecida, o cinza mutado do tema. */
export function corDaCategoria(cor: string | null): string {
  return cor !== null && CORES_CATEGORIA_NOTA.includes(cor) ? `var(--cor-nota-${cor})` : 'var(--cor-mutado)'
}
