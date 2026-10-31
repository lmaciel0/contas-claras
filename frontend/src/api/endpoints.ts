import { api } from './cliente'
import type {
  CadastroRequest,
  CartoesResponse,
  CategoriaRequest,
  CategoriaResponse,
  ConfirmarCadastroRequest,
  DefinirSenhaRequest,
  EmailRequest,
  GoogleLoginRequest,
  ItemRequest,
  ItemResponse,
  LancamentoResponse,
  LoginRequest,
  RedefinirSenhaRequest,
  RelatorioAnualResponse,
  ResumoResponse,
  SalvarLancamentoRequest,
  StatusLancamento,
  TarefaRequest,
  TarefaResponse,
  TarefasResponse,
  UsuarioResponse,
} from './tipos'

const json = (corpo: unknown): RequestInit => ({ body: JSON.stringify(corpo) })
const consulta = (ano: number, mes: number) => `ano=${ano}&mes=${mes}`

export const endpoints = {
  auth: {
    me: () => api<UsuarioResponse>('/api/auth/me'),
    login: (req: LoginRequest) => api<UsuarioResponse>('/api/auth/login', { method: 'POST', ...json(req) }),
    // 202 sem corpo e sem sessão: a conta só nasce quando o e-mail é confirmado.
    cadastro: (req: CadastroRequest) => api<void>('/api/auth/cadastro', { method: 'POST', ...json(req) }),
    reenviarCadastro: (req: EmailRequest) =>
      api<void>('/api/auth/cadastro/reenviar', { method: 'POST', ...json(req) }),
    confirmarCadastro: (req: ConfirmarCadastroRequest) =>
      api<UsuarioResponse>('/api/auth/cadastro/confirmar', { method: 'POST', ...json(req) }),
    esqueciSenha: (req: EmailRequest) => api<void>('/api/auth/esqueci-senha', { method: 'POST', ...json(req) }),
    redefinirSenha: (req: RedefinirSenhaRequest) =>
      api<UsuarioResponse>('/api/auth/redefinir-senha', { method: 'POST', ...json(req) }),
    google: (req: GoogleLoginRequest) => api<UsuarioResponse>('/api/auth/google', { method: 'POST', ...json(req) }),
    logout: () => api<void>('/api/auth/logout', { method: 'POST' }),
    definirSenha: (req: DefinirSenhaRequest) => api<void>('/api/auth/senha', { method: 'PUT', ...json(req) }),
  },
  categorias: {
    listar: () => api<CategoriaResponse[]>('/api/categorias'),
    criar: (req: CategoriaRequest) => api<CategoriaResponse>('/api/categorias', { method: 'POST', ...json(req) }),
    renomear: (id: number, req: CategoriaRequest) =>
      api<CategoriaResponse>(`/api/categorias/${id}`, { method: 'PUT', ...json(req) }),
    reordenar: (ids: number[]) => api<void>('/api/categorias/ordem', { method: 'PUT', ...json({ ids }) }),
    excluir: (id: number) => api<void>(`/api/categorias/${id}`, { method: 'DELETE' }),
  },
  itens: {
    criar: (categoriaId: number, req: ItemRequest) =>
      api<ItemResponse>(`/api/categorias/${categoriaId}/itens`, { method: 'POST', ...json(req) }),
    atualizar: (id: number, req: ItemRequest) =>
      api<ItemResponse>(`/api/itens/${id}`, { method: 'PUT', ...json(req) }),
  },
  cartoes: {
    listar: (ano: number, mes: number) => api<CartoesResponse>(`/api/cartoes?${consulta(ano, mes)}`),
  },
  lancamentos: {
    listar: (ano: number, mes: number) => api<LancamentoResponse[]>(`/api/lancamentos?${consulta(ano, mes)}`),
    salvar: (req: SalvarLancamentoRequest) =>
      api<LancamentoResponse[]>('/api/lancamentos', { method: 'PUT', ...json(req) }),
    mudarStatus: (id: number, status: StatusLancamento) =>
      api<LancamentoResponse>(`/api/lancamentos/${id}/status`, { method: 'PATCH', ...json({ status }) }),
    excluir: (id: number) => api<void>(`/api/lancamentos/${id}`, { method: 'DELETE' }),
  },
  tarefas: {
    listar: () => api<TarefasResponse>('/api/tarefas'),
    criar: (req: TarefaRequest) => api<TarefaResponse>('/api/tarefas', { method: 'POST', ...json(req) }),
    editar: (id: number, req: TarefaRequest) =>
      api<TarefaResponse>(`/api/tarefas/${id}`, { method: 'PUT', ...json(req) }),
    concluir: (id: number, concluida: boolean) =>
      api<TarefaResponse>(`/api/tarefas/${id}/concluida`, { method: 'PATCH', ...json({ concluida }) }),
    excluir: (id: number) => api<void>(`/api/tarefas/${id}`, { method: 'DELETE' }),
  },
  relatorios: {
    ano: (ano: number) => api<RelatorioAnualResponse>(`/api/relatorios/ano/${ano}`),
  },
  resumo: (ano: number, mes: number) => api<ResumoResponse>(`/api/resumo?${consulta(ano, mes)}`),
  saude: () => api<{ status: string }>('/api/health'),
}
