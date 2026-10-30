// Tipos espelham os DTOs do backend. Dinheiro chega como string decimal ("1234.56") e campos
// anuláveis chegam como `null` explícito. Frações (percentual, uso) vêm com 4 casas ("0.4815").

export type TipoCategoria = 'RECEITA' | 'DESPESA'
export type StatusLancamento = 'PREVISTO' | 'PAGO'
export type FaixaUso = 'VERDE' | 'AMARELO' | 'VERMELHO' | 'SEM_LIMITE'

export interface ErroResposta {
  erro: string
}

// Auth
export interface UsuarioResponse {
  id: number
  nome: string
  email: string
  temSenha: boolean
}
export interface LoginRequest {
  email: string
  senha: string
}
export interface CadastroRequest {
  nome: string
  email: string
  senha: string
}
export interface GoogleLoginRequest {
  credential: string
}
export interface DefinirSenhaRequest {
  /** Obrigatória para quem já tem senha; contas só com Google definem a primeira sem ela. */
  senhaAtual?: string
  senha: string
}

// Categorias e itens
export interface ItemResponse {
  id: number
  nome: string
  diaVencimento: number | null
  cartao: boolean
  limite: string | null
  arquivado: boolean
}
export interface CategoriaResponse {
  id: number
  nome: string
  tipo: TipoCategoria
  ordem: number
  itens: ItemResponse[]
}
export interface CategoriaRequest {
  nome: string
  /** Obrigatório só na criação. */
  tipo?: TipoCategoria
}
export interface ItemRequest {
  nome: string
  diaVencimento: number | null
  cartao: boolean
  limite: string | null
  /** Obrigatório só no PUT. */
  arquivado?: boolean
}

// Lançamentos
export interface LancamentoResponse {
  id: number
  itemId: number
  itemNome: string
  categoriaId: number
  categoriaNome: string
  tipo: TipoCategoria
  ano: number
  mes: number
  valor: string
  status: StatusLancamento
  /** Data ISO `yyyy-MM-dd`. */
  vencimento: string | null
}
export interface MesAnoRequest {
  ano: number
  mes: number
}
export interface SalvarLancamentoRequest {
  itemId: number
  ano: number
  mes: number
  valor: string
  status: StatusLancamento
  vencimento?: string | null
  repetirAte?: MesAnoRequest | null
}
