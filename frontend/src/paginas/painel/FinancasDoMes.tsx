import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { ErroApi } from '../../api/cliente'
import { endpoints } from '../../api/endpoints'
import { Esqueleto } from '../../componentes/Esqueleto'
import { mesAnterior, mesAtual, nomeMes } from '../../formato/mes'
import { CardSobra } from '../inicio/CardSobra'
import { CardsTotais } from '../inicio/CardsTotais'
import { ProximasContas } from '../inicio/ProximasContas'

const minusculo = (texto: string) => texto.toLocaleLowerCase('pt-BR')

/**
 * Bloco "Finanças do mês" da tela inicial: sempre o mês atual (sem seletor, a URL não interfere), com sobra, receitas,
 * despesas e próximas contas. Divide a chave de cache `['resumo', ano, mes]` com a visão geral. O carregamento e o erro
 * ficam só dentro do bloco, para a saudação aparecer na hora mesmo com a API acordando.
 */
export function FinancasDoMes() {
  const { ano, mes } = mesAtual()
  const consulta = useQuery({
    queryKey: ['resumo', ano, mes],
    queryFn: () => endpoints.resumo(ano, mes),
    placeholderData: keepPreviousData,
  })

  const nomeAnterior = minusculo(nomeMes(mesAnterior({ ano, mes }).mes))

  return (
    <section aria-labelledby="titulo-financas" className="card item-entra">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="titulo-financas" className="m-0 text-[15px] font-bold">
          Finanças do mês
        </h2>
        <Link
          to="/financeiro"
          className="inline-flex min-h-11 items-center px-1 text-sm font-semibold text-[var(--cor-principal)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
        >
          Ver visão geral
        </Link>
      </div>

      {consulta.isPending && (
        <div
          role="status"
          className="grid gap-2.5 md:grid-cols-35 md:gap-3.5"
          aria-busy="true"
          aria-label="Carregando as finanças…"
        >
          <span className="sr-only">Carregando as finanças…</span>
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
        </div>
      )}

      {consulta.isError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
          <p className="m-0">
            {consulta.error instanceof ErroApi ? consulta.error.mensagem : 'Algo deu errado. Tente de novo.'}
          </p>
          <button
            type="button"
            onClick={() => void consulta.refetch()}
            className="min-h-11 rounded-full bg-[var(--cor-principal)] px-4 text-sm font-semibold text-[var(--cor-sobre-principal)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
          >
            Tentar de novo
          </button>
        </div>
      )}

      {consulta.isSuccess && (
        <div className="grid gap-2.5 md:grid-cols-35 md:gap-3.5">
          <CardSobra
            sobra={consulta.data.sobra}
            sobraAno={consulta.data.sobraAno}
            anterior={consulta.data.anterior}
            nomeMesAnterior={nomeAnterior}
          />
          <CardsTotais
            receitas={consulta.data.receitas}
            despesas={consulta.data.despesas}
            anterior={consulta.data.anterior}
            nomeMesAnterior={nomeAnterior}
          />
          <ProximasContas contas={consulta.data.proximas} />
        </div>
      )}
    </section>
  )
}
