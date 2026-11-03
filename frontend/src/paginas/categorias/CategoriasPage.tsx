import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { endpoints } from '../../api/endpoints'
import type { CategoriaResponse, ItemResponse, TipoCategoria } from '../../api/tipos'
import { mensagemDoErro } from '../../auth/mensagemDoErro'
import { Carregando } from '../../componentes/Carregando'
import { CabecalhoCategorias } from './CabecalhoCategorias'
import { EditorCategoria } from './EditorCategoria'
import { EditorItem } from './EditorItem'
import { invalidarCadastro } from './invalidar'
import { LinhaCategoria } from './LinhaCategoria'
import { LinhaSubcategoria } from './LinhaSubcategoria'
import { PaginacaoTabela } from './PaginacaoTabela'

type EditorAberto =
  | { alvo: 'categoria'; tipo: TipoCategoria; existente?: CategoriaResponse }
  | { alvo: 'item'; categoria: CategoriaResponse; existente?: ItemResponse }

export function CategoriasPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [tipoAtivo, setTipoAtivo] = useState<TipoCategoria>('DESPESA')
  const [termoBusca, setTermoBusca] = useState('')
  const [todosExpandidos, setTodosExpandidos] = useState(true)
  const [linhasPorPagina, setLinhasPorPagina] = useState(50)
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [editor, setEditor] = useState<EditorAberto | null>(null)

  const consulta = useQuery({
    queryKey: ['categorias'],
    queryFn: endpoints.categorias.listar,
    placeholderData: keepPreviousData,
  })

  const alternarArquivamentoItem = useMutation({
    mutationFn: ({ item }: { item: ItemResponse }) =>
      endpoints.itens.atualizar(item.id, {
        nome: item.nome,
        diaVencimento: item.diaVencimento,
        cartao: item.cartao,
        limite: item.limite,
        titular: item.titular,
        arquivado: !item.arquivado,
      }),
    onSuccess: () => {
      void invalidarCadastro(queryClient)
    },
  })

  // Filtra as categorias pelo tipo ativo e pelo termo de busca (no nome da categoria ou subcategorias)
  const categoriasFiltradas = useMemo(() => {
    if (!consulta.data) return []
    const doTipo = consulta.data
      .filter((c) => c.tipo === tipoAtivo)
      .sort((a, b) => a.ordem - b.ordem)

    const busca = termoBusca.trim().toLowerCase()
    if (!busca) return doTipo

    return doTipo.filter((c) => {
      const matchCategoria = c.nome.toLowerCase().includes(busca)
      const matchSubcategoria = c.itens.some((i) => i.nome.toLowerCase().includes(busca))
      return matchCategoria || matchSubcategoria
    })
  }, [consulta.data, tipoAtivo, termoBusca])

  // Paginação
  const categoriasPaginadas = useMemo(() => {
    const inicio = (paginaAtual - 1) * linhasPorPagina
    return categoriasFiltradas.slice(inicio, inicio + linhasPorPagina)
  }, [categoriasFiltradas, paginaAtual, linhasPorPagina])

  let conteudo: ReactNode

  if (consulta.isPending) {
    conteudo = <Carregando texto="Carregando as categorias…" />
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
    conteudo = (
      <div className="card overflow-hidden p-0 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[580px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--cor-linha)] bg-[var(--cor-fundo)]/70 text-xs font-semibold text-[var(--cor-mutado)] select-none">
                <th scope="col" className="py-3 pr-4 pl-6">
                  Nome
                </th>
                <th scope="col" className="py-3 px-4 text-center">
                  Ícone
                </th>
                <th scope="col" className="py-3 px-4 text-center">
                  Cor
                </th>
                <th scope="col" className="py-3 pr-6 pl-4 text-right">
                  Ações
                </th>
              </tr>
            </thead>
            {categoriasPaginadas.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-[var(--cor-mutado)]">
                    {termoBusca
                      ? 'Nenhuma categoria ou subcategoria encontrada para a busca.'
                      : tipoAtivo === 'DESPESA'
                        ? 'Nenhuma categoria de despesa cadastrada ainda.'
                        : 'Nenhuma categoria de receita cadastrada ainda.'}
                  </td>
                </tr>
              </tbody>
            ) : (
              categoriasPaginadas.map((cat) => {
                const itensExibidos = termoBusca.trim()
                  ? cat.itens.filter(
                      (i) =>
                        i.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
                        cat.nome.toLowerCase().includes(termoBusca.toLowerCase()),
                    )
                  : cat.itens

                return (
                  <tbody key={cat.id}>
                    <LinhaCategoria
                      categoria={cat}
                      aoEditar={() => setEditor({ alvo: 'categoria', tipo: cat.tipo, existente: cat })}
                      aoRelatorios={() => navigate(`/relatorios?categoriaId=${cat.id}`)}
                      aoArquivar={() => setEditor({ alvo: 'categoria', tipo: cat.tipo, existente: cat })}
                      aoAdicionarSubcategoria={() => setEditor({ alvo: 'item', categoria: cat })}
                    />

                    {todosExpandidos &&
                      itensExibidos
                        .filter(() => {
                          if (cat.tipo === 'RECEITA' && cat.itens.length === 1 && cat.itens[0]?.nome === cat.nome) {
                            return false
                          }
                          return true
                        })
                        .map((item) => (
                          <LinhaSubcategoria
                            key={item.id}
                            item={item}
                            corPai={cat.cor}
                            aoEditar={() => setEditor({ alvo: 'item', categoria: cat, existente: item })}
                            aoRelatorios={() => navigate(`/relatorios?categoriaId=${cat.id}&itemId=${item.id}`)}
                            aoArquivar={() =>
                              alternarArquivamentoItem.mutate({ item })
                            }
                          />
                        ))}
                  </tbody>
                )
              })
            )}
          </table>
        </div>

        <PaginacaoTabela
          totalItens={categoriasFiltradas.length}
          linhasPorPagina={linhasPorPagina}
          paginaAtual={paginaAtual}
          aoMudarPagina={setPaginaAtual}
          aoMudarLinhasPorPagina={setLinhasPorPagina}
        />
      </div>
    )
  }

  const fechar = () => setEditor(null)

  return (
    <>
      <div className="mb-3 sr-only md:not-sr-only md:mb-5">
        <h1 className="m-0 text-[28px] font-bold tracking-tight">Categorias</h1>
        <p className="m-0 mt-1 text-[13px] text-[var(--cor-mutado)]">
          Organize categorias e subcategorias, e personalize ícones, cores e vínculos financeiros.
        </p>
      </div>

      <CabecalhoCategorias
        tipoAtivo={tipoAtivo}
        aoMudarTipo={(tipo) => {
          setTipoAtivo(tipo)
          setPaginaAtual(1)
        }}
        aoNovaCategoria={() => setEditor({ alvo: 'categoria', tipo: tipoAtivo })}
        termoBusca={termoBusca}
        aoMudarBusca={(busca) => {
          setTermoBusca(busca)
          setPaginaAtual(1)
        }}
        todosExpandidos={todosExpandidos}
        aoAlternarExpansao={() => setTodosExpandidos((prev) => !prev)}
      />

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
