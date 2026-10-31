export interface MesAno {
  ano: number
  mes: number
}

const NOMES_MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const

/** Nome do mês (1 a 12) com inicial maiúscula, como `Outubro`. */
export function nomeMes(mes: number): string {
  return NOMES_MESES[mes - 1] ?? ''
}

/** Rótulo como `Outubro 2026`. */
export function rotuloMes(ano: number, mes: number): string {
  return `${nomeMes(mes)} ${ano}`
}

export function mesAnterior({ ano, mes }: MesAno): MesAno {
  return mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 }
}

export function mesSeguinte({ ano, mes }: MesAno): MesAno {
  return mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 }
}

const formatadorSaoPaulo = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: 'numeric',
})

/** Mês corrente no fuso `America/Sao_Paulo`, independente do fuso do navegador. */
export function mesAtual(agora: Date = new Date()): MesAno {
  const partes = formatadorSaoPaulo.formatToParts(agora)
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value)
  return { ano: valor('year'), mes: valor('month') }
}
