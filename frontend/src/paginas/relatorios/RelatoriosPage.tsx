import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { endpoints } from '../../api/endpoints'
import { mensagemDoErro } from '../../auth/mensagemDoErro'
import { Carregando } from '../../componentes/Carregando'
import { useMesSelecionado } from '../../layout/useMesSelecionado'
import { TabelaAnual } from './TabelaAnual'

const ANO_MINIMO = 2000
const ANO_MAXIMO = 2100

const botao =
  'grid h-8 min-w-8 place-items-center rounded-full text-[var(--cor-principal)] hover:bg-[var(--cor-fundo)] ' +
  'disabled:cursor-not-allowed disabled:text-[var(--cor-principal-clara)] disabled:hover:bg-transparent ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--cor-principal)]'

interface SeletorAnoProps {
  ano: number
  irParaAno: (ano: number) => void
}

/** `‹ 2026 ›`: troca o ano do relatório. Fica fora da área que carrega, para não sumir enquanto busca. */
function SeletorAno({ ano, irParaAno }: SeletorAnoProps) {
  return (
    <div
      role="group"
      aria-label="Ano"
      className="flex items-center gap-1 rounded-full bg-[var(--cor-card)] px-1 py-0.5 text-sm font-semibold shadow-sm"
    >
      <button
        type="button"
        className={botao}
        aria-label="Ano anterior"
        disabled={ano <= ANO_MINIMO}
        onClick={() => irParaAno(ano - 1)}
      >
        <span aria-hidden="true">‹</span>
      </button>
      <span className="min-w-14 text-center" aria-live="polite">
        {ano}
      </span>
      <button
        type="button"
        className={botao}
        aria-label="Ano seguinte"
        disabled={ano >= ANO_MAXIMO}
        onClick={() => irParaAno(ano + 1)}
      >
        <span aria-hidden="true">›</span>
      </button>
    </div>
  )
}

/**
 * `/relatorios`: o ano inteiro no formato da planilha (item × mês). O ano fica em `?ano=` na URL, o mesmo parâmetro do
 * mês em foco, então recarregar ou voltar mantém o ano e as abas levam o ano junto.
 */
export function RelatoriosPage() {
  const { ano, mes, busca, irPara } = useMesSelecionado()
  const consulta = useQuery({
    queryKey: ['relatorio', ano],
    queryFn: () => endpoints.relatorios.ano(ano),
    placeholderData: keepPreviousData,
  })

  let conteudo: ReactNode
  if (consulta.isPending) {
    conteudo = <Carregando texto="Carregando o relatório…" />
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
  } else if (consulta.data.categorias.length === 0) {
    conteudo = (
      <p className="card m-0 text-sm text-[var(--cor-mutado)]">
        Nenhum lançamento em {ano}. Quando você registrar algo em{' '}
        <Link
          to={{ pathname: '/lancamentos', search: busca }}
          className="font-semibold text-[var(--cor-principal)]"
        >
          Orçamento
        </Link>
        , o ano aparece aqui.
      </p>
    )
  } else {
    conteudo = (
      <>
        <TabelaAnual relatorio={consulta.data} />
        <p className="mx-1 mt-2.5 mb-0 text-xs text-[var(--cor-mutado)]">
          Valores em reais (R$), sem o símbolo. Verde: já pago. Cor normal: previsto. “–”: sem lançamento no mês.
        </p>
      </>
    )
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 md:mb-5">
        <div className="sr-only md:not-sr-only">
          <h1 className="m-0 text-[28px] font-bold tracking-tight">Relatórios</h1>
          <p className="m-0 mt-1 text-[13px] text-[var(--cor-mutado)]">O ano inteiro, item por item, mês a mês.</p>
        </div>
        <SeletorAno ano={ano} irParaAno={(novoAno) => irPara(novoAno, mes)} />
      </div>
      {conteudo}
    </>
  )
}
