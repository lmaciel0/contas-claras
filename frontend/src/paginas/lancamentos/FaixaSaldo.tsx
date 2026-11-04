import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { endpoints } from '../../api/endpoints'
import { formatarMoeda } from '../../formato/moeda'
import { mesAtual, nomeMes } from '../../formato/mes'

interface Props {
  ano: number
  mes: number
}

/** Medidas compartilhadas entre a faixa e o esqueleto, para a página não pular quando o saldo chega. */
const medidas = 'flex flex-col gap-3 rounded-[var(--raio-card)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between'

interface MioloProps {
  rotulo: string
  saldo: string
  recebido: string
  'aria-hidden'?: boolean
}

/** Os dois blocos da faixa: saldo à esquerda, recebido no mês à direita (sob o saldo no celular). */
function Miolo({ rotulo, saldo, recebido, 'aria-hidden': oculto }: MioloProps) {
  return (
    <>
      <div aria-hidden={oculto}>
        <p className="m-0 text-xs font-semibold">{rotulo}</p>
        <p className="valor m-0 text-[30px] leading-[1.1] font-extrabold tracking-tight">{formatarMoeda(saldo)}</p>
      </div>
      <div
        aria-hidden={oculto}
        className="border-t border-[color-mix(in_srgb,currentColor_30%,transparent)] pt-3 sm:border-t-0 sm:pt-0 sm:text-right"
      >
        <p className="m-0 text-xs font-semibold">Recebido no mês</p>
        <p className="valor m-0 text-lg font-bold">{formatarMoeda(recebido)}</p>
      </div>
    </>
  )
}

/**
 * Faixa do saldo no topo do Orçamento: dinheiro no Itaú (só lançamentos pagos) à esquerda e o recebido no mês à direita;
 * empilha no celular. Fica escondida antes do mês de início do cálculo e se a consulta falhar (a página segue usável).
 */
export function FaixaSaldo({ ano, mes }: Props) {
  const consulta = useQuery({
    queryKey: ['saldo', ano, mes],
    queryFn: () => endpoints.saldo(ano, mes),
    placeholderData: keepPreviousData,
  })

  if (consulta.isPending) {
    // Mesmo miolo da faixa com o texto transparente: a altura é a mesma e a página não pula quando o saldo chega.
    return (
      <div
        role="status"
        aria-label="Carregando o saldo…"
        aria-busy="true"
        className={`${medidas} esqueleto-shimmer mb-3 text-transparent`}
      >
        <Miolo rotulo="Dinheiro no Itaú hoje" saldo="0" recebido="0" aria-hidden />
      </div>
    )
  }
  if (consulta.isError || !consulta.data.ativo) return null

  const atual = mesAtual()
  const doMesCorrente = atual.ano === ano && atual.mes === mes
  const rotulo = doMesCorrente ? 'Dinheiro no Itaú hoje' : `Saldo no Itaú ao fim de ${nomeMes(mes)}`

  return (
    <section
      aria-label="Saldo no Itaú"
      aria-busy={consulta.isPlaceholderData}
      className={`${medidas} mb-3 text-[var(--cor-sobre-principal)] shadow-[var(--sombra-flutuante)] motion-safe:transition-opacity ${
        consulta.isPlaceholderData ? 'opacity-70' : ''
      }`}
      style={{ background: 'linear-gradient(120deg, var(--cor-principal), var(--cor-principal-fim))' }}
    >
      <Miolo rotulo={rotulo} saldo={consulta.data.saldo} recebido={consulta.data.recebidoNoMes} />
    </section>
  )
}
