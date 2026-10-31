const FUSO = 'America/Sao_Paulo'

const formatadorHora = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: 'numeric', hourCycle: 'h23' })

const formatadorData = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

/** Saudação pela hora em São Paulo: 5h às 11h59 bom dia, 12h às 17h59 boa tarde, o resto boa noite. */
export function saudacao(data: Date): 'Bom dia' | 'Boa tarde' | 'Boa noite' {
  const hora = Number(formatadorHora.formatToParts(data).find((parte) => parte.type === 'hour')?.value)
  if (hora >= 5 && hora < 12) {
    return 'Bom dia'
  }
  return hora >= 12 && hora < 18 ? 'Boa tarde' : 'Boa noite'
}

/** Data como `sábado, 31 de outubro`, no dia de São Paulo. */
export function dataPorExtenso(data: Date): string {
  return formatadorData.format(data)
}

/** Primeira palavra do nome; `null` quando o nome está ausente ou só tem espaços. */
export function primeiroNome(nome: string | undefined): string | null {
  const palavra = nome?.trim().split(/\s+/)[0]
  return palavra ? palavra : null
}
