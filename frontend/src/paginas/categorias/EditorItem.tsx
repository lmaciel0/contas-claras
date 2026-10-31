import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { endpoints } from '../../api/endpoints'
import type { CategoriaResponse, ItemRequest, ItemResponse } from '../../api/tipos'
import { CampoTexto, classeBotaoPrimario, MensagemDeErro } from '../../auth/CampoTexto'
import { mensagemDoErro } from '../../auth/mensagemDoErro'
import { lerValor } from '../../formato/moeda'
import { lerDia } from '../lancamentos/datas'
import { Moldura } from '../lancamentos/Moldura'
import { invalidarCadastro } from './invalidar'

interface Props {
  categoria: CategoriaResponse
  /** Item em edição; `undefined` para criar um novo na categoria. */
  existente?: ItemResponse
  aoFechar: () => void
}

const MENSAGEM_LIMITE = 'Limite inválido. Use até 2 casas decimais e um valor maior que zero.'

const classeCaixa = 'flex min-h-11 items-center justify-between gap-3 text-base font-medium'

/**
 * Janela para criar ou editar um item: nome, dia de vencimento, "É cartão de crédito" com limite opcional e,
 * na edição, arquivar. O limite é digitado em pt-BR (`4.000,00`) e vai à API como `"4000.00"`; desmarcar
 * "cartão" manda o limite como `null`.
 */
export function EditorItem({ categoria, existente, aoFechar }: Props) {
  const queryClient = useQueryClient()
  const [nome, setNome] = useState(existente?.nome ?? '')
  const [dia, setDia] = useState(existente?.diaVencimento == null ? '' : String(existente.diaVencimento))
  const [cartao, setCartao] = useState(existente?.cartao ?? false)
  const [limite, setLimite] = useState(existente?.limite == null ? '' : existente.limite.replace('.', ','))
  const [arquivado, setArquivado] = useState(existente?.arquivado ?? false)
  const [erro, setErro] = useState<string | null>(null)

  const salvar = useMutation({
    mutationFn: (req: ItemRequest) =>
      existente === undefined ? endpoints.itens.criar(categoria.id, req) : endpoints.itens.atualizar(existente.id, req),
    onSuccess: () => {
      void invalidarCadastro(queryClient)
      aoFechar()
    },
    onError: (falha) => setErro(mensagemDoErro(falha)),
  })

  function enviar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault()
    const nomeLimpo = nome.trim()
    const diaLido = lerDia(dia)
    if (nomeLimpo === '') {
      setErro('Informe o nome do item.')
      return
    }
    if (diaLido === undefined) {
      setErro('O dia de vencimento vai de 1 a 31.')
      return
    }
    let limiteLido: string | null = null
    if (cartao && limite.trim() !== '') {
      limiteLido = lerValor(limite)
      if (limiteLido === null) {
        setErro(MENSAGEM_LIMITE)
        return
      }
    }
    setErro(null)
    salvar.mutate({
      nome: nomeLimpo,
      diaVencimento: diaLido,
      cartao,
      limite: limiteLido,
      // O PUT exige `arquivado`; item novo nasce ativo e a API ignora o campo no POST.
      ...(existente === undefined ? {} : { arquivado }),
    })
  }

  return (
    <Moldura titulo={existente === undefined ? 'Novo item' : 'Editar item'} aoFechar={aoFechar}>
      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <p className="m-0 text-sm text-[var(--cor-mutado)]">{`Categoria ${categoria.nome}`}</p>
        <CampoTexto
          rotulo="Nome do item"
          value={nome}
          maxLength={120}
          autoComplete="off"
          onChange={(evento) => {
            setNome(evento.target.value)
            setErro(null)
          }}
        />
        <CampoTexto
          rotulo="Dia de vencimento (opcional)"
          inputMode="numeric"
          autoComplete="off"
          maxLength={2}
          value={dia}
          onChange={(evento) => {
            setDia(evento.target.value)
            setErro(null)
          }}
        />
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-3">
          <label className={classeCaixa}>
            <span>É cartão de crédito</span>
            <input
              type="checkbox"
              checked={cartao}
              onChange={(evento) => setCartao(evento.target.checked)}
              className="size-6 accent-[var(--cor-principal)]"
            />
          </label>
          {cartao && (
            <div className="flex flex-col gap-1.5">
              <CampoTexto
                rotulo="Limite"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0,00"
                aria-describedby="ajuda-limite"
                value={limite}
                onChange={(evento) => {
                  setLimite(evento.target.value)
                  setErro(null)
                }}
              />
              <p id="ajuda-limite" className="m-0 text-xs text-[var(--cor-mutado)]">
                Opcional. Sem limite, a tela Cartões mostra só a fatura.
              </p>
            </div>
          )}
        </div>
        {existente !== undefined && (
          <div className="flex flex-col gap-1 rounded-2xl bg-white p-3">
            <label className={classeCaixa}>
              <span>Arquivar este item</span>
              <input
                type="checkbox"
                checked={arquivado}
                onChange={(evento) => setArquivado(evento.target.checked)}
                className="size-6 accent-[var(--cor-principal)]"
              />
            </label>
            <p className="m-0 text-xs text-[var(--cor-mutado)]">
              Item arquivado sai das listas de escolha e dos cartões; os lançamentos antigos continuam.
            </p>
          </div>
        )}
        <MensagemDeErro texto={erro} />
        <button type="submit" disabled={salvar.isPending} className={classeBotaoPrimario}>
          {salvar.isPending ? 'Salvando…' : 'Salvar'}
        </button>
      </form>
    </Moldura>
  )
}
