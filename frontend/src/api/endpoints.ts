import { api } from './cliente'
import type {
  CadastroRequest,
  CartoesResponse,
  CategoriaRequest,
  CategoriaResponse,
  DefinirSenhaRequest,
  GoogleLoginRequest,
  ItemRequest,
  ItemResponse,
  LancamentoResponse,
  LoginRequest,
  ResumoResponse,
  SalvarLancamentoRequest,
  StatusLancamento,
  UsuarioResponse,
} from './tipos'

const json = (corpo: unknown): RequestInit => ({ body: JSON.stringify(corpo) })
const consulta = (ano: number, mes: number) => `ano=${ano}&mes=${mes}`

// Telas seguintes acrescentam seus tipos (relatório) junto com as páginas.
export const endpoints = {
  auth: {
    me: () => api<UsuarioResponse>('/api/auth/me'),
    login: (req: LoginRequest) => api<UsuarioResponse>('/api/auth/login', { method: 'POST', ...json(req) }),
    cadastro: (req: CadastroRequest) => api<UsuarioResponse>('/api/auth/cadastro', { method: 'POST', ...json(req) }),
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
  resumo: (ano: number, mes: number) => api<ResumoResponse>(`/api/resumo?${consulta(ano, mes)}`),
  saude: () => api<{ status: string }>('/api/health'),
}
