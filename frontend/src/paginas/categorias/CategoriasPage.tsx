import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { endpoints } from '../../api/endpoints'
import type { CategoriaResponse, ItemResponse, TipoCategoria } from '../../api/tipos'
import { mensagemDoErro } from '../../auth/mensagemDoErro'
import { formatarMoeda } from '../../formato/moeda'
import { EditorCategoria } from './EditorCategoria'
import { EditorItem } from './EditorItem'
import { invalidarCadastro } from './invalidar'

type EditorAberto =
  | { alvo: 'categoria'; tipo: TipoCategoria; existente?: CategoriaResponse }
  | { alvo: 'item'; categoria: CategoriaResponse; existente?: ItemResponse }

const classeFoco =
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--cor-principal)]'
const classeBotaoTexto = `min-h-11 rounded-full px-3 text-sm font-semibold text-[var(--cor-principal)] ${classeFoco}`
const classeSeta = `grid size-11 place-items-center rounded-full text-lg leading-none text-[var(--cor-principal)] hover:bg-[var(--cor-fundo)] disabled:opacity-30 disabled:hover:bg-transparent ${classeFoco}`

/**
 * Lista completa de ids depois de mover `id` uma posição dentro do seu tipo (a API exige todos os ids, de receitas
 * e despesas juntos). Troca de lugar com a vizinha do mesmo tipo; `null` se já estiver na ponta.
 */
function idsDepoisDeMover(todas: CategoriaResponse[], id: number, passo: -1 | 1): number[] | null {
  const ids = todas.map((c) => c.id)
  const de = todas.findIndex((c) => c.id === id)
  const tipo = todas[de]?.tipo
  let para = de + passo
  while (para >= 0 && para < todas.length && todas[para]?.tipo !== tipo) {
    para += passo
  }
  const idDe = ids[de]
  const idPara = ids[para]
  if (idDe === undefined || idPara === undefined) {
    return null
  }
  ids[de] = idPara
  ids[para] = idDe
  return ids
}

function DetalhesDoItem({ item }: { item: ItemResponse }) {
  const partes: string[] = []
  if (item.diaVencimento !== null) {
    partes.push(`dia ${item.diaVencimento}`)
  }
  if (item.cartao) {
    partes.push('Cartão de crédito')
    partes.push(item.limite === null ? 'sem limite' : `limite ${formatarMoeda(item.limite)}`)
  }
  if (item.arquivado) {
    partes.push('Arquivado')
  }
  return partes.length === 0 ? null : (
    <span className="text-xs text-[var(--cor-mutado)]">{partes.join(' · ')}</span>
  )
}

interface CardCategoriaProps {
  categoria: CategoriaResponse
  podeSubir: boolean
  podeDescer: boolean
  ocupado: boolean
  aoMover: (passo: -1 | 1) => void
  aoEditarCategoria: () => void
  aoEditarItem: (item: ItemResponse | undefined) => void
}

function CardCategoria({
  categoria,
  podeSubir,
  podeDescer,
  ocupado,
  aoMover,
  aoEditarCategoria,
  aoEditarItem,
}: CardCategoriaProps) {
  const idTitulo = useId()
  return (
    <section aria-labelledby={idTitulo} className="card flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <h3 id={idTitulo} className="m-0 min-w-0 flex-1 truncate text-[15px] font-bold">
          {categoria.nome}
        </h3>
        <button
          type="button"
          aria-label={`Subir categoria ${categoria.nome}`}
          disabled={!podeSubir || ocupado}
          onClick={() => aoMover(-1)}
          className={classeSeta}
        >
          <span aria-hidden="true">↑</span>
        </button>
        <button
          type="button"
          aria-label={`Descer categoria ${categoria.nome}`}
          disabled={!podeDescer || ocupado}
          onClick={() => aoMover(1)}
          className={classeSeta}
        >
          <span aria-hidden="true">↓</span>
        </button>
        <button
          type="button"
          aria-label={`Editar categoria ${categoria.nome}`}
          onClick={aoEditarCategoria}
          className={classeBotaoTexto}
        >
          Editar
        </button>
      </div>
      {categoria.itens.length === 0 ? (
        <p className="m-0 text-sm text-[var(--cor-mutado)]">Nenhum item ainda.</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {categoria.itens.map((item) => (
            <li
              key={item.id}
              className={`flex items-center justify-between gap-2 border-t border-[var(--cor-linha)] first:border-t-0 ${item.arquivado ? 'opacity-70' : ''}`}
            >
              <div className="flex min-w-0 flex-col py-2">
                <span className="truncate text-[13px] font-medium">{item.nome}</span>
                <DetalhesDoItem item={item} />
              </div>
              <button
                type="button"
                aria-label={`Editar item ${item.nome}`}
                onClick={() => aoEditarItem(item)}
                className={classeBotaoTexto}
              >
                Editar
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => aoEditarItem(undefined)}
        className={`${classeBotaoTexto} self-start`}
      >
        + Novo item
      </button>
    </section>
  )
}

interface SecaoProps {
  titulo: string
  tipo: TipoCategoria
  /** Todas as categorias, na ordem da API, para montar a lista completa de ids ao mover. */
  todas: CategoriaResponse[]
  ocupado: boolean
  aoMover: (id: number, passo: -1 | 1) => void
  aoAbrir: (editor: EditorAberto) => void
}

function Secao({ titulo, tipo, todas, ocupado, aoMover, aoAbrir }: SecaoProps) {
  const idTitulo = useId()
  const doTipo = todas.filter((c) => c.tipo === tipo)
  return (
    <section aria-labelledby={idTitulo} className="mb-5">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 id={idTitulo} className="m-0 text-lg font-bold">
          {titulo}
        </h2>
        <button type="button" onClick={() => aoAbrir({ alvo: 'categoria', tipo })} className={classeBotaoTexto}>
          + Nova categoria
        </button>
      </div>
      {doTipo.length === 0 ? (
        <p className="card m-0 text-sm text-[var(--cor-mutado)]">Nenhuma categoria aqui ainda.</p>
      ) : (
        <div className="grid items-start gap-2.5 md:grid-cols-2 md:gap-3.5">
          {doTipo.map((categoria, indice) => (
            <CardCategoria
              key={categoria.id}
              categoria={categoria}
              podeSubir={indice > 0}
              podeDescer={indice < doTipo.length - 1}
              ocupado={ocupado}
              aoMover={(passo) => aoMover(categoria.id, passo)}
              aoEditarCategoria={() => aoAbrir({ alvo: 'categoria', tipo, existente: categoria })}
              aoEditarItem={(item) =>
                aoAbrir(item === undefined ? { alvo: 'item', categoria } : { alvo: 'item', categoria, existente: item })
              }
            />
          ))}
        </div>
      )}
    </section>
  )
}

/**
 * `/categorias`: categorias de receita e de despesa com seus itens. Criar e renomear categoria, ordenar com ↑/↓
 * (sem arrastar), apagar (a API recusa se houver lançamentos) e editar item (vencimento, cartão, limite, arquivar).
 */
export function CategoriasPage() {
  const queryClient = useQueryClient()
  const [editor, setEditor] = useState<EditorAberto | null>(null)
  const consulta = useQuery({ queryKey: ['categorias'], queryFn: endpoints.categorias.listar })

  const reordenar = useMutation({
    mutationFn: (ids: number[]) => endpoints.categorias.reordenar(ids),
    onSuccess: (_vazio, ids) => {
      // A nova ordem aparece já; a revalidação traz a do servidor logo depois.
      queryClient.setQueryData<CategoriaResponse[]>(['categorias'], (antigas) =>
        antigas?.map((c) => ({ ...c, ordem: ids.indexOf(c.id) + 1 })),
      )
      void invalidarCadastro(queryClient)
    },
  })

  const titulo = (
    <div className="mb-3 sr-only md:not-sr-only md:mb-5">
      <h1 className="m-0 text-[28px] font-bold tracking-tight">Categorias</h1>
      <p className="m-0 mt-1 text-[13px] text-[var(--cor-mutado)]">
        Organize categorias e itens, e marque quais itens são cartões de crédito.
      </p>
    </div>
  )

  let conteudo: ReactNode
  if (consulta.isPending) {
    conteudo = (
      <p role="status" className="m-0 text-sm text-[var(--cor-mutado)]">
        Carregando as categorias…
      </p>
    )
  } else if (consulta.isError) {
    conteudo = (
      <div role="alert" className="card flex flex-wrap items-center gap-3 text-sm">
        <p className="m-0">{mensagemDoErro(consulta.error)}</p>
        <button
          type="button"
          onClick={() => void consulta.refetch()}
          className="rounded-full bg-[var(--cor-principal)] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
        >
          Tentar de novo
        </button>
      </div>
    )
  } else {
    const todas = [...consulta.data].sort((a, b) => a.ordem - b.ordem)
    const mover = (id: number, passo: -1 | 1) => {
      const ids = idsDepoisDeMover(todas, id, passo)
      if (ids !== null) {
        reordenar.mutate(ids)
      }
    }
    conteudo = (
      <>
        <Secao titulo="Receitas" tipo="RECEITA" todas={todas} ocupado={reordenar.isPending} aoMover={mover} aoAbrir={setEditor} />
        <Secao titulo="Despesas" tipo="DESPESA" todas={todas} ocupado={reordenar.isPending} aoMover={mover} aoAbrir={setEditor} />
      </>
    )
  }

  const fechar = () => setEditor(null)

  return (
    <>
      {titulo}
      {reordenar.isError && (
        <p role="alert" className="mb-3 rounded-xl border border-[var(--cor-negativo)] bg-[#fdecec] px-3 py-2 text-sm">
          {mensagemDoErro(reordenar.error)}
        </p>
      )}
      {conteudo}
      {editor?.alvo === 'categoria' && (
        <EditorCategoria
          tipo={editor.tipo}
          {...(editor.existente === undefined ? {} : { existente: editor.existente })}
          aoFechar={fechar}
        />
      )}
      {editor?.alvo === 'item' && (
        <EditorItem
          categoria={editor.categoria}
          {...(editor.existente === undefined ? {} : { existente: editor.existente })}
          aoFechar={fechar}
        />
      )}
    </>
  )
}
