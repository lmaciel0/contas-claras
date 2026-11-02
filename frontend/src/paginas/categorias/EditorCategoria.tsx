import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import type { SubmitEvent } from 'react'
import { endpoints } from '../../api/endpoints'
import type { CategoriaRequest, CategoriaResponse, TipoCategoria } from '../../api/tipos'
import { CampoTexto, classeBotaoPrimario, MensagemDeErro } from '../../auth/CampoTexto'
import { mensagemDoErro } from '../../auth/mensagemDoErro'
import { Moldura } from '../lancamentos/Moldura'
import { invalidarCadastro } from './invalidar'
import { SeletorCor } from './SeletorCor'
import { SeletorIcone } from './SeletorIcone'

interface Props {
  /** Tipo da categoria nova (a edição usa o da própria categoria; o tipo não muda depois de criada). */
  tipo: TipoCategoria
  /** Categoria em edição; `undefined` para criar uma nova. */
  existente?: CategoriaResponse
  aoFechar: () => void
}

/** Janela para criar ou editar uma categoria (com ícone e cor) e, na edição, apagá-la. */
export function EditorCategoria({ tipo, existente, aoFechar }: Props) {
  const queryClient = useQueryClient()
  const [nome, setNome] = useState(existente?.nome ?? '')
  const [cor, setCor] = useState(existente?.cor ?? '#3b82f6')
  const [icone, setIcone] = useState(existente?.icone ?? 'outros')
  const [erro, setErro] = useState<string | null>(null)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const inputNomeRef = useRef<HTMLInputElement>(null)

  const salvar = useMutation({
    mutationFn: (req: CategoriaRequest) =>
      existente === undefined
        ? endpoints.categorias.criar(req)
        : endpoints.categorias.renomear(existente.id, req),
    onSuccess: () => {
      void invalidarCadastro(queryClient)
      aoFechar()
    },
    onError: (falha) => setErro(mensagemDoErro(falha)),
  })

  const salvarECriarNova = useMutation({
    mutationFn: (req: CategoriaRequest) => endpoints.categorias.criar(req),
    onSuccess: () => {
      void invalidarCadastro(queryClient)
      setNome('')
      setErro(null)
      inputNomeRef.current?.focus()
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

  function validarNome(): string | null {
    const nomeLimpo = nome.trim()
    if (nomeLimpo === '') {
      setErro('Informe o nome da categoria.')
      return null
    }
    setErro(null)
    return nomeLimpo
  }

  function enviar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault()
    const nomeLimpo = validarNome()
    if (!nomeLimpo) return
    salvar.mutate({ nome: nomeLimpo, tipo, icone, cor })
  }

  function handleSalvarECriarNova() {
    const nomeLimpo = validarNome()
    if (!nomeLimpo) return
    salvarECriarNova.mutate({ nome: nomeLimpo, tipo, icone, cor })
  }

  const ocupado = salvar.isPending || salvarECriarNova.isPending || excluir.isPending

  return (
    <Moldura
      titulo={existente === undefined ? 'Cadastrar nova categoria' : 'Editar categoria'}
      aoFechar={aoFechar}
    >
      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <p className="m-0 text-sm text-[var(--cor-mutado)]">
          {tipo === 'RECEITA' ? 'Categoria de Receitas' : 'Categoria de Despesas'}
        </p>

        <CampoTexto
          rotulo="Nome da categoria"
          value={nome}
          maxLength={80}
          autoComplete="off"
          ref={inputNomeRef}
          onChange={(evento) => {
            setNome(evento.target.value)
            setErro(null)
          }}
        />

        <SeletorCor valor={cor} aoMudar={setCor} />

        <SeletorIcone valor={icone} aoMudar={setIcone} />

        <MensagemDeErro texto={erro} />

        <div className="mt-2 flex items-center justify-end gap-3">
          {existente === undefined && (
            <button
              type="button"
              disabled={ocupado}
              onClick={handleSalvarECriarNova}
              className="min-h-11 rounded-full px-4 text-xs font-bold uppercase tracking-wider text-[var(--cor-mutado)] hover:text-[var(--cor-texto)] focus-visible:outline-2 focus-visible:outline-[var(--cor-principal)]"
            >
              {salvarECriarNova.isPending ? 'Salvando…' : 'Salvar e criar nova'}
            </button>
          )}

          <button
            type="submit"
            disabled={ocupado}
            className={`${classeBotaoPrimario} rounded-full px-7 text-xs font-bold uppercase tracking-wider`}
          >
            {salvar.isPending ? 'Salvando…' : 'Salvar'}
          </button>
        </div>

        {existente !== undefined &&
          (confirmandoExclusao ? (
            <div
              role="group"
              aria-label="Confirmar exclusão"
              className="mt-3 flex flex-col gap-3 rounded-2xl bg-[var(--cor-card)] p-3"
            >
              <p className="m-0 text-base font-medium">{`Excluir a categoria ${existente.nome}?`}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => excluir.mutate(existente.id)}
                  className="min-h-11 rounded-full bg-[var(--cor-negativo)] px-5 text-base font-semibold text-[var(--cor-sobre-negativo)] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-negativo)]"
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
              className="mt-2 min-h-11 self-start rounded-full px-4 text-sm font-semibold text-[var(--cor-negativo)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--cor-negativo)]"
            >
              Excluir categoria
            </button>
          ))}
      </form>
    </Moldura>
  )
}
