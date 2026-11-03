import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { endpoints } from '../../api/endpoints'
import type { CartaoResponse } from '../../api/tipos'
import { mensagemDoErro } from '../../auth/mensagemDoErro'
import { Esqueleto } from '../../componentes/Esqueleto'
import { formatarMoeda } from '../../formato/moeda'
import { CabecalhoPagina } from '../../layout/CabecalhoPagina'
import { useMesSelecionado } from '../../layout/useMesSelecionado'
import { formatarPercentual } from '../inicio/valores'
import { Plus } from 'lucide-react'
import { LancamentoForm } from '../lancamentos/LancamentoForm'
import { CardCartao } from './CardCartao'
import { EditorCartao } from './EditorCartao'

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

function calcularTotaisTitular(
  cartoes: CartaoResponse[],
  titularFiltro: string,
  totalPadrao: { totalFaturas: string; limiteTotal: string; usoGeral: string | null }
) {
  if (titularFiltro === 'todos') {
    return totalPadrao
  }

  const somaFaturas = cartoes.reduce(
    (acc, c) => acc + (Number.parseFloat(c.fatura) || 0),
    0
  )
  const cartoesComLimite = cartoes.filter((c) => c.limite !== null)
  const somaLimites = cartoesComLimite.reduce(
    (acc, c) => acc + (Number.parseFloat(c.limite!) || 0),
    0
  )
  const somaFaturasComLimite = cartoesComLimite.reduce(
    (acc, c) => acc + (Number.parseFloat(c.fatura) || 0),
    0
  )

  return {
    totalFaturas: somaFaturas.toFixed(2),
    limiteTotal: somaLimites.toFixed(2),
    usoGeral: somaLimites > 0 ? (somaFaturasComLimite / somaLimites).toFixed(4) : null,
  }
}

interface FiltroTitularesProps {
  titulares: string[]
  cartoes: CartaoResponse[]
  titularFiltro: string
  aoSelecionar: (titular: string) => void
}

function FiltroTitulares({ titulares, cartoes, titularFiltro, aoSelecionar }: FiltroTitularesProps) {
  if (titulares.length === 0) {
    return null
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => aoSelecionar('todos')}
        className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-200 ${
          titularFiltro === 'todos'
            ? 'bg-[var(--cor-principal)] text-[var(--cor-sobre-principal)]'
            : 'border border-[var(--cor-linha)] bg-[var(--cor-card)] text-[var(--cor-mutado)] hover:border-[var(--cor-principal)] hover:text-[var(--cor-texto)]'
        }`}
      >
        Todos ({cartoes.length})
      </button>
      {titulares.map((titular) => {
        const count = cartoes.filter(
          (c) => (c.titular?.trim().toLowerCase() ?? '') === titular.toLowerCase()
        ).length
        const ativo = titularFiltro.toLowerCase() === titular.toLowerCase()
        return (
          <button
            key={titular}
            type="button"
            onClick={() => aoSelecionar(titular)}
            className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-200 ${
              ativo
                ? 'bg-[var(--cor-principal)] text-[var(--cor-sobre-principal)]'
                : 'border border-[var(--cor-linha)] bg-[var(--cor-card)] text-[var(--cor-mutado)] hover:border-[var(--cor-principal)] hover:text-[var(--cor-texto)]'
            }`}
          >
            {titular} ({count})
          </button>
        )
      })}
    </div>
  )
}

interface ListaCartoesProps {
  totalCartoes: number
  cartoesExibidos: CartaoResponse[]
  titularFiltro: string
  aoCriarCartao: () => void
  aoEditarCartao: (cartao: CartaoResponse) => void
  aoLancarCartao: (cartao: CartaoResponse) => void
}

function ListaCartoes({
  totalCartoes,
  cartoesExibidos,
  titularFiltro,
  aoCriarCartao,
  aoEditarCartao,
  aoLancarCartao,
}: ListaCartoesProps) {
  if (totalCartoes === 0) {
    return (
      <div className="card flex flex-col items-start gap-3 text-sm text-[var(--cor-mutado)]">
        <p className="m-0">
          Nenhum cartão cadastrado. Você pode cadastrar um cartão diretamente por aqui ou marcando um item existente em{' '}
          <Link to="/categorias" className="font-semibold text-[var(--cor-principal)]">
            Categorias
          </Link>.
        </p>
        <button
          type="button"
          onClick={aoCriarCartao}
          className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full bg-[var(--cor-principal)] px-4 text-sm font-semibold text-[var(--cor-sobre-principal)] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
        >
          + Cadastrar primeiro cartão
        </button>
      </div>
    )
  }

  if (cartoesExibidos.length === 0) {
    return (
      <div className="card text-sm text-[var(--cor-mutado)]">
        <p className="m-0">Nenhum cartão encontrado para o titular {titularFiltro}.</p>
      </div>
    )
  }

  return (
    <div className="item-entra grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
      {/* Botão/card pontilhado para adicionar novo cartão de forma intuitiva */}
      <button
        type="button"
        onClick={aoCriarCartao}
        aria-label="Cadastrar novo cartão na grade"
        className="cartao-novo-dashed"
      >
        <div className="cartao-novo-dashed__icon" aria-hidden="true">
          <Plus className="size-6 stroke-[2.5]" />
        </div>
        <div className="text-center">
          <span className="block text-sm font-bold text-[var(--cor-texto)]">Novo cartão</span>
          <span className="block mt-0.5 text-xs text-[var(--cor-mutado)]">Adicionar cartão de crédito</span>
        </div>
      </button>

      {cartoesExibidos.map((cartao) => (
        <CardCartao
          key={cartao.itemId}
          cartao={cartao}
          aoEditar={aoEditarCartao}
          aoLancar={aoLancarCartao}
        />
      ))}
    </div>
  )
}

/**
 * `/cartoes`: fatura do mês de cada cartão contra o limite cadastrado.
 * Permite cadastrar limite e editar dados in-place, além de realizar lançamentos diretamente no cartão.
 */
export function CartoesPage() {
  const { ano, mes } = useMesSelecionado()
  const [criandoCartao, setCriandoCartao] = useState(false)
  const [cartaoParaEditar, setCartaoParaEditar] = useState<CartaoResponse | null>(null)
  const [cartaoParaLancamento, setCartaoParaLancamento] = useState<CartaoResponse | null>(null)
  const [lancandoGeral, setLancandoGeral] = useState(false)
  const [titularFiltro, setTitularFiltro] = useState<string>('todos')

  const consulta = useQuery({
    queryKey: ['cartoes', ano, mes],
    queryFn: () => endpoints.cartoes.listar(ano, mes),
    placeholderData: keepPreviousData,
  })

  const cartoesCarregados = consulta.data?.cartoes ?? []
  const titularesPresentes = Array.from(
    new Set(
      cartoesCarregados
        .map((c) => c.titular?.trim())
        .filter((t): t is string => Boolean(t))
    )
  ).sort((a, b) => a.localeCompare(b))

  const titulo = (
    <CabecalhoPagina
      titulo="Cartões"
      subtitulo="Quanto da fatura do mês ocupa o limite de cada cartão."
      aoLancar={() => setLancandoGeral(true)}
      tituloVisivelNoCelular
      acaoExtra={
        <button
          type="button"
          onClick={() => setCriandoCartao(true)}
          className="flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-[var(--cor-principal)] px-4 text-sm font-semibold whitespace-nowrap text-[var(--cor-sobre-principal)] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
        >
          + Novo cartão
        </button>
      }
    />
  )

  let conteudo: ReactNode
  if (consulta.isPending) {
    conteudo = (
      <div className="flex flex-col gap-4" role="status" aria-label="Carregando os cartões…" aria-busy="true">
        <span className="sr-only">Carregando os cartões…</span>
        <div aria-hidden="true" className="grid gap-2.5 sm:grid-cols-3 md:gap-3.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card !p-3.5 md:!p-4 flex flex-col gap-2">
              <Esqueleto className="h-3.5 w-24" />
              <Esqueleto className="h-7 w-32" />
            </div>
          ))}
        </div>
        <div aria-hidden="true" className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card flex flex-col gap-4 p-4">
              <div className="flex items-center justify-between">
                <Esqueleto className="h-5 w-28" />
                <Esqueleto className="h-5 w-16" />
              </div>
              <Esqueleto className="h-2 w-full rounded-full" />
              <div className="flex justify-between">
                <Esqueleto className="h-3 w-20" />
                <Esqueleto className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
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

    const titularesPresentes = Array.from(
      new Set(
        cartoes
          .map((c) => c.titular?.trim())
          .filter((t): t is string => Boolean(t))
      )
    ).sort((a, b) => a.localeCompare(b))

    const cartoesExibidos =
      titularFiltro === 'todos'
        ? cartoes
        : cartoes.filter(
            (c) => (c.titular?.trim().toLowerCase() ?? '') === titularFiltro.toLowerCase()
          )

    const totais = calcularTotaisTitular(cartoesExibidos, titularFiltro, {
      totalFaturas,
      limiteTotal,
      usoGeral,
    })

    conteudo = (
      <>
        <FiltroTitulares
          titulares={titularesPresentes}
          cartoes={cartoes}
          titularFiltro={titularFiltro}
          aoSelecionar={setTitularFiltro}
        />
        <div className="mb-3.5 grid gap-2.5 sm:grid-cols-3 md:gap-3.5">
          <CardResumo
            titulo={titularFiltro === 'todos' ? 'Faturas do mês' : `Faturas de ${titularFiltro}`}
            valor={formatarMoeda(totais.totalFaturas)}
          />
          <CardResumo
            titulo={titularFiltro === 'todos' ? 'Limite total' : `Limite de ${titularFiltro}`}
            valor={formatarMoeda(totais.limiteTotal)}
          />
          <CardResumo
            titulo="Uso geral"
            valor={totais.usoGeral === null ? '—' : formatarPercentual(totais.usoGeral)}
          />
        </div>
        <ListaCartoes
          totalCartoes={cartoes.length}
          cartoesExibidos={cartoesExibidos}
          titularFiltro={titularFiltro}
          aoCriarCartao={() => setCriandoCartao(true)}
          aoEditarCartao={(c) => setCartaoParaEditar(c)}
          aoLancarCartao={(c) => setCartaoParaLancamento(c)}
        />
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
      {criandoCartao && (
        <EditorCartao
          aoFechar={() => setCriandoCartao(false)}
          titularesSugeridos={titularesPresentes}
        />
      )}
      {cartaoParaEditar && (
        <EditorCartao
          cartaoParaEditar={cartaoParaEditar}
          aoFechar={() => setCartaoParaEditar(null)}
          titularesSugeridos={titularesPresentes}
        />
      )}
      {cartaoParaLancamento && (
        <LancamentoForm
          aoFechar={() => setCartaoParaLancamento(null)}
          aoSalvar={() => {
            void consulta.refetch()
            setCartaoParaLancamento(null)
          }}
          itemPreSelecionado={{
            itemId: cartaoParaLancamento.itemId,
            categoriaId: cartaoParaLancamento.categoriaId,
          }}
          mesInicial={{ ano, mes }}
        />
      )}
      {lancandoGeral && (
        <LancamentoForm
          aoFechar={() => setLancandoGeral(false)}
          aoSalvar={() => {
            void consulta.refetch()
            setLancandoGeral(false)
          }}
          mesInicial={{ ano, mes }}
        />
      )}
    </>
  )
}
