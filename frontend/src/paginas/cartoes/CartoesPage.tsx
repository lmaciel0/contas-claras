import { useQuery } from '@tanstack/react-query'
import { useId } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { endpoints } from '../../api/endpoints'
import { mensagemDoErro } from '../../auth/mensagemDoErro'
import { formatarMoeda } from '../../formato/moeda'
import { useMesSelecionado } from '../../layout/useMesSelecionado'
import { formatarPercentual } from '../inicio/valores'
import { CardCartao } from './CardCartao'

interface CardResumoProps {
  titulo: string
  valor: string
}

function CardResumo({ titulo, valor }: CardResumoProps) {
  const idTitulo = useId()
  return (
    <section aria-labelledby={idTitulo} className="card !p-3.5 md:!p-4">
      <h2 id={idTitulo} className="m-0 text-xs font-normal text-[var(--cor-mutado)]">
        {titulo}
      </h2>
      <p className="valor m-0 mt-1 text-lg font-bold tracking-tight md:text-[26px]">{valor}</p>
    </section>
  )
}

/**
 * `/cartoes`: fatura do mês de cada cartão contra o limite cadastrado. Cartão é um item marcado como tal em
 * Categorias; sem limite a barra não existe e o card leva para lá. A API já manda a ordem (maior fatura primeiro).
 */
export function CartoesPage() {
  const { ano, mes } = useMesSelecionado()
  const consulta = useQuery({
    queryKey: ['cartoes', ano, mes],
    queryFn: () => endpoints.cartoes.listar(ano, mes),
  })

  const titulo = (
    <div className="mb-3 sr-only md:not-sr-only md:mb-5">
      <h1 className="m-0 text-[28px] font-bold tracking-tight">Cartões</h1>
      <p className="m-0 mt-1 text-[13px] text-[var(--cor-mutado)]">
        Quanto da fatura do mês ocupa o limite de cada cartão.
      </p>
    </div>
  )

  let conteudo: ReactNode
  if (consulta.isPending) {
    conteudo = (
      <p role="status" className="m-0 text-sm text-[var(--cor-mutado)]">
        Carregando os cartões…
      </p>
    )
  } else if (consulta.isError) {
    conteudo = (
      <div role="alert" className="card flex flex-wrap items-center gap-3 text-sm">
        <p className="m-0">{mensagemDoErro(consulta.error)}</p>
        <button
          type="button"
          onClick={() => void consulta.refetch()}
          className="rounded-full bg-[var(--cor-principal)] px-4 py-2 text-sm font-semibold text-[var(--cor-sobre-principal)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
        >
          Tentar de novo
        </button>
      </div>
    )
  } else {
    const { totalFaturas, limiteTotal, usoGeral, cartoes } = consulta.data
    conteudo = (
      <>
        <div className="mb-3.5 grid gap-2.5 sm:grid-cols-3 md:gap-3.5">
          <CardResumo titulo="Faturas do mês" valor={formatarMoeda(totalFaturas)} />
          <CardResumo titulo="Limite total" valor={formatarMoeda(limiteTotal)} />
          <CardResumo titulo="Uso geral" valor={usoGeral === null ? '—' : formatarPercentual(usoGeral)} />
        </div>
        {cartoes.length === 0 ? (
          <p className="card m-0 text-sm text-[var(--cor-mutado)]">
            Nenhum cartão cadastrado. Em{' '}
            <Link to="/categorias" className="font-semibold text-[var(--cor-principal)]">
              Categorias
            </Link>
            , edite um item e marque &quot;É cartão de crédito&quot;.
          </p>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 md:gap-3.5">
            {cartoes.map((cartao) => (
              <CardCartao key={cartao.itemId} cartao={cartao} />
            ))}
          </div>
        )}
        <p className="mx-1 mt-2.5 mb-0 text-xs text-[var(--cor-mutado)]">
          O limite do banco também desconta parcelas futuras, que o app não conhece.
        </p>
      </>
    )
  }

  return (
    <>
      {titulo}
      {conteudo}
    </>
  )
}
