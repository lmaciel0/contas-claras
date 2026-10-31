import type { MesAno } from '../../formato/mes'

/** Último dia do mês (28 a 31); `mes` de 1 a 12. Calcula em UTC para o fuso do navegador não interferir. */
export function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate()
}

const doisDigitos = (n: number) => String(n).padStart(2, '0')

/**
 * Vencimento sugerido (`yyyy-MM-dd`) para o dia de vencimento do item: dia 31 em mês curto vira o último dia
 * (fev/2026 → 28, fev/2028 → 29). Item sem dia (`null`) não sugere data (`''`).
 */
export function vencimentoPadrao(ano: number, mes: number, dia: number | null): string {
  if (dia === null) {
    return ''
  }
  const valido = Math.min(dia, ultimoDiaDoMes(ano, mes))
  return `${ano}-${doisDigitos(mes)}-${doisDigitos(valido)}`
}

/** `"2026-02-28"` vira `28/02/2026` (lê a string, sem `Date`). */
export function isoParaBr(dataIso: string): string {
  const [ano = '', mes = '', dia = ''] = dataIso.split('-')
  return `${dia}/${mes}/${ano}`
}

/** `quantidade` meses seguidos a partir de `inicio` deslocado em `deslocamento` meses (pode ser negativo). */
export function mesesEntre(inicio: MesAno, quantidade: number, deslocamento = 0): MesAno[] {
  const base = inicio.ano * 12 + (inicio.mes - 1) + deslocamento
  return Array.from({ length: quantidade }, (_, i) => {
    const total = base + i
    return { ano: Math.floor(total / 12), mes: (total % 12) + 1 }
  })
}

/** Chave de `<option>` para um mês: `"2026-10"`. */
export function chaveMes({ ano, mes }: MesAno): string {
  return `${ano}-${doisDigitos(mes)}`
}

/** Inverso de `chaveMes`; `null` se o texto não tiver o formato. */
export function lerChaveMes(chave: string): MesAno | null {
  const partes = /^(\d{4})-(\d{2})$/.exec(chave)
  return partes === null ? null : { ano: Number(partes[1]), mes: Number(partes[2]) }
}

/** Lê o "dia de vencimento" digitado: vazio vale `null`; fora de 1 a 31 ou não inteiro devolve `undefined`. */
export function lerDia(texto: string): number | null | undefined {
  const limpo = texto.trim()
  if (limpo === '') {
    return null
  }
  if (!/^\d{1,2}$/.test(limpo)) {
    return undefined
  }
  const dia = Number(limpo)
  return dia >= 1 && dia <= 31 ? dia : undefined
}
