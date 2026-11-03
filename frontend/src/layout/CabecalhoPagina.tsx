import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { SeletorMes } from './SeletorMes'
import { useMesSelecionado } from './useMesSelecionado'

interface Props {
  titulo: string
  subtitulo?: string
  /** Quando informado, o clique em "+ Lançar" abre o formulário in-place na tela atual em vez de navegar. */
  aoLancar?: () => void
  /** Ação própria da tela (ex.: "+ Novo cartão"), ao lado de "+ Lançar". */
  acaoExtra?: ReactNode
  /** Mantém título e subtítulo visíveis também abaixo de `md` (padrão: só para leitor de tela). */
  tituloVisivelNoCelular?: boolean
}

/**
 * Cabeçalho das telas do mês (visão geral, orçamento, cartões): título e subtítulo à esquerda; seletor de mês,
 * atalho "+ Lançar" e a ação extra da tela à direita. O mês vive na URL (`?ano=&mes=`), então o link já leva o mês
 * em foco para o formulário. Abaixo de `md` o título fica só para leitor de tela (o `<h1>` continua único na página),
 * a não ser que `tituloVisivelNoCelular` seja ligado.
 */
export function CabecalhoPagina({ titulo, subtitulo, aoLancar, acaoExtra, tituloVisivelNoCelular = false }: Props) {
  const { busca } = useMesSelecionado()

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 md:mb-5">
      <div className={tituloVisivelNoCelular ? 'min-w-0' : 'min-w-0 sr-only md:not-sr-only'}>
        <h1 className="m-0 text-[28px] font-bold tracking-tight">{titulo}</h1>
        {subtitulo ? <p className="m-0 mt-1 text-[13px] text-[var(--cor-mutado)]">{subtitulo}</p> : null}
      </div>
      <div
        data-testid="acoes-do-cabecalho"
        className="flex w-full flex-wrap items-center justify-between gap-2 md:w-auto md:justify-end"
      >
        <SeletorMes />
        <div className="flex flex-wrap items-center gap-2">
          {acaoExtra}
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
      </div>
    </div>
  )
}
