const formatadorBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** Formata valor da API (string decimal) ou número como `R$ 1.234,56`; negativo sai `-R$ 6,20`. */
export function formatarMoeda(valor: string | number): string {
  return formatadorBRL.format(typeof valor === 'string' ? Number(valor) : valor)
}

// Aceita "1.234,56", "1234,56", "251,3", "10", "10.50"; recusa mais de 2 casas.
// O primeiro grupo do milhar não começa com 0: "0.500" não é 500, cai na regra do ponto decimal e é recusado.
const COM_MILHAR_E_VIRGULA = /^[1-9]\d{0,2}(\.\d{3})*(,\d{1,2})?$/
const SO_DIGITOS_COM_VIRGULA = /^\d+(,\d{1,2})?$/
const SO_DIGITOS_COM_PONTO = /^\d+(\.\d{1,2})?$/

/**
 * Converte o que a pessoa digitou numa string decimal com ponto e 2 casas (`"1234.56"`).
 * Devolve `null` se não for número, tiver mais de 2 casas ou for menor ou igual a zero.
 */
export function lerValor(texto: string): string | null {
  const limpo = texto.trim().replace(/^R\$\s*/, '')
  let normalizado: string
  if (COM_MILHAR_E_VIRGULA.test(limpo) || SO_DIGITOS_COM_VIRGULA.test(limpo)) {
    normalizado = limpo.replace(/\./g, '').replace(',', '.')
  } else if (SO_DIGITOS_COM_PONTO.test(limpo)) {
    normalizado = limpo
  } else {
    return null
  }
  const [inteiros = '0', decimais = ''] = normalizado.split('.')
  const centavos = decimais.padEnd(2, '0')
  const inteiro = inteiros.replace(/^0+(?=\d)/, '')
  if (Number(inteiro) === 0 && Number(centavos) === 0) {
    return null
  }
  return `${inteiro}.${centavos}`
}
