export type EstagioProjeto = 'A_FAZER' | 'EM_ANDAMENTO' | 'EM_REVISAO' | 'CONCLUIDO'

export type PrioridadeProjeto = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE'

export type CorProjeto = 'azul' | 'esmeralda' | 'indigo' | 'ambar' | 'rosa' | 'roxo'

export interface Subtarefa {
  id: number
  titulo: string
  concluida: boolean
  ordem: number
}

export interface Projeto {
  id: number
  titulo: string
  descricao: string | null
  categoria: string | null
  estagio: EstagioProjeto
  prioridade: PrioridadeProjeto
  cor: CorProjeto
  ordem: number
  prazo: string | null
  porcentagemProgresso: number
  totalSubtarefas: number
  subtarefasConcluidas: number
  subtarefas: Subtarefa[]
  criadoEm: string
  atualizadoEm: string
}

export interface ProjetoCriacaoRequisicao {
  titulo: string
  descricao?: string | null
  categoria?: string | null
  estagio?: EstagioProjeto
  prioridade?: PrioridadeProjeto
  cor?: CorProjeto
  prazo?: string | null
  subtarefas?: string[]
}

export interface ProjetoEdicaoRequisicao {
  titulo: string
  descricao?: string | null
  categoria?: string | null
  prioridade?: PrioridadeProjeto
  cor?: CorProjeto
  prazo?: string | null
}

export interface ProjetoMoverEstagioRequisicao {
  estagio: EstagioProjeto
  novaOrdem?: number
}

export interface SubtarefaCriacaoRequisicao {
  titulo: string
}

export interface FiltroProjetos {
  busca?: string
  prioridade?: PrioridadeProjeto
}
