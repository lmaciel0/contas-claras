import { api } from '../../api/cliente'
import type {
  FiltroProjetos,
  Projeto,
  ProjetoCriacaoRequisicao,
  ProjetoEdicaoRequisicao,
  ProjetoMoverEstagioRequisicao,
  Subtarefa,
  SubtarefaCriacaoRequisicao,
} from './tipos'

export type { FiltroProjetos }

const json = (corpo: unknown): RequestInit => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(corpo),
})

function montarQuery(filtro?: FiltroProjetos): string {
  if (!filtro) return ''
  const params = new URLSearchParams()
  if (filtro.busca && filtro.busca.trim()) params.set('busca', filtro.busca.trim())
  if (filtro.prioridade) params.set('prioridade', filtro.prioridade)
  const texto = params.toString()
  return texto ? `?${texto}` : ''
}

export const projetosApi = {
  listar: (filtro?: FiltroProjetos) =>
    api<Projeto[]>(`/api/projetos${montarQuery(filtro)}`),

  obterPorId: (id: number) =>
    api<Projeto>(`/api/projetos/${id}`),

  criar: (req: ProjetoCriacaoRequisicao) =>
    api<Projeto>('/api/projetos', { method: 'POST', ...json(req) }),

  atualizar: (id: number, req: ProjetoEdicaoRequisicao) =>
    api<Projeto>(`/api/projetos/${id}`, { method: 'PUT', ...json(req) }),

  moverEstagio: (id: number, req: ProjetoMoverEstagioRequisicao) =>
    api<Projeto>(`/api/projetos/${id}/estagio`, { method: 'PATCH', ...json(req) }),

  excluir: (id: number) =>
    api<void>(`/api/projetos/${id}`, { method: 'DELETE' }),

  adicionarSubtarefa: (projetoId: number, req: SubtarefaCriacaoRequisicao) =>
    api<Subtarefa>(`/api/projetos/${projetoId}/subtarefas`, { method: 'POST', ...json(req) }),

  alternarSubtarefa: (projetoId: number, subtarefaId: number) =>
    api<Subtarefa>(`/api/projetos/${projetoId}/subtarefas/${subtarefaId}/alternar`, { method: 'PATCH' }),

  excluirSubtarefa: (projetoId: number, subtarefaId: number) =>
    api<void>(`/api/projetos/${projetoId}/subtarefas/${subtarefaId}`, { method: 'DELETE' }),
}
