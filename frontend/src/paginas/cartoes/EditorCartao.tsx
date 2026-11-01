import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { endpoints } from '../../api/endpoints'
import type { ItemRequest } from '../../api/tipos'
import { CampoTexto, classeBotaoPrimario, MensagemDeErro } from '../../auth/CampoTexto'
import { mensagemDoErro } from '../../auth/mensagemDoErro'
import { lerValor } from '../../formato/moeda'
import { lerDia } from '../lancamentos/datas'
import { Moldura } from '../lancamentos/Moldura'

interface Props {
  aoFechar: () => void
}

export function EditorCartao({ aoFechar }: Props) {
  const queryClient = useQueryClient()
  const [nome, setNome] = useState('')
  const [titular, setTitular] = useState('Lucas')
  const [dia, setDia] = useState('')
  const [limite, setLimite] = useState('')
  const [categoriaId, setCategoriaId] = useState<number | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const categoriasConsulta = useQuery({
    queryKey: ['categorias'],
    queryFn: endpoints.categorias.listar,
  })

  const categoriasDespesa = (categoriasConsulta.data ?? []).filter((c) => c.tipo === 'DESPESA')
  const categoriaPadrao =
    categoriasDespesa.find((c) => c.nome.toLowerCase().includes('cart'))?.id ??
    categoriasDespesa[0]?.id

  const salvar = useMutation({
    mutationFn: ({ catId, req }: { catId: number; req: ItemRequest }) =>
      endpoints.itens.criar(catId, req),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cartoes'] })
      void queryClient.invalidateQueries({ queryKey: ['categorias'] })
      void queryClient.invalidateQueries({ queryKey: ['lancamentos'] })
      aoFechar()
    },
    onError: (falha) => setErro(mensagemDoErro(falha)),
  })

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
    if (catDestino === undefined) {
      setErro('Cadastre pelo menos uma categoria de despesa antes de criar um cartão.')
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

    salvar.mutate({
      catId: catDestino,
      req: {
        nome: nomeLimpo,
        diaVencimento: diaLido ?? null,
        cartao: true,
        limite: limiteLido,
        titular: titular.trim() || 'Lucas',
      },
    })
  }

  return (
    <Moldura titulo="Novo cartão" aoFechar={aoFechar}>
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
            placeholder="Ex.: Lucas, Diana, Camila..."
            value={titular}
            maxLength={60}
            autoComplete="off"
            onChange={(evento) => {
              setTitular(evento.target.value)
              setErro(null)
            }}
          />
          <div className="flex flex-wrap gap-1.5">
            {['Lucas', 'Diana', 'Camila', 'Ana Célia'].map((sugestao) => (
              <button
                key={sugestao}
                type="button"
                onClick={() => setTitular(sugestao)}
                className="cursor-pointer rounded-lg border border-[var(--cor-linha)] bg-[var(--cor-fundo)] px-2.5 py-1 text-xs font-semibold text-[var(--cor-mutado)] transition-colors hover:border-[var(--cor-principal)] hover:text-[var(--cor-principal)]"
              >
                {sugestao}
              </button>
            ))}
          </div>
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
        {categoriasDespesa.length > 0 && (
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
              {categoriasDespesa.map((cat) => (
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
        <MensagemDeErro texto={erro} />
        <button type="submit" disabled={salvar.isPending} className={classeBotaoPrimario}>
          {salvar.isPending ? 'Salvando…' : 'Salvar cartão'}
        </button>
      </form>
    </Moldura>
  )
}
