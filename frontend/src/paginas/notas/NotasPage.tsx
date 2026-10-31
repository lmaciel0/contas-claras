import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import type { NotaResumoResponse } from '../../api/tipos'
import { mensagemDoErro } from '../../auth/mensagemDoErro'
import { CartaoNota } from './CartaoNota'
import { FaixaCategorias } from './FaixaCategorias'
import type { SelecaoCategoria } from './FaixaCategorias'
import { useCategoriasNota, useCriarNota, useFixarNota, useNotas } from './useNotas'

const PAUSA_BUSCA_MS = 300
const foco = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]'
const grade = 'm-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3'

function Esqueleto() {
  return (
    <ul aria-hidden="true" className={grade}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <li key={i} className="h-32 rounded-[var(--raio-card)] bg-[var(--cor-card)] motion-safe:animate-pulse" />
      ))}
    </ul>
  )
}

/** Lista de notas: busca (com pausa de 300 ms), chips de categoria, grade de cartões e criação de nota. */
export function NotasPage() {
  const navegar = useNavigate()
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [selecao, setSelecao] = useState<SelecaoCategoria>('todas')
  const categorias = useCategoriasNota()
  const criar = useCriarNota()
  const fixar = useFixarNota()

  useEffect(() => {
    const relogio = setTimeout(() => setBuscaAplicada(busca.trim()), PAUSA_BUSCA_MS)
    return () => clearTimeout(relogio)
  }, [busca])

  const lista = categorias.data ?? []
  // Categoria excluída enquanto estava selecionada: volta para "Todas".
  const efetiva: SelecaoCategoria = typeof selecao === 'number' && !lista.some((c) => c.id === selecao) && categorias.isSuccess ? 'todas' : selecao
  const notas = useNotas({
    ...(buscaAplicada !== '' && { busca: buscaAplicada }),
    ...(typeof efetiva === 'number' && { categoriaId: efetiva }),
    ...(efetiva === 'sem' && { semCategoria: true }),
  })

  // Feedback imediato: enquanto o PATCH roda, o alfinete já mostra o resultado (só uma nota fica fixada).
  const pedido = fixar.isPending ? fixar.variables : undefined
  const fixadaAgora = (n: NotaResumoResponse) =>
    pedido === undefined ? n.fixada : n.id === pedido.id ? pedido.fixada : pedido.fixada ? false : n.fixada

  function novaNota() {
    criar.mutate(typeof efetiva === 'number' ? efetiva : null, { onSuccess: (nota) => navegar(`/notas/${nota.id}`) })
  }

  const filtrando = buscaAplicada !== '' || efetiva !== 'todas'
  let conteudo
  if (notas.isError) {
    conteudo = (
      <p role="alert" className="card m-0 text-sm text-[var(--cor-negativo-texto)]">
        {mensagemDoErro(notas.error)}
      </p>
    )
  } else if (notas.data === undefined) {
    conteudo = <Esqueleto />
  } else if (notas.data.length === 0) {
    conteudo = (
      <p className="card m-0 text-sm text-[var(--cor-mutado)]">
        {filtrando ? 'Nenhuma nota encontrada para esse filtro.' : 'Nenhuma nota ainda. Crie a primeira.'}
      </p>
    )
  } else {
    conteudo = (
      <ul className={`${grade} transition-opacity duration-200 motion-reduce:transition-none ${notas.isPlaceholderData ? 'opacity-60' : ''}`}>
        {notas.data.map((n, i) => (
          <CartaoNota
            key={n.id}
            nota={{ ...n, fixada: fixadaAgora(n) }}
            categoria={lista.find((c) => c.id === n.categoriaId)}
            aoFixar={(nota) => fixar.mutate({ id: nota.id, fixada: !nota.fixada })}
            indice={i}
          />
        ))}
      </ul>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-[28px] font-bold tracking-tight">Notas</h1>
        <button
          type="button"
          disabled={criar.isPending}
          onClick={novaNota}
          className={`min-h-11 cursor-pointer rounded-full bg-[var(--cor-principal)] px-5 text-sm font-semibold text-[var(--cor-sobre-principal)] transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${foco}`}
        >
          Nova nota
        </button>
      </div>
      {criar.isError && (
        <p role="alert" className="m-0 text-xs text-[var(--cor-negativo-texto)]">
          {mensagemDoErro(criar.error)}
        </p>
      )}
      <div>
        <label htmlFor="busca-notas" className="sr-only">
          Buscar notas
        </label>
        <input
          id="busca-notas"
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar nas notas"
          autoComplete="off"
          className={`min-h-11 w-full rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-card)] px-3.5 text-base text-[var(--cor-texto)] transition-colors duration-200 placeholder:text-[var(--cor-mutado)] motion-reduce:transition-none ${foco}`}
        />
      </div>
      <FaixaCategorias categorias={lista} selecionada={efetiva} aoSelecionar={setSelecao} />
      {conteudo}
    </div>
  )
}
