import { Link } from 'react-router'
import { SeletorMes } from './SeletorMes'
import { useMesSelecionado } from './useMesSelecionado'

interface Props {
  aoLancar?: () => void
}

/**
 * Linha do topo das telas do mês (visão geral, lançamentos, cartões): seletor de mês e atalho "+ Lançar".
 * O mês vive na URL (`?ano=&mes=`), então o link já leva o mês em foco para o formulário.
 * Permite passar `aoLancar` para disparar o formulário in-place na tela atual sem forçar navegação de página.
 */
export function FaixaFinanceira({ aoLancar }: Props = {}) {
  const { busca } = useMesSelecionado()

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 md:mb-4">
      <SeletorMes />
      <Link
        to={{ pathname: '/lancamentos/novo', search: busca }}
        onClick={(evento) => {
          if (aoLancar) {
            evento.preventDefault()
            aoLancar()
          }
        }}
        className="inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-full bg-[var(--cor-principal)] px-4 text-sm font-semibold whitespace-nowrap text-[var(--cor-sobre-principal)] no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
      >
        + Lançar
      </Link>
    </div>
  )
}
