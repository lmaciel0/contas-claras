import { useSearchParams } from 'react-router'
import { mesAnterior, mesAtual, mesSeguinte } from '../formato/mes'

function inteiroEntre(texto: string | null, minimo: number, maximo: number): number | null {
  if (texto === null || !/^\d+$/.test(texto)) {
    return null
  }
  const valor = Number(texto)
  return valor >= minimo && valor <= maximo ? valor : null
}

export interface MesSelecionado {
  ano: number
  mes: number
  /** Query string do mês (`?ano=2026&mes=10`), para montar links que preservam o mês. */
  busca: string
  irPara: (ano: number, mes: number) => void
  anterior: () => void
  seguinte: () => void
}

/** Mês em foco, guardado em `?ano=&mes=` na URL; sem (ou com) valor inválido vale o mês atual em São Paulo. */
export function useMesSelecionado(): MesSelecionado {
  const [params, setParams] = useSearchParams()
  const hoje = mesAtual()
  const ano = inteiroEntre(params.get('ano'), 2000, 2100) ?? hoje.ano
  const mes = inteiroEntre(params.get('mes'), 1, 12) ?? hoje.mes

  const irPara = (novoAno: number, novoMes: number) => {
    setParams(
      (atual) => {
        const proximo = new URLSearchParams(atual)
        proximo.set('ano', String(novoAno))
        proximo.set('mes', String(novoMes))
        return proximo
      },
      { replace: true },
    )
  }

  return {
    ano,
    mes,
    busca: `?ano=${ano}&mes=${mes}`,
    irPara,
    anterior: () => {
      const m = mesAnterior({ ano, mes })
      irPara(m.ano, m.mes)
    },
    seguinte: () => {
      const m = mesSeguinte({ ano, mes })
      irPara(m.ano, m.mes)
    },
  }
}
