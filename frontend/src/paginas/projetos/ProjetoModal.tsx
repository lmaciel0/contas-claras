import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { travarRolagem } from '../../layout/travaRolagem'
import type {
  CorProjeto,
  EstagioProjeto,
  PrioridadeProjeto,
  Projeto,
  ProjetoCriacaoRequisicao,
  ProjetoEdicaoRequisicao,
} from './tipos'

export interface ProjetoModalProps {
  aberto: boolean
  projeto?: Projeto | null
  estagioPadrao?: EstagioProjeto
  aoFechar: () => void
  aoSalvarCriacao?: (req: ProjetoCriacaoRequisicao) => void
  aoSalvarEdicao?: (id: number, req: ProjetoEdicaoRequisicao) => void
  aoAlternarSubtarefa?: (projetoId: number, subtarefaId: number) => void
  aoAdicionarSubtarefa?: (projetoId: number, titulo: string) => void
  aoExcluirSubtarefa?: (projetoId: number, subtarefaId: number) => void
  salvando?: boolean
}

const OPCOES_CORES: { id: CorProjeto; rotulo: string; classeBg: string; classeAnel: string }[] = [
  { id: 'azul', rotulo: 'Azul', classeBg: 'bg-blue-500', classeAnel: 'ring-blue-500' },
  { id: 'esmeralda', rotulo: 'Esmeralda', classeBg: 'bg-emerald-500', classeAnel: 'ring-emerald-500' },
  { id: 'indigo', rotulo: 'Índigo', classeBg: 'bg-indigo-500', classeAnel: 'ring-indigo-500' },
  { id: 'ambar', rotulo: 'Âmbar', classeBg: 'bg-amber-500', classeAnel: 'ring-amber-500' },
  { id: 'rosa', rotulo: 'Rosa', classeBg: 'bg-pink-500', classeAnel: 'ring-pink-500' },
  { id: 'roxo', rotulo: 'Roxo', classeBg: 'bg-purple-500', classeAnel: 'ring-purple-500' },
]

const OPCOES_PRIORIDADE: { id: PrioridadeProjeto; rotulo: string }[] = [
  { id: 'BAIXA', rotulo: 'Baixa' },
  { id: 'MEDIA', rotulo: 'Média' },
  { id: 'ALTA', rotulo: 'Alta' },
  { id: 'URGENTE', rotulo: 'Urgente' },
]

export function ProjetoModal({
  aberto,
  projeto,
  estagioPadrao = 'A_FAZER',
  aoFechar,
  aoSalvarCriacao,
  aoSalvarEdicao,
  aoAlternarSubtarefa,
  aoAdicionarSubtarefa,
  aoExcluirSubtarefa,
  salvando = false,
}: ProjetoModalProps) {
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState('')
  const [estagio, setEstagio] = useState<EstagioProjeto>(estagioPadrao)
  const [prioridade, setPrioridade] = useState<PrioridadeProjeto>('MEDIA')
  const [cor, setCor] = useState<CorProjeto>('azul')
  const [prazo, setPrazo] = useState('')
  const [subtarefasCriacao, setSubtarefasCriacao] = useState<string[]>([])
  const [novaSubtarefa, setNovaSubtarefa] = useState('')

  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (aberto) {
      if (projeto) {
        setTitulo(projeto.titulo)
        setDescricao(projeto.descricao ?? '')
        setCategoria(projeto.categoria ?? '')
        setEstagio(projeto.estagio)
        setPrioridade(projeto.prioridade)
        setCor(projeto.cor)
        setPrazo(projeto.prazo ?? '')
        setSubtarefasCriacao([])
      } else {
        setTitulo('')
        setDescricao('')
        setCategoria('')
        setEstagio(estagioPadrao)
        setPrioridade('MEDIA')
        setCor('azul')
        setPrazo('')
        setSubtarefasCriacao([])
      }
      setNovaSubtarefa('')
    }
  }, [aberto, projeto, estagioPadrao])

  useEffect(() => {
    if (!aberto) return
    const soltar = travarRolagem()

    function aoPressionarTecla(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') {
        aoFechar()
      }
    }

    window.addEventListener('keydown', aoPressionarTecla)
    return () => {
      soltar()
      window.removeEventListener('keydown', aoPressionarTecla)
    }
  }, [aberto, aoFechar])

  if (!aberto) return null

  function lidarKeyDownNovaSub(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const texto = novaSubtarefa.trim()
      if (!texto) return

      if (projeto) {
        aoAdicionarSubtarefa?.(projeto.id, texto)
      } else {
        setSubtarefasCriacao((prev) => [...prev, texto])
      }
      setNovaSubtarefa('')
    }
  }

  function lidarSubmeter(e: FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return

    if (projeto) {
      aoSalvarEdicao?.(projeto.id, {
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        categoria: categoria.trim() || null,
        prioridade,
        cor,
        prazo: prazo || null,
      })
    } else {
      aoSalvarCriacao?.({
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        categoria: categoria.trim() || null,
        estagio,
        prioridade,
        cor,
        prazo: prazo || null,
        subtarefas: subtarefasCriacao,
      })
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={aoFechar}
      />

      {/* Conteúdo do Modal */}
      <div
        ref={modalRef}
        className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[var(--cor-linha)] bg-[var(--cor-card)] p-6 shadow-2xl transition-all"
      >
        <div className="flex items-center justify-between border-b border-[var(--cor-linha)] pb-4">
          <h2 id="titulo-modal" className="text-lg font-bold text-[var(--cor-texto)]">
            {projeto ? 'Editar Projeto' : 'Novo Projeto'}
          </h2>
          <button
            type="button"
            aria-label="Fechar modal"
            onClick={aoFechar}
            className="flex size-8 items-center justify-center rounded-lg text-[var(--cor-mutado)] hover:bg-[var(--cor-linha)] hover:text-[var(--cor-texto)]"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={lidarSubmeter} className="mt-5 space-y-4">
          {/* Título */}
          <div>
            <label htmlFor="projeto-titulo" className="block text-xs font-semibold text-[var(--cor-texto)]">
              Título *
            </label>
            <input
              id="projeto-titulo"
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Nome do projeto..."
              className="mt-1 w-full rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-fundo)] px-3.5 py-2 text-sm text-[var(--cor-texto)] focus:border-[var(--cor-principal)] focus:outline-hidden"
            />
          </div>

          {/* Descrição */}
          <div>
            <label htmlFor="projeto-descricao" className="block text-xs font-semibold text-[var(--cor-texto)]">
              Descrição
            </label>
            <textarea
              id="projeto-descricao"
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes ou objetivos do projeto..."
              className="mt-1 w-full rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-fundo)] px-3.5 py-2 text-sm text-[var(--cor-texto)] focus:border-[var(--cor-principal)] focus:outline-hidden"
            />
          </div>

          {/* Grid: Categoria e Prazo */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="projeto-categoria" className="block text-xs font-semibold text-[var(--cor-texto)]">
                Categoria
              </label>
              <input
                id="projeto-categoria"
                type="text"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="ex: Design, Backend, Marketing..."
                className="mt-1 w-full rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-fundo)] px-3.5 py-2 text-sm text-[var(--cor-texto)] focus:border-[var(--cor-principal)] focus:outline-hidden"
              />
            </div>
            <div>
              <label htmlFor="projeto-prazo" className="block text-xs font-semibold text-[var(--cor-texto)]">
                Prazo
              </label>
              <input
                id="projeto-prazo"
                type="date"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-fundo)] px-3.5 py-2 text-sm text-[var(--cor-texto)] focus:border-[var(--cor-principal)] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Prioridade */}
          <div>
            <span className="block text-xs font-semibold text-[var(--cor-texto)] mb-1.5">Prioridade</span>
            <div className="flex flex-wrap gap-2">
              {OPCOES_PRIORIDADE.map((opcao) => (
                <button
                  key={opcao.id}
                  type="button"
                  onClick={() => setPrioridade(opcao.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                    prioridade === opcao.id
                      ? 'border-[var(--cor-principal)] bg-[var(--cor-principal)] text-[var(--cor-sobre-principal)]'
                      : 'border-[var(--cor-linha)] bg-[var(--cor-fundo)] text-[var(--cor-mutado)] hover:text-[var(--cor-texto)]'
                  }`}
                >
                  {opcao.rotulo}
                </button>
              ))}
            </div>
          </div>

          {/* Cor de Destaque */}
          <div>
            <span className="block text-xs font-semibold text-[var(--cor-texto)] mb-1.5">Cor de destaque</span>
            <div className="flex items-center gap-3">
              {OPCOES_CORES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-label={`Cor ${c.rotulo}`}
                  onClick={() => setCor(c.id)}
                  className={`size-6 rounded-full transition-transform ${c.classeBg} ${
                    cor === c.id ? `scale-125 ring-2 ring-offset-2 ${c.classeAnel}` : 'hover:scale-110 opacity-80'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Gerenciador de Subtarefas */}
          <div className="rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-fundo)]/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[var(--cor-texto)]">
                Subtarefas ({projeto ? `${projeto.subtarefasConcluidas}/${projeto.totalSubtarefas}` : subtarefasCriacao.length})
              </span>
              {projeto && (
                <span className="text-xs font-medium text-[var(--cor-mutado)]">
                  {projeto.porcentagemProgresso}%
                </span>
              )}
            </div>

            {/* Lista de Subtarefas */}
            <div className="space-y-1.5 max-h-40 overflow-y-auto mb-3">
              {projeto ? (
                projeto.subtarefas.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-[var(--cor-card)] px-3 py-2 border border-[var(--cor-linha)]"
                  >
                    <label className="flex flex-1 items-center gap-2.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sub.concluida}
                        aria-label={`Alternar ${sub.titulo}`}
                        onChange={() => aoAlternarSubtarefa?.(projeto.id, sub.id)}
                        className="rounded border-[var(--cor-linha)] text-[var(--cor-principal)] focus:ring-[var(--cor-principal)]"
                      />
                      <span className={sub.concluida ? 'text-[var(--cor-mutado)] line-through' : 'text-[var(--cor-texto)]'}>
                        {sub.titulo}
                      </span>
                    </label>
                    <button
                      type="button"
                      aria-label={`Remover ${sub.titulo}`}
                      onClick={() => aoExcluirSubtarefa?.(projeto.id, sub.id)}
                      className="text-[var(--cor-mutado)] hover:text-red-500"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))
              ) : (
                subtarefasCriacao.map((subTexto, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 rounded-lg bg-[var(--cor-card)] px-3 py-2 border border-[var(--cor-linha)] text-xs text-[var(--cor-texto)]"
                  >
                    <span>{subTexto}</span>
                    <button
                      type="button"
                      aria-label={`Remover ${subTexto}`}
                      onClick={() => setSubtarefasCriacao((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-[var(--cor-mutado)] hover:text-red-500"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Input de Nova Subtarefa */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Adicionar subtarefa e pressionar Enter..."
                value={novaSubtarefa}
                onChange={(e) => setNovaSubtarefa(e.target.value)}
                onKeyDown={lidarKeyDownNovaSub}
                className="flex-1 rounded-lg border border-[var(--cor-linha)] bg-[var(--cor-card)] px-3 py-1.5 text-xs text-[var(--cor-texto)] placeholder:text-[var(--cor-mutado)] focus:border-[var(--cor-principal)] focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => {
                  const texto = novaSubtarefa.trim()
                  if (!texto) return
                  if (projeto) {
                    aoAdicionarSubtarefa?.(projeto.id, texto)
                  } else {
                    setSubtarefasCriacao((prev) => [...prev, texto])
                  }
                  setNovaSubtarefa('')
                }}
                className="rounded-lg bg-[var(--cor-linha)] px-3 py-1.5 text-xs font-semibold text-[var(--cor-texto)] hover:bg-[var(--cor-linha)]/80"
              >
                +
              </button>
            </div>
          </div>

          {/* Botões do Rodapé */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--cor-linha)]">
            <button
              type="button"
              onClick={aoFechar}
              className="rounded-xl px-4 py-2 text-sm font-medium text-[var(--cor-mutado)] hover:bg-[var(--cor-linha)] hover:text-[var(--cor-texto)] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando || !titulo.trim()}
              className="flex items-center gap-2 rounded-xl bg-[var(--cor-principal)] px-5 py-2 text-sm font-medium text-[var(--cor-sobre-principal)] shadow-sm hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {salvando ? 'Salvando...' : projeto ? 'Salvar alterações' : 'Criar projeto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
