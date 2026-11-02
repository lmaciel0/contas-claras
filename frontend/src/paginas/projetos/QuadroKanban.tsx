import { ColunaKanban } from './ColunaKanban'
import type { EstagioProjeto, Projeto } from './tipos'

export interface QuadroKanbanProps {
  projetos: Projeto[]
  aoMover: (projetoId: number, novoEstagio: EstagioProjeto) => void
  aoCriarNoEstagio: (estagio: EstagioProjeto) => void
  aoClicarCard: (projeto: Projeto) => void
  aoExcluirCard: (projetoId: number) => void
}

const COLUNAS: { estagio: EstagioProjeto; titulo: string }[] = [
  { estagio: 'A_FAZER', titulo: 'A Fazer' },
  { estagio: 'EM_ANDAMENTO', titulo: 'Em Andamento' },
  { estagio: 'EM_REVISAO', titulo: 'Em Revisão' },
  { estagio: 'CONCLUIDO', titulo: 'Concluído' },
]

export function QuadroKanban({
  projetos,
  aoMover,
  aoCriarNoEstagio,
  aoClicarCard,
  aoExcluirCard,
}: QuadroKanbanProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 items-start">
      {COLUNAS.map((coluna) => {
        const projetosNaColuna = projetos.filter((p) => p.estagio === coluna.estagio)
        return (
          <ColunaKanban
            key={coluna.estagio}
            estagio={coluna.estagio}
            titulo={coluna.titulo}
            projetos={projetosNaColuna}
            aoMover={aoMover}
            aoCriarNoEstagio={aoCriarNoEstagio}
            aoClicarCard={aoClicarCard}
            aoExcluirCard={aoExcluirCard}
          />
        )
      })}
    </div>
  )
}
