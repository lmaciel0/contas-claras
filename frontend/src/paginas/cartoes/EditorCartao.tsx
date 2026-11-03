import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useContext, useState } from 'react'
import type { SubmitEvent } from 'react'
import { endpoints } from '../../api/endpoints'
import type { CartaoResponse, ItemRequest } from '../../api/tipos'
import { CampoTexto, classeBotaoPrimario, MensagemDeErro } from '../../auth/CampoTexto'
import { mensagemDoErro } from '../../auth/mensagemDoErro'
import { AuthContexto } from '../../auth/useAuth'
import { lerValor } from '../../formato/moeda'
import { lerDia } from '../lancamentos/datas'
import { Moldura } from '../lancamentos/Moldura'

interface Props {
  aoFechar: () => void
  titularesSugeridos?: string[]
  cartaoParaEditar?: CartaoResponse
}

export function EditorCartao({ aoFechar, titularesSugeridos = [], cartaoParaEditar }: Props) {
  const queryClient = useQueryClient()
  const auth = useContext(AuthContexto)
  const primeiroNome = auth?.usuario?.nome?.trim().split(/\s+/)[0] ?? ''

  // Sugestões dinâmicas: primeiro nome do usuário autenticado + titulares cadastrados nos cartões
  const sugestoes = Array.from(
    new Set([primeiroNome, ...titularesSugeridos].filter((s): s is string => Boolean(s && s.trim())))
  )

  const [nome, setNome] = useState(cartaoParaEditar?.nome ?? '')
  const [titular, setTitular] = useState(cartaoParaEditar?.titular ?? primeiroNome)
  const [dia, setDia] = useState(
    cartaoParaEditar?.diaVencimento !== null && cartaoParaEditar?.diaVencimento !== undefined
      ? String(cartaoParaEditar.diaVencimento)
      : ''
  )
  const [limite, setLimite] = useState(
    cartaoParaEditar?.limite !== null && cartaoParaEditar?.limite !== undefined
      ? cartaoParaEditar.limite
      : ''
  )
  const [categoriaId, setCategoriaId] = useState<number | null>(cartaoParaEditar?.categoriaId ?? null)
  const [criarCategoriaTitular, setCriarCategoriaTitular] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const categoriasConsulta = useQuery({
    queryKey: ['categorias'],
    queryFn: endpoints.categorias.listar,
  })

  const todasCategoriasDespesa = (categoriasConsulta.data ?? []).filter((c) => c.tipo === 'DESPESA')

  // Identifica a categoria atual do cartão sendo editado se não estiver no state
  const categoriaAtualCartao = cartaoParaEditar
    ? todasCategoriasDespesa.find((c) => c.itens.some((i) => i.id === cartaoParaEditar.itemId))
    : undefined

  // Categorias elegíveis para cartões (Opção 1):
  // 1. Categorias que já possuem cartões cadastrados
  // 2. Categorias dedicadas a cartões (nome inclui "cart" ou "crédit")
  // 3. Categoria correspondente ao titular digitado
  // 4. Categoria atual do cartão (se estiver editando)
  const categoriasCartao = todasCategoriasDespesa.filter((c) => {
    if (categoriaAtualCartao && c.id === categoriaAtualCartao.id) return true
    if (c.itens.some((i) => i.cartao)) return true
    const n = c.nome.toLowerCase()
    if (n.includes('cart') || n.includes('crédit')) return true
    if (titular.trim() && n === titular.trim().toLowerCase()) return true
    return false
  })

  // Se por algum motivo nenhuma categoria específica for encontrada, usa a padrão de despesas
  const listaCategoriasExibidas = categoriasCartao.length > 0 ? categoriasCartao : todasCategoriasDespesa

  const categoriaPadrao =
    categoriaAtualCartao?.id ??
    listaCategoriasExibidas.find((c) => c.nome.toLowerCase().includes('cart'))?.id ??
    listaCategoriasExibidas[0]?.id

  const titularLimpo = titular.trim()
  const categoriaTitularJaExiste =
    titularLimpo !== '' &&
    todasCategoriasDespesa.some((c) => c.nome.toLowerCase() === titularLimpo.toLowerCase())

  const salvarCriacao = useMutation({
    mutationFn: async ({ catId, req, criarCat }: { catId?: number; req: ItemRequest; criarCat: boolean }) => {
      let destinoId = catId
      if (criarCat && titularLimpo) {
        const novaCat = await endpoints.categorias.criar({
          nome: titularLimpo,
          tipo: 'DESPESA',
          icone: 'outros',
          cor: '#f43f5e',
        })
        destinoId = novaCat.id
      }
      if (destinoId === undefined) {
        throw new Error('Selecione ou crie uma categoria para o cartão.')
      }
      return endpoints.itens.criar(destinoId, req)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cartoes'] })
      void queryClient.invalidateQueries({ queryKey: ['categorias'] })
      void queryClient.invalidateQueries({ queryKey: ['lancamentos'] })
      aoFechar()
    },
    onError: (falha) => setErro(mensagemDoErro(falha)),
  })

  const salvarEdicao = useMutation({
    mutationFn: ({ itemId, req }: { itemId: number; req: ItemRequest }) =>
      endpoints.itens.atualizar(itemId, req),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cartoes'] })
      void queryClient.invalidateQueries({ queryKey: ['categorias'] })
      void queryClient.invalidateQueries({ queryKey: ['lancamentos'] })
      aoFechar()
    },
    onError: (falha) => setErro(mensagemDoErro(falha)),
  })

  const salvando = salvarCriacao.isPending || salvarEdicao.isPending

  function enviar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault()
    const nomeLimpo = nome.trim()
    const diaLido = dia === '' ? undefined : lerDia(dia)
    const catDestino = categoriaId ?? categoriaPadrao

    if (nomeLimpo === '') {
      setErro('Informe o nome do cartão.')
      return
    }
    if (dia !== '' && diaLido === undefined) {
      setErro('O dia de vencimento vai de 1 a 31.')
      return
    }
    if (!cartaoParaEditar && !criarCategoriaTitular && catDestino === undefined) {
      setErro('Cadastre pelo menos uma categoria antes de criar um cartão.')
      return
    }

    let limiteLido: string | null = null
    if (limite.trim() !== '') {
      limiteLido = lerValor(limite)
      if (limiteLido === null) {
        setErro('Limite inválido. Use até 2 casas decimais e um valor maior que zero.')
        return
      }
    }

    const titularParaSalvar = titularLimpo || primeiroNome || 'Lucas'
    const reqItem: ItemRequest = {
      nome: nomeLimpo,
      diaVencimento: diaLido ?? null,
      cartao: true,
      limite: limiteLido,
      titular: titularParaSalvar,
      ...(cartaoParaEditar ? { arquivado: false } : {}),
    }

    if (cartaoParaEditar) {
      salvarEdicao.mutate({
        itemId: cartaoParaEditar.itemId,
        req: reqItem,
      })
    } else {
      salvarCriacao.mutate({
        catId: catDestino,
        req: reqItem,
        criarCat: criarCategoriaTitular,
      })
    }
  }

  const tituloModal = cartaoParaEditar
    ? cartaoParaEditar.limite === null
      ? 'Cadastrar limite'
      : 'Editar cartão'
    : 'Novo cartão'

  return (
    <Moldura titulo={tituloModal} aoFechar={aoFechar}>
      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <CampoTexto
          rotulo="Nome do cartão"
          placeholder="Ex.: Nubank, Inter, XP"
          value={nome}
          maxLength={120}
          autoComplete="off"
          autoFocus
          onChange={(evento) => {
            setNome(evento.target.value)
            setErro(null)
          }}
        />
        <div className="flex flex-col gap-1.5">
          <CampoTexto
            rotulo="Titular do cartão"
            placeholder="Nome do titular (opcional)"
            value={titular}
            maxLength={60}
            autoComplete="off"
            onChange={(evento) => {
              setTitular(evento.target.value)
              setErro(null)
            }}
          />
          {sugestoes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {sugestoes.map((sugestao) => (
                <button
                  key={sugestao}
                  type="button"
                  onClick={() => {
                    setTitular(sugestao)
                    setErro(null)
                  }}
                  className="cursor-pointer rounded-lg border border-[var(--cor-linha)] bg-[var(--cor-fundo)] px-2.5 py-1 text-xs font-semibold text-[var(--cor-mutado)] transition-colors hover:border-[var(--cor-principal)] hover:text-[var(--cor-principal)]"
                >
                  {sugestao}
                </button>
              ))}
            </div>
          )}
        </div>
        <CampoTexto
          rotulo="Dia de vencimento da fatura (opcional)"
          inputMode="numeric"
          autoComplete="off"
          maxLength={2}
          placeholder="Ex.: 10"
          value={dia}
          onChange={(evento) => {
            setDia(evento.target.value)
            setErro(null)
          }}
        />
        <CampoTexto
          rotulo="Limite total (opcional)"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          value={limite}
          onChange={(evento) => {
            setLimite(evento.target.value)
            setErro(null)
          }}
        />

        {/* Seleção de categoria (somente ao criar novo cartão) */}
        {!cartaoParaEditar && (
          <div className="flex flex-col gap-2 rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-fundo)]/50 p-3">
            {/* Opção 1: Criar categoria com nome do titular se ainda não existir */}
            {titularLimpo !== '' && !categoriaTitularJaExiste && (
              <label className="flex cursor-pointer items-start gap-2.5 text-xs text-[var(--cor-texto)]">
                <input
                  type="checkbox"
                  checked={criarCategoriaTitular}
                  onChange={(e) => setCriarCategoriaTitular(e.target.checked)}
                  className="mt-0.5 size-4 accent-[var(--cor-principal)] cursor-pointer"
                />
                <div>
                  <span className="font-semibold">
                    Criar categoria &quot;{titularLimpo}&quot; no orçamento
                  </span>
                  <p className="m-0 mt-0.5 text-[11px] text-[var(--cor-mutado)]">
                    Agrupa todos os cartões e despesas de {titularLimpo} em uma categoria própria.
                  </p>
                </div>
              </label>
            )}

            {!criarCategoriaTitular && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="categoria-cartao" className="text-xs font-medium text-[var(--cor-mutado)]">
                  Categoria no orçamento
                </label>
                <select
                  id="categoria-cartao"
                  value={categoriaId ?? categoriaPadrao ?? ''}
                  onChange={(e) => setCategoriaId(Number(e.target.value))}
                  className="min-h-11 rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-card)] px-3 text-sm text-[var(--cor-texto)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
                >
                  {listaCategoriasExibidas.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
                <p className="m-0 text-xs text-[var(--cor-mutado)]">
                  Onde as despesas e faturas deste cartão serão agrupadas no seu orçamento.
                </p>
              </div>
            )}
          </div>
        )}

        <MensagemDeErro texto={erro} />
        <button type="submit" disabled={salvando} className={classeBotaoPrimario}>
          {salvando
            ? 'Salvando…'
            : cartaoParaEditar
              ? 'Salvar alterações'
              : 'Salvar cartão'}
        </button>
      </form>
    </Moldura>
  )
}
