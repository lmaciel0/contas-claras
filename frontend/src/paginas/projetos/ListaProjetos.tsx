import { useState } from 'react'
import { LinhaProjetoLista } from './LinhaProjetoLista'
import type { EstagioProjeto, Projeto } from './tipos'

export interface ListaProjetosProps {
  projetos: Projeto[]
  aoMoverEstagio: (projetoId: number, novoEstagio: EstagioProjeto) => void
  aoCriarNoEstagio: (estagio: EstagioProjeto) => void
  aoClicarProjeto: (projeto: Projeto) => void
  aoExcluirProjeto: (projetoId: number) => void
  aoAlternarSubtarefa?: (projetoId: number, subtarefaId: number) => void
}

interface ColunaConfig {
  valor: EstagioProjeto
  rotulo: string
  dot: string
}

const COLUNAS: ColunaConfig[] = [
  { valor: 'A_FAZER', rotulo: 'A Fazer', dot: 'bg-blue-500' },
  { valor: 'EM_ANDAMENTO', rotulo: 'Em Andamento', dot: 'bg-amber-500' },
  { valor: 'EM_REVISAO', rotulo: 'Em Revisão', dot: 'bg-purple-500' },
  { valor: 'CONCLUIDO', rotulo: 'Concluído', dot: 'bg-emerald-500' },
]

export function ListaProjetos({
  projetos,
  aoMoverEstagio,
  aoCriarNoEstagio,
  aoClicarProjeto,
  aoExcluirProjeto,
  aoAlternarSubtarefa,
}: Readonly<ListaProjetosProps>) {
  const [estagiosAbertos, setEstagiosAbertos] = useState<Record<EstagioProjeto, boolean>>({
    A_FAZER: true,
    EM_ANDAMENTO: true,
    EM_REVISAO: true,
    CONCLUIDO: true,
  })

  function alternarEstagio(estagio: EstagioProjeto) {
    setEstagiosAbertos((prev) => ({
      ...prev,
      [estagio]: !prev[estagio],
    }))
  }

  if (projetos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--cor-linha)] bg-[var(--cor-card)]/50 p-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--cor-fundo)] text-[var(--cor-mutado)] border border-[var(--cor-linha)] mb-3">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
            <line x1="15" y1="3" x2="15" y2="21" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-[var(--cor-texto)]">Nenhum projeto encontrado</h3>
        <p className="mt-1 text-xs text-[var(--cor-mutado)] max-w-sm">
          Crie seu primeiro projeto ou ajuste os filtros para visualizar.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {COLUNAS.map((coluna) => {
        const projetosDoEstagio = projetos.filter((p) => p.estagio === coluna.valor)
        const aberto = estagiosAbertos[coluna.valor]

        return (
          <section
            key={coluna.valor}
            className="rounded-2xl border border-[var(--cor-linha)] bg-[var(--cor-card)] shadow-xs overflow-hidden transition-all"
          >
            {/* Cabeçalho do Acordeão */}
            <div className="flex items-center justify-between px-4 py-3 bg-[var(--cor-fundo)]/60 border-b border-[var(--cor-linha)]">
              <button
                type="button"
                aria-label={`Alternar estágio ${coluna.rotulo}`}
                aria-expanded={aberto}
                onClick={() => alternarEstagio(coluna.valor)}
                className="flex items-center gap-2.5 text-left focus:outline-hidden cursor-pointer group"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className={`text-[var(--cor-mutado)] transition-transform duration-200 group-hover:text-[var(--cor-texto)] ${
                    aberto ? 'rotate-90' : ''
                  }`}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                <span className={`size-2 shrink-0 rounded-full ${coluna.dot}`} />
                <h3 className="text-xs sm:text-sm font-semibold text-[var(--cor-texto)] group-hover:text-[var(--cor-principal)] transition-colors">
                  {coluna.rotulo}
                </h3>
                <span className="rounded-full bg-[var(--cor-card)] px-2 py-0.5 text-[11px] font-semibold text-[var(--cor-mutado)] border border-[var(--cor-linha)] shadow-2xs">
                  {projetosDoEstagio.length}
                </span>
              </button>

              <button
                type="button"
                aria-label={`Adicionar projeto em ${coluna.rotulo}`}
                onClick={() => aoCriarNoEstagio(coluna.valor)}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--cor-linha)] bg-[var(--cor-card)] px-2.5 py-1 text-xs font-medium text-[var(--cor-mutado)] hover:bg-[var(--cor-linha)] hover:text-[var(--cor-texto)] transition-colors cursor-pointer shadow-2xs"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Novo</span>
              </button>
            </div>

            {/* Conteúdo do Acordeão */}
            {aberto && (
              <div>
                {projetosDoEstagio.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[var(--cor-mutado)]">
                    Nenhum projeto neste estágio
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--cor-linha)] text-[11px] font-semibold text-[var(--cor-mutado)] uppercase tracking-wider bg-[var(--cor-fundo)]/30">
                          <th scope="col" className="py-2.5 pl-4 pr-3">Projeto</th>
                          <th scope="col" className="py-2.5 px-3">Categoria</th>
                          <th scope="col" className="py-2.5 px-3">Prioridade</th>
                          <th scope="col" className="py-2.5 px-3">Prazo</th>
                          <th scope="col" className="py-2.5 px-3">Subtarefas</th>
                          <th scope="col" className="py-2.5 px-3">Estágio</th>
                          <th scope="col" className="py-2.5 pl-3 pr-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projetosDoEstagio.map((projeto) => (
                          <LinhaProjetoLista
                            key={projeto.id}
                            projeto={projeto}
                            aoMoverEstagio={aoMoverEstagio}
                            aoClicarProjeto={aoClicarProjeto}
                            aoExcluirProjeto={aoExcluirProjeto}
                            aoAlternarSubtarefa={aoAlternarSubtarefa}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
