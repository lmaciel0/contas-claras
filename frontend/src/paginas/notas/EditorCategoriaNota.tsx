import { useState } from 'react'
import type { SubmitEvent } from 'react'
import type { CategoriaNotaResponse } from '../../api/tipos'
import { CampoTexto, classeBotaoPrimario, MensagemDeErro } from '../../auth/CampoTexto'
import { mensagemDoErro } from '../../auth/mensagemDoErro'
import { Moldura } from '../lancamentos/Moldura'
import { CORES_CATEGORIA_NOTA, corDaCategoria } from './coresCategoria'
import { useCriarCategoriaNota, useEditarCategoriaNota, useExcluirCategoriaNota } from './useNotas'

interface Props {
  /** Categoria em edição; `undefined` para criar uma nova. */
  existente?: CategoriaNotaResponse
  aoFechar: () => void
}

const classeFoco = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]'

function textoNotas(total: number): string {
  if (total === 0) return 'Nenhuma nota usa esta categoria.'
  return total === 1 ? '1 nota ficará sem categoria.' : `${total} notas ficarão sem categoria.`
}

/** Janela para criar ou editar uma categoria de nota (nome e cor) e, na edição, excluí-la. */
export function EditorCategoriaNota({ existente, aoFechar }: Props) {
  const [nome, setNome] = useState(existente?.nome ?? '')
  const [cor, setCor] = useState(existente?.cor ?? 'azul')
  const [erro, setErro] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const criar = useCriarCategoriaNota()
  const editar = useEditarCategoriaNota()
  const excluir = useExcluirCategoriaNota()
  const ocupado = criar.isPending || editar.isPending || excluir.isPending
  const aoErro = (falha: unknown) => {
    setConfirmando(false)
    setErro(mensagemDoErro(falha))
  }

  function enviar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault()
    const nomeLimpo = nome.trim()
    if (nomeLimpo === '') return setErro('Informe o nome da categoria.')
    setErro(null)
    const opcoes = { onSuccess: aoFechar, onError: aoErro }
    if (existente === undefined) criar.mutate({ nome: nomeLimpo, cor }, opcoes)
    else editar.mutate({ id: existente.id, nome: nomeLimpo, cor }, opcoes)
  }

  return (
    <Moldura titulo={existente === undefined ? 'Nova categoria' : 'Editar categoria'} aoFechar={aoFechar}>
      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <CampoTexto
          rotulo="Nome da categoria"
          value={nome}
          maxLength={40}
          autoComplete="off"
          onChange={(e) => {
            setNome(e.target.value)
            setErro(null)
          }}
        />
        <div role="group" aria-label="Cor" className="flex flex-wrap gap-2">
          {CORES_CATEGORIA_NOTA.map((chave) => (
            <button
              key={chave}
              type="button"
              aria-label={chave}
              aria-pressed={cor === chave}
              onClick={() => setCor(chave)}
              className={`grid size-11 cursor-pointer place-items-center rounded-full border-2 transition-colors duration-200 motion-reduce:transition-none ${classeFoco} ${
                cor === chave ? 'border-[var(--cor-texto)]' : 'border-transparent'
              }`}
            >
              <span className="size-6 rounded-full" style={{ background: corDaCategoria(chave) }} />
            </button>
          ))}
        </div>
        <MensagemDeErro texto={erro} />
        <button type="submit" disabled={ocupado} className={classeBotaoPrimario}>
          {criar.isPending || editar.isPending ? 'Salvando…' : 'Salvar'}
        </button>
        {existente !== undefined &&
          (confirmando ? (
            <div role="group" aria-label="Confirmar exclusão" className="flex flex-col gap-3 rounded-2xl bg-[var(--cor-card)] p-3">
              <p className="m-0 text-base font-medium">{`Excluir a categoria ${existente.nome}? ${textoNotas(existente.totalNotas)}`}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => excluir.mutate(existente.id, { onSuccess: aoFechar, onError: aoErro })}
                  className="min-h-11 cursor-pointer rounded-full bg-[var(--cor-negativo)] px-5 text-base font-semibold text-[var(--cor-sobre-negativo)] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-negativo)]"
                >
                  {excluir.isPending ? 'Excluindo…' : 'Sim, excluir'}
                </button>
                <button type="button" onClick={() => setConfirmando(false)} className={`min-h-11 cursor-pointer rounded-full px-4 text-base font-medium ${classeFoco}`}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              className="min-h-11 cursor-pointer rounded-full px-4 text-base font-semibold text-[var(--cor-negativo-texto)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--cor-negativo)]"
            >
              Excluir categoria
            </button>
          ))}
      </form>
    </Moldura>
  )
}
