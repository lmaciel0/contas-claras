import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { endpoints } from '../../api/endpoints'
import type { CategoriaResponse, TipoCategoria } from '../../api/tipos'
import { CampoTexto, classeBotaoPrimario, MensagemDeErro } from '../../auth/CampoTexto'
import { mensagemDoErro } from '../../auth/mensagemDoErro'
import { Moldura } from '../lancamentos/Moldura'
import { invalidarCadastro } from './invalidar'

interface Props {
  /** Tipo da categoria nova (a edição usa o da própria categoria; o tipo não muda depois de criada). */
  tipo: TipoCategoria
  /** Categoria em edição; `undefined` para criar uma nova. */
  existente?: CategoriaResponse
  aoFechar: () => void
}

/** Janela para criar ou renomear uma categoria e, na edição, apagá-la (a API recusa se houver lançamentos). */
export function EditorCategoria({ tipo, existente, aoFechar }: Props) {
  const queryClient = useQueryClient()
  const [nome, setNome] = useState(existente?.nome ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)

  const salvar = useMutation({
    mutationFn: (nomeLimpo: string) =>
      existente === undefined
        ? endpoints.categorias.criar({ nome: nomeLimpo, tipo })
        : endpoints.categorias.renomear(existente.id, { nome: nomeLimpo }),
    onSuccess: () => {
      void invalidarCadastro(queryClient)
      aoFechar()
    },
    onError: (falha) => setErro(mensagemDoErro(falha)),
  })
  const excluir = useMutation({
    mutationFn: (id: number) => endpoints.categorias.excluir(id),
    onSuccess: () => {
      void invalidarCadastro(queryClient)
      aoFechar()
    },
    onError: (falha) => {
      setConfirmandoExclusao(false)
      setErro(mensagemDoErro(falha))
    },
  })

  function enviar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault()
    const nomeLimpo = nome.trim()
    if (nomeLimpo === '') {
      setErro('Informe o nome da categoria.')
      return
    }
    setErro(null)
    salvar.mutate(nomeLimpo)
  }

  const ocupado = salvar.isPending || excluir.isPending

  return (
    <Moldura titulo={existente === undefined ? 'Nova categoria' : 'Editar categoria'} aoFechar={aoFechar}>
      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <p className="m-0 text-sm text-[var(--cor-mutado)]">
          {tipo === 'RECEITA' ? 'Categoria de receita' : 'Categoria de despesa'}
        </p>
        <CampoTexto
          rotulo="Nome da categoria"
          value={nome}
          maxLength={80}
          autoComplete="off"
          onChange={(evento) => {
            setNome(evento.target.value)
            setErro(null)
          }}
        />
        <MensagemDeErro texto={erro} />
        <button type="submit" disabled={ocupado} className={classeBotaoPrimario}>
          {salvar.isPending ? 'Salvando…' : 'Salvar'}
        </button>
        {existente !== undefined &&
          (confirmandoExclusao ? (
            <div role="group" aria-label="Confirmar exclusão" className="flex flex-col gap-3 rounded-2xl bg-white p-3">
              <p className="m-0 text-base font-medium">{`Excluir a categoria ${existente.nome}?`}</p>
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
              onClick={() => {
                setErro(null)
                setConfirmandoExclusao(true)
              }}
              className="min-h-11 rounded-full px-4 text-base font-semibold text-[var(--cor-negativo)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--cor-negativo)]"
            >
              Excluir categoria
            </button>
          ))}
      </form>
    </Moldura>
  )
}
