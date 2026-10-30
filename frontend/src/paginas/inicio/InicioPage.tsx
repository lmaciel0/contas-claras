import { useQuery } from '@tanstack/react-query'
import { ErroApi } from '../../api/cliente'
import { endpoints } from '../../api/endpoints'
import { mesAnterior, nomeMes } from '../../formato/mes'
import { useMesSelecionado } from '../../layout/useMesSelecionado'
import { CardSobra } from './CardSobra'
import { CardsTotais } from './CardsTotais'
import { GraficoAno } from './GraficoAno'
import { OndeMaisGastou } from './OndeMaisGastou'
import { ProximasContas } from './ProximasContas'

const minusculo = (texto: string) => texto.toLocaleLowerCase('pt-BR')

/**
 * Tela inicial: quanto sobra no mês e para onde vai o dinheiro. A ordem dos blocos no HTML é a do celular
 * (sobra, totais, onde mais gastou, próximas contas, gráfico); no computador o gráfico sobe para a primeira linha.
 */
export function InicioPage() {
  const { ano, mes } = useMesSelecionado()
  const consulta = useQuery({
    queryKey: ['resumo', ano, mes],
    queryFn: () => endpoints.resumo(ano, mes),
  })

  const titulo = (
    <div className="mb-3 sr-only md:not-sr-only md:mb-5">
      <h1 className="m-0 text-[28px] font-bold tracking-tight">Início</h1>
      <p className="m-0 mt-1 text-[13px] text-[var(--cor-mutado)]">Quanto sobra e para onde vai o seu dinheiro.</p>
    </div>
  )

  if (consulta.isPending) {
    return (
      <>
        {titulo}
        <p role="status" className="m-0 text-sm text-[var(--cor-mutado)]">
          Carregando o resumo…
        </p>
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
            className="rounded-full bg-[var(--cor-principal)] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
          >
            Tentar de novo
          </button>
        </div>
      </>
    )
  }

  const resumo = consulta.data
  const nomeAnterior = minusculo(nomeMes(mesAnterior({ ano, mes }).mes))

  return (
    <>
      {titulo}
      <div className="grid gap-2.5 md:grid-cols-35 md:gap-3.5">
        <CardSobra
          sobra={resumo.sobra}
          sobraAno={resumo.sobraAno}
          anterior={resumo.anterior}
          nomeMesAnterior={nomeAnterior}
        />
        <CardsTotais
          receitas={resumo.receitas}
          despesas={resumo.despesas}
          anterior={resumo.anterior}
          nomeMesAnterior={nomeAnterior}
        />
        <OndeMaisGastou nomeMes={minusculo(nomeMes(mes))} categorias={resumo.categorias} />
        <ProximasContas contas={resumo.proximas} />
        <GraficoAno ano={ano} serie={resumo.serieAno} />
      </div>
    </>
  )
}
