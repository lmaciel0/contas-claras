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
/** Pede o cadastro. Sem senha: ela só é definida em `/confirmar`, depois da prova de posse do e-mail. */
export interface CadastroRequest {
  nome: string
  email: string
}
/** Pedidos que só levam o e-mail (reenviar o código do cadastro, esqueci a senha). */
export interface EmailRequest {
  email: string
}
/** Confirma o cadastro por código (`email` + `codigo` de 6 dígitos) ou pelo link do e-mail (`token`), já com a senha. */
export type ConfirmarCadastroRequest = ({ email: string; codigo: string } | { token: string }) & { senha: string }
export interface RedefinirSenhaRequest {
  email: string
  codigo: string
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

// Cartões (fatura do mês contra o limite)
export interface CartaoResponse {
  itemId: number
  nome: string
  diaVencimento: number | null
  fatura: string
  limite: string | null
  /** Fração com 4 casas (`"0.7300"` = 73%); `null` sem limite. Pode passar de 1. */
  uso: string | null
  faixa: FaixaUso
}
export interface CartoesResponse {
  totalFaturas: string
  limiteTotal: string
  /** `null` quando nenhum cartão tem limite. */
  usoGeral: string | null
  cartoes: CartaoResponse[]
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

// Resumo (tela Início)
export interface TotaisMes {
  receitas: string
  despesas: string
  sobra: string
}
export interface CategoriaTotal {
  categoriaId: number
  nome: string
  total: string
  /** Fração de 0 a 1 com 4 casas (`"0.4815"` = 48,15%). */
  percentual: string
}
export interface ProximaConta {
  lancamentoId: number
  itemNome: string
  categoriaNome: string
  valor: string
  /** Data ISO `yyyy-MM-dd`. */
  vencimento: string
  atrasada: boolean
}
/** Um mês da série do ano; os campos "previstas" são a parte ainda não paga do total do mesmo lado. */
export interface PontoSerie {
  mes: number
  receitas: string
  receitasPrevistas: string
  despesas: string
  despesasPrevistas: string
}
export interface ResumoResponse {
  receitas: string
  despesas: string
  sobra: string
  sobraAno: string
  /** `null` quando o mês anterior não tem nenhum lançamento. */
  anterior: TotaisMes | null
  categorias: CategoriaTotal[]
  proximas: ProximaConta[]
  serieAno: PontoSerie[]
}

// Relatório anual (tela Relatórios)
/** Um lançamento do mês na tabela; o mês sem lançamento chega como `null` na lista. */
export interface CelulaRelatorio {
  valor: string
  status: StatusLancamento
}
export interface ItemRelatorio {
  itemId: number
  nome: string
  /** Sempre 12 posições (janeiro a dezembro); `null` onde o item não tem lançamento. */
  meses: (CelulaRelatorio | null)[]
  total: string
}
export interface CategoriaRelatorio {
  categoriaId: number
  nome: string
  tipo: TipoCategoria
  /** Só itens com ao menos um lançamento no ano. */
  itens: ItemRelatorio[]
  /** 12 subtotais (janeiro a dezembro). */
  totaisMes: string[]
  total: string
}
export interface RelatorioAnualResponse {
  ano: number
  /** Receitas primeiro, depois por ordem; categoria sem lançamento no ano não vem. */
  categorias: CategoriaRelatorio[]
  /** Cada lista tem 12 valores (janeiro a dezembro). */
  receitasMes: string[]
  despesasMes: string[]
  diferencaMes: string[]
  receitasAno: string
  despesasAno: string
  diferencaAno: string
}
