import { useEffect, useState } from 'react'
import type { CategoriaNotaResponse, ConteudoNota, NotaResponse } from '../../api/tipos'
import { endpoints } from '../../api/endpoints'
import { IconeAlfinete } from './Icones'
import { NotaEditor } from './NotaEditor'
import { useAutosave } from './useAutosave'
import { useFixarNota, useSalvarNota } from './useNotas'

interface Props {
  nota: NotaResponse
  categorias: CategoriaNotaResponse[]
  aoExcluir: () => void
  excluindo: boolean
}

interface Valor {
  titulo: string
  conteudo: ConteudoNota
  categoriaId: number | null
}

const foco = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]'
const botao = `inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-[var(--cor-linha)] px-4 text-sm font-semibold transition-colors duration-200 motion-reduce:transition-none ${foco}`

/** Título, categoria, alfinete, editor e indicador de salvamento. O estado inicial vem da nota; depois o editor manda. */
export function EdicaoNota({ nota, categorias, aoExcluir, excluindo }: Props) {
  const [valor, setValor] = useState<Valor>({ titulo: nota.titulo, conteudo: nota.conteudo, categoriaId: nota.categoriaId })
  const [confirmando, setConfirmando] = useState(false)
  const salvarNota = useSalvarNota()
  const fixar = useFixarNota()
  const tituloVazio = valor.titulo.trim() === ''

  const { estado, descarregar } = useAutosave<Valor>({
    valor,
    // Título vazio rejeita: a nota segue "pendente" e a próxima alteração tenta de novo.
    salvar: async (v) => {
      if (v.titulo.trim() === '') throw new Error('Informe um título.')
      await salvarNota.mutateAsync({ id: nota.id, ...v, titulo: v.titulo.trim() })
    },
    aoSair: (v) => {
      if (v.titulo.trim() === '') return
      endpoints.notas.editar(nota.id, { ...v, titulo: v.titulo.trim() }, { keepalive: true }).catch(() => undefined)
    },
  })
  useEffect(() => () => void descarregar(), [descarregar])

  const fixada = fixar.isPending ? !nota.fixada : nota.fixada
  let indicador = 'Salvo'
  if (tituloVazio) indicador = 'Informe um título.'
  else if (estado === 'erro') indicador = 'Não foi possível salvar. Tentando de novo na próxima alteração.'
  else if (estado !== 'salvo') indicador = 'Salvando…'

  return (
    <div className="flex flex-col gap-4">
      <label htmlFor="titulo-nota" className="sr-only">
        Título da nota
      </label>
      <input
        id="titulo-nota"
        value={valor.titulo}
        maxLength={120}
        placeholder="Sem título"
        autoComplete="off"
        onChange={(e) => setValor((v) => ({ ...v, titulo: e.target.value }))}
        className={`min-h-11 w-full rounded-xl border border-transparent bg-transparent px-1 text-2xl font-bold tracking-tight text-[var(--cor-texto)] transition-colors duration-200 placeholder:text-[var(--cor-mutado)] hover:border-[var(--cor-linha)] motion-reduce:transition-none ${foco}`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="categoria-nota" className="text-sm font-medium">
          Categoria
        </label>
        <select
          id="categoria-nota"
          value={valor.categoriaId === null ? '' : String(valor.categoriaId)}
          onChange={(e) => setValor((v) => ({ ...v, categoriaId: e.target.value === '' ? null : Number(e.target.value) }))}
          className={`min-h-11 min-w-0 rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-card)] px-3 text-base text-[var(--cor-texto)] ${foco}`}
        >
          <option value="">Sem categoria</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-label={fixada ? 'Tirar da tela inicial' : 'Fixar na tela inicial'}
          aria-pressed={fixada}
          onClick={() => fixar.mutate({ id: nota.id, fixada: !nota.fixada })}
          className={`${botao} ${fixada ? 'border-transparent bg-[var(--cor-principal)] text-[var(--cor-sobre-principal)]' : 'text-[var(--cor-principal)] hover:bg-[var(--cor-card)]'}`}
        >
          <IconeAlfinete cheio={fixada} />
          {fixada ? 'Fixada' : 'Fixar'}
        </button>
        {confirmando ? (
          <span role="group" aria-label="Confirmar exclusão" className="inline-flex items-center gap-1">
            <button type="button" disabled={excluindo} onClick={aoExcluir} className={`${botao} border-transparent bg-[var(--cor-negativo)] text-[var(--cor-sobre-negativo)] disabled:opacity-60`}>
              Sim, excluir
            </button>
            <button type="button" onClick={() => setConfirmando(false)} className={`${botao} border-transparent`}>
              Cancelar
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmando(true)} className={`${botao} text-[var(--cor-negativo-texto)]`}>
            Excluir
          </button>
        )}
      </div>
      <NotaEditor conteudo={nota.conteudo} aoMudar={(conteudo) => setValor((v) => ({ ...v, conteudo }))} />
      {/* Espaço fixo (duas linhas no celular) para o indicador não empurrar o layout ao mudar de texto. */}
      <p role="status" className={`m-0 min-h-10 text-xs ${tituloVazio || estado === 'erro' ? 'text-[var(--cor-negativo-texto)]' : 'text-[var(--cor-mutado)]'}`}>
        {indicador}
      </p>
    </div>
  )
}
