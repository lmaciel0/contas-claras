import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { ReactNode, SubmitEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { endpoints } from '../../api/endpoints'
import type {
  CategoriaResponse,
  LancamentoResponse,
  SalvarLancamentoRequest,
  StatusLancamento,
  TipoCategoria,
} from '../../api/tipos'
import { CampoTexto, classeBotaoPrimario, MensagemDeErro } from '../../auth/CampoTexto'
import { mensagemDoErro } from '../../auth/mensagemDoErro'
import { lerValor } from '../../formato/moeda'
import type { MesAno } from '../../formato/mes'
import { rotuloMes } from '../../formato/mes'
import { useMesSelecionado } from '../../layout/useMesSelecionado'
import { CampoSelect, Segmentado } from './Campos'
import { chaveMes, isoParaBr, lerChaveMes, mesesEntre, vencimentoPadrao } from './datas'
import { invalidarLancamentos } from './invalidar'
import { Moldura } from './Moldura'
import { SeletorItem } from './SeletorItem'

const TIPOS = [
  { valor: 'DESPESA', rotulo: 'Despesa' },
  { valor: 'RECEITA', rotulo: 'Receita' },
] as const
const SITUACOES = [
  { valor: 'PREVISTO', rotulo: 'Previsto' },
  { valor: 'PAGO', rotulo: 'Pago' },
] as const

/** A API aceita repetir até 60 meses adiante. */
const MAXIMO_DE_REPETICOES = 60
const MENSAGEM_DECIMAIS = 'Use até 2 casas decimais.'

const paraTexto = (valorDaApi: string) => valorDaApi.replace('.', ',')

function mensagemDoValor(texto: string): string {
  if (texto.trim() === '') {
    return 'Informe o valor.'
  }
  if (/^0+([.,]0*)?$/.test(texto.trim())) {
    return 'O valor deve ser maior que zero.'
  }
  return MENSAGEM_DECIMAIS
}

interface FormularioProps {
  categorias: CategoriaResponse[]
  /** Lançamento em edição; `undefined` para um novo. */
  existente: LancamentoResponse | undefined
  /** Mês em foco, usado como mês de um lançamento novo. */
  mesInicial: MesAno
  aoFechar: () => void
  aoSalvar: (mes: MesAno) => void
}

function Formulario({ categorias, existente, mesInicial, aoFechar, aoSalvar }: FormularioProps) {
  const queryClient = useQueryClient()
  const editando = existente !== undefined
  const inicio: MesAno = existente === undefined ? mesInicial : { ano: existente.ano, mes: existente.mes }

  const [tipo, setTipo] = useState<TipoCategoria>(existente?.tipo ?? 'DESPESA')
  const [categoriaId, setCategoriaId] = useState<number | null>(
    existente?.categoriaId ?? categorias.find((c) => c.tipo === 'DESPESA')?.id ?? null,
  )
  const [itemId, setItemId] = useState<number | null>(existente?.itemId ?? null)
  const [mesAno, setMesAno] = useState<MesAno>(inicio)
  const [valorTexto, setValorTexto] = useState(existente === undefined ? '' : paraTexto(existente.valor))
  const [erroValor, setErroValor] = useState<string | null>(null)
  /** Vencimento digitado pela pessoa; `null` enquanto vale o padrão do item. */
  const [vencimentoManual, setVencimentoManual] = useState<string | null>(existente?.vencimento ?? null)
  const [status, setStatus] = useState<StatusLancamento>(existente?.status ?? 'PREVISTO')
  const [repetir, setRepetir] = useState(false)
  const [ate, setAte] = useState<MesAno | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)

  const categoria = categorias.find((c) => c.id === categoriaId)
  const item = categoria?.itens.find((i) => i.id === itemId)
  const opcoesAte = mesesEntre(mesAno, MAXIMO_DE_REPETICOES, 1)
  const ateEfetivo = opcoesAte.find((o) => ate !== null && chaveMes(o) === chaveMes(ate)) ?? opcoesAte[0]

  const diaDoItem = item?.diaVencimento ?? null
  const padrao = vencimentoPadrao(mesAno.ano, mesAno.mes, diaDoItem)
  const vencimento = vencimentoManual ?? padrao
  const diaAjustado = diaDoItem !== null && padrao !== '' && Number(padrao.slice(8)) !== diaDoItem

  const salvar = useMutation({
    mutationFn: (req: SalvarLancamentoRequest) => endpoints.lancamentos.salvar(req),
    onSuccess: (_salvos, req) => {
      void invalidarLancamentos(queryClient)
      aoSalvar({ ano: req.ano, mes: req.mes })
    },
    onError: (falha) => setErro(mensagemDoErro(falha)),
  })
  const excluir = useMutation({
    mutationFn: (id: number) => endpoints.lancamentos.excluir(id),
    onSuccess: () => {
      void invalidarLancamentos(queryClient)
      aoFechar()
    },
    onError: (falha) => {
      setConfirmandoExclusao(false)
      setErro(mensagemDoErro(falha))
    },
  })

  function escolherTipo(novo: TipoCategoria) {
    setTipo(novo)
    setCategoriaId(categorias.find((c) => c.tipo === novo)?.id ?? null)
    setItemId(null)
  }

  function enviar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro(null)
    const valor = lerValor(valorTexto)
    if (itemId === null) {
      setErro('Escolha um item.')
      return
    }
    if (valor === null) {
      setErroValor(mensagemDoValor(valorTexto))
      return
    }
    setErroValor(null)
    salvar.mutate({
      itemId,
      ano: mesAno.ano,
      mes: mesAno.mes,
      valor,
      status,
      ...(vencimento === '' ? {} : { vencimento }),
      ...(repetir && ateEfetivo !== undefined ? { repetirAte: ateEfetivo } : {}),
    })
  }

  const categoriasDoTipo = categorias.filter((c) => c.tipo === tipo)
  const ocupado = salvar.isPending || excluir.isPending

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      <Segmentado
        legenda="Tipo do lançamento"
        nome="tipo"
        opcoes={TIPOS}
        valor={tipo}
        aoMudar={escolherTipo}
        desabilitado={editando}
      />
      <CampoSelect
        rotulo="Categoria"
        value={categoriaId === null ? '' : String(categoriaId)}
        disabled={editando}
        onChange={(evento) => {
          setCategoriaId(Number(evento.target.value))
          setItemId(null)
        }}
      >
        {categoriasDoTipo.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </CampoSelect>
      {categoriasDoTipo.length === 0 && (
        <p className="m-0 text-sm text-[var(--cor-mutado)]">Nenhuma categoria deste tipo. Crie uma em Categorias.</p>
      )}
      <SeletorItem
        categoriaId={categoriaId}
        itens={categoria?.itens ?? []}
        itemId={itemId}
        desabilitado={editando}
        aoEscolher={(escolhido) => setItemId(escolhido?.id ?? null)}
      />
      <CampoSelect
        rotulo="Mês"
        value={chaveMes(mesAno)}
        disabled={editando}
        onChange={(evento) => setMesAno(lerChaveMes(evento.target.value) ?? mesAno)}
      >
        {mesesEntre(inicio, 49, -24).map((m) => (
          <option key={chaveMes(m)} value={chaveMes(m)}>
            {rotuloMes(m.ano, m.mes)}
          </option>
        ))}
      </CampoSelect>
      <div className="flex flex-col gap-1.5">
        <CampoTexto
          rotulo="Valor"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          value={valorTexto}
          aria-invalid={erroValor !== null}
          aria-describedby={erroValor === null ? undefined : 'erro-valor'}
          onChange={(evento) => {
            setValorTexto(evento.target.value)
            setErroValor(null)
          }}
        />
        {erroValor !== null && (
          <p id="erro-valor" role="alert" className="m-0 text-sm text-[var(--cor-negativo)]">
            {erroValor}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <CampoTexto
          rotulo="Vencimento"
          type="date"
          value={vencimento}
          onChange={(evento) => setVencimentoManual(evento.target.value)}
        />
        {diaDoItem !== null && vencimentoManual === null && (
          <p className="m-0 text-xs text-[var(--cor-mutado)]">
            {`Padrão do item: dia ${diaDoItem}`}
            {diaAjustado ? ` (${isoParaBr(padrao)} neste mês)` : ''}
          </p>
        )}
      </div>
      <Segmentado legenda="Situação" nome="situacao" opcoes={SITUACOES} valor={status} aoMudar={setStatus} />
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-3">
        <label className="flex min-h-11 items-center justify-between gap-3 text-base font-medium">
          <span>Repetir nos próximos meses</span>
          <input
            type="checkbox"
            role="switch"
            checked={repetir}
            onChange={(evento) => setRepetir(evento.target.checked)}
            className="size-6 accent-[var(--cor-principal)]"
          />
        </label>
        {repetir && (
          <CampoSelect
            rotulo="Repetir até"
            value={ateEfetivo === undefined ? '' : chaveMes(ateEfetivo)}
            onChange={(evento) => setAte(lerChaveMes(evento.target.value))}
          >
            {opcoesAte.map((m) => (
              <option key={chaveMes(m)} value={chaveMes(m)}>
                {rotuloMes(m.ano, m.mes)}
              </option>
            ))}
          </CampoSelect>
        )}
      </div>
      <MensagemDeErro texto={erro} />
      <button type="submit" disabled={ocupado} className={classeBotaoPrimario}>
        {salvar.isPending ? 'Salvando…' : 'Salvar'}
      </button>
      {existente !== undefined &&
        (confirmandoExclusao ? (
          <div role="group" aria-label="Confirmar exclusão" className="flex flex-col gap-3 rounded-2xl bg-white p-3">
            <p className="m-0 text-base font-medium">Excluir este lançamento?</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={ocupado}
                onClick={() => excluir.mutate(existente.id)}
                className="min-h-11 rounded-full bg-[var(--cor-negativo)] px-5 text-base font-semibold text-white disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-negativo)]"
              >
                {excluir.isPending ? 'Excluindo…' : 'Sim, excluir'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmandoExclusao(false)}
                className="min-h-11 rounded-full px-4 text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--cor-principal)]"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmandoExclusao(true)}
            className="min-h-11 rounded-full px-4 text-base font-semibold text-[var(--cor-negativo)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--cor-negativo)]"
          >
            Excluir
          </button>
        ))}
    </form>
  )
}

/**
 * Formulário de lançamento: `/lancamentos/novo` (novo) e `/lancamentos/:id` (edição), em rota filha da lista.
 * Não existe GET por id; a edição procura o lançamento na lista do mês da URL (`?ano=&mes=`, que os links da
 * lista mantêm), a mesma consulta da tela de trás, então costuma vir do cache.
 */
export function LancamentoForm() {
  const { id } = useParams()
  const { ano, mes, busca } = useMesSelecionado()
  const navigate = useNavigate()
  const editando = id !== undefined

  const categorias = useQuery({ queryKey: ['categorias'], queryFn: endpoints.categorias.listar })
  const doMes = useQuery({
    queryKey: ['lancamentos', ano, mes],
    queryFn: () => endpoints.lancamentos.listar(ano, mes),
    enabled: editando,
  })

  const fechar = () => void navigate({ pathname: '/lancamentos', search: busca })
  const voltarParaMes = (destino: MesAno) =>
    void navigate({ pathname: '/lancamentos', search: `?ano=${destino.ano}&mes=${destino.mes}` })

  let conteudo: ReactNode
  if (categorias.isError || (editando && doMes.isError)) {
    conteudo = <MensagemDeErro texto={mensagemDoErro(categorias.error ?? doMes.error)} />
  } else if (categorias.isPending || (editando && doMes.isPending)) {
    conteudo = (
      <p role="status" className="m-0 text-sm text-[var(--cor-mutado)]">
        Carregando…
      </p>
    )
  } else {
    const existente = editando ? doMes.data?.find((l) => String(l.id) === id) : undefined
    conteudo =
      editando && existente === undefined ? (
        <p className="m-0 text-sm">Lançamento não encontrado neste mês.</p>
      ) : (
        <Formulario
          categorias={categorias.data}
          existente={existente}
          mesInicial={{ ano, mes }}
          aoFechar={fechar}
          aoSalvar={voltarParaMes}
        />
      )
  }

  return (
    <Moldura titulo={editando ? 'Editar lançamento' : 'Novo lançamento'} aoFechar={fechar}>
      {conteudo}
    </Moldura>
  )
}
