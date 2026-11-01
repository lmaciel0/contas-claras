import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { endpoints } from '../../api/endpoints'
import type { CategoriaResponse, ItemResponse } from '../../api/tipos'
import { mensagemDoErro } from '../../auth/mensagemDoErro'
import { CampoTexto, classeBotaoPrimario, MensagemDeErro } from '../../auth/CampoTexto'
import { CampoSelect } from './Campos'
import { lerDia } from './datas'

interface Props {
  categoriaId: number | null
  itens: ItemResponse[]
  itemId: number | null
  rotulo?: string
  rotuloVazio?: string
  textoCriar?: string
  rotuloNovo?: string
  /** Trava a escolha (edição: trocar o item criaria outro lançamento, não moveria este). */
  desabilitado?: boolean
  aoEscolher: (item: ItemResponse | null) => void
}

/**
 * Lista de itens da categoria (sem os arquivados, exceto o que já está escolhido) e o "+ novo item", que cria o
 * item com nome e dia de vencimento opcional e já o deixa selecionado.
 */
export function SeletorItem({
  categoriaId,
  itens,
  itemId,
  rotulo = 'Item',
  rotuloVazio = 'Escolha o item',
  textoCriar = '+ novo item',
  rotuloNovo = 'Nome do novo item',
  desabilitado = false,
  aoEscolher,
}: Props) {
  const queryClient = useQueryClient()
  const [criando, setCriando] = useState(false)
  const [nome, setNome] = useState('')
  const [dia, setDia] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const visiveis = itens.filter((item) => !item.arquivado || item.id === itemId)

  const criar = useMutation({
    mutationFn: (req: { categoria: number; nome: string; diaVencimento: number | null }) =>
      endpoints.itens.criar(req.categoria, {
        nome: req.nome,
        diaVencimento: req.diaVencimento,
        cartao: false,
        limite: null,
      }),
    onSuccess: (novo, req) => {
      // O item aparece na lista na hora; a revalidação traz a versão do servidor depois.
      queryClient.setQueryData<CategoriaResponse[]>(['categorias'], (antigas) =>
        antigas?.map((c) => (c.id === req.categoria ? { ...c, itens: [...c.itens, novo] } : c)),
      )
      void queryClient.invalidateQueries({ queryKey: ['categorias'] })
      aoEscolher(novo)
      setCriando(false)
      setNome('')
      setDia('')
      setErro(null)
    },
    onError: (falha) => setErro(mensagemDoErro(falha)),
  })

  function confirmar() {
    const nomeLimpo = nome.trim()
    const diaLido = lerDia(dia)
    if (categoriaId === null) {
      return
    }
    if (nomeLimpo === '') {
      setErro('Informe o nome do item.')
    } else if (diaLido === undefined) {
      setErro('O dia de vencimento vai de 1 a 31.')
    } else {
      setErro(null)
      criar.mutate({ categoria: categoriaId, nome: nomeLimpo, diaVencimento: diaLido })
    }
  }

  function cancelar() {
    setCriando(false)
    setNome('')
    setDia('')
    setErro(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <CampoSelect
        rotulo={rotulo}
        value={itemId === null ? '' : String(itemId)}
        disabled={desabilitado}
        onChange={(evento) => aoEscolher(itens.find((i) => String(i.id) === evento.target.value) ?? null)}
      >
        <option value="">{rotuloVazio}</option>
        {visiveis.map((item) => (
          <option key={item.id} value={item.id}>
            {item.nome}
            {item.titular ? ` (${item.titular})` : ''}
          </option>
        ))}
      </CampoSelect>
      {!desabilitado && !criando && categoriaId !== null && (
        <button
          type="button"
          onClick={() => setCriando(true)}
          className="min-h-11 self-start rounded-full px-3 text-sm font-semibold text-[var(--cor-principal)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--cor-principal)]"
        >
          {textoCriar}
        </button>
      )}
      {criando && (
        <div className="flex flex-col gap-3 rounded-2xl bg-[var(--cor-fundo)] p-3">
          <CampoTexto
            rotulo={rotuloNovo}
            value={nome}
            maxLength={80}
            autoFocus
            onChange={(evento) => setNome(evento.target.value)}
          />
          <CampoTexto
            rotulo="Dia de vencimento (opcional)"
            inputMode="numeric"
            value={dia}
            maxLength={2}
            onChange={(evento) => setDia(evento.target.value)}
          />
          <MensagemDeErro texto={erro} />
          <div className="flex gap-2">
            <button type="button" onClick={confirmar} disabled={criar.isPending} className={classeBotaoPrimario}>
              {criar.isPending ? 'Criando…' : 'Criar item'}
            </button>
            <button
              type="button"
              onClick={cancelar}
              className="min-h-11 rounded-full px-4 text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--cor-principal)]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
