import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ErroApi } from '../../api/cliente'
import { endpoints } from '../../api/endpoints'
import { Esqueleto } from '../../componentes/Esqueleto'
import { mesAnterior, nomeMes } from '../../formato/mes'
import { CabecalhoPagina } from '../../layout/CabecalhoPagina'
import { useMesSelecionado } from '../../layout/useMesSelecionado'
import { CardSobra } from './CardSobra'
import { CardsTotais } from './CardsTotais'
import { GraficoResultado } from './GraficoResultado'
import { OndeMaisGastou } from './OndeMaisGastou'
import { ProximasContas } from './ProximasContas'
import { ResumoCartoes } from './ResumoCartoes'

const minusculo = (texto: string) => texto.toLocaleLowerCase('pt-BR')

/**
 * Visão geral do financeiro (`/financeiro`): quanto sobra no mês e para onde vai o dinheiro. A ordem dos blocos no HTML é a do celular
 * (sobra, totais, resultado de cada mês, onde mais gastou, próximas contas, cartões). No computador (grade de 35 colunas): sobra e
 * totais na primeira linha, com as próximas contas ao lado ocupando duas linhas; o gráfico na segunda; onde mais gastou e cartões na
 * terceira. Sem cartões, onde mais gastou ocupa a linha inteira.
 */
export function InicioPage() {
  const { ano, mes, busca } = useMesSelecionado()
  const consulta = useQuery({
    queryKey: ['resumo', ano, mes],
    queryFn: () => endpoints.resumo(ano, mes),
    placeholderData: keepPreviousData,
  })
  // Cartões são um bloco à parte: falha ou lista vazia só o escondem, não derrubam a página.
  const consultaCartoes = useQuery({
    queryKey: ['cartoes', ano, mes],
    queryFn: () => endpoints.cartoes.listar(ano, mes),
    placeholderData: keepPreviousData,
  })

  const titulo = <CabecalhoPagina titulo="Visão geral" subtitulo="Quanto sobra e para onde vai o seu dinheiro." />

  if (consulta.isPending) {
    return (
      <>
        {titulo}
        <div
          role="status"
          className="grid gap-2.5 md:grid-cols-35 md:gap-3.5"
          aria-busy="true"
          aria-label="Carregando o resumo…"
        >
          <span className="sr-only">Carregando o resumo…</span>
          <div aria-hidden="true" className="card flex flex-col justify-between p-4 min-h-[140px]">
            <Esqueleto className="h-4 w-28" />
            <Esqueleto className="h-8 w-36" />
            <Esqueleto className="h-3 w-24" />
          </div>
          <div aria-hidden="true" className="card flex flex-col justify-between p-4 min-h-[140px]">
            <Esqueleto className="h-4 w-28" />
            <Esqueleto className="h-8 w-36" />
            <Esqueleto className="h-3 w-24" />
          </div>
          <div aria-hidden="true" className="card flex flex-col gap-3 p-4 min-h-[140px]">
            <Esqueleto className="h-4 w-32" />
            <Esqueleto linhas={2} />
          </div>
          <div aria-hidden="true" className="card flex flex-col gap-3 p-4 min-h-[140px]">
            <Esqueleto className="h-4 w-32" />
            <Esqueleto linhas={2} />
          </div>
        </div>
      </>
    )
  }

  if (consulta.isError) {
    const mensagem = consulta.error instanceof ErroApi ? consulta.error.mensagem : 'Algo deu errado. Tente de novo.'
    return (
      <>
        {titulo}
        <div role="alert" className="card flex flex-wrap items-center gap-3 text-sm">
          <p className="m-0">{mensagem}</p>
          <button
            type="button"
            onClick={() => void consulta.refetch()}
            className="rounded-full bg-[var(--cor-principal)] px-4 py-2 text-sm font-semibold text-[var(--cor-sobre-principal)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
          >
            Tentar de novo
          </button>
        </div>
      </>
    )
  }

  const resumo = consulta.data
  const cartoes = consultaCartoes.data?.cartoes ?? []
  // Enquanto carrega, o layout já reserva o espaço dos cartões, para não saltar se houver.
  const semCartoes = !consultaCartoes.isPending && cartoes.length === 0
  const nomeAnterior = minusculo(nomeMes(mesAnterior({ ano, mes }).mes))

  return (
    <>
      {titulo}
      <div className="grid gap-2.5 md:grid-cols-35 md:gap-3.5">
        <CardSobra
          sobra={resumo.sobra}
          sobraAno={resumo.sobraAno}
          receitas={resumo.receitas}
          anterior={resumo.anterior}
          nomeMesAnterior={nomeAnterior}
        />
        <CardsTotais
          receitas={resumo.receitas}
          despesas={resumo.despesas}
          anterior={resumo.anterior}
          nomeMesAnterior={nomeAnterior}
        />
        <GraficoResultado
          ano={ano}
          mes={mes}
          serie={resumo.serieAno}
          className="md:col-span-21 md:col-start-1 md:row-start-2"
        />
        <OndeMaisGastou
          nomeMes={minusculo(nomeMes(mes))}
          categorias={resumo.categorias}
          className={semCartoes ? 'md:col-span-35' : 'md:col-span-20'}
        />
        <ProximasContas contas={resumo.proximas} className="md:col-span-14 md:col-start-22 md:row-span-2 md:row-start-1" />
        <ResumoCartoes cartoes={cartoes} busca={busca} className="md:col-span-15" />
      </div>
    </>
  )
}
