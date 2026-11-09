import type { ReactNode } from 'react'
import type { IdAtalhoMobile } from '../../preferencias/preferenciasTipos'
import {
  CreditCard,
  PlusCircle,
  TrendingUp,
  FileText,
  DollarSign,
  BarChart3,
  Tag,
  LayoutGrid,
} from 'lucide-react'

export interface AtalhoInfo {
  id: IdAtalhoMobile
  rotulo: string
  descricao: string
  icone: (classe?: string) => ReactNode
  tipo: 'link'
  caminho: string
  search?: string
  comMes?: boolean
  state?: Record<string, unknown>
}

export const CATALOGO_ATALHOS: Record<IdAtalhoMobile, AtalhoInfo> = {
  'novo-lancamento': {
    id: 'novo-lancamento',
    rotulo: '+ Despesa',
    descricao: 'Lançar nova despesa ou conta',
    icone: (classe = 'size-5') => <PlusCircle className={classe} />,
    tipo: 'link',
    caminho: '/lancamentos/novo',
    comMes: true,
  },
  cartoes: {
    id: 'cartoes',
    rotulo: 'Cartões',
    descricao: 'Ver faturas e limites dos cartões',
    icone: (classe = 'size-5') => <CreditCard className={classe} />,
    tipo: 'link',
    caminho: '/cartoes',
    comMes: true,
  },
  'nova-nota': {
    id: 'nova-nota',
    rotulo: '+ Nota',
    descricao: 'Escrever uma nova anotação',
    icone: (classe = 'size-5') => <FileText className={classe} />,
    tipo: 'link',
    caminho: '/notas',
    state: { nova: true },
  },
  'nova-receita': {
    id: 'nova-receita',
    rotulo: '+ Receita',
    descricao: 'Lançar ganho ou receita',
    icone: (classe = 'size-5') => <TrendingUp className={classe} />,
    tipo: 'link',
    caminho: '/lancamentos/novo',
    search: '?tipo=RECEITA',
    comMes: true,
  },
  orcamento: {
    id: 'orcamento',
    rotulo: 'Orçamento',
    descricao: 'Planejamento e controle do mês',
    icone: (classe = 'size-5') => <DollarSign className={classe} />,
    tipo: 'link',
    caminho: '/orcamento',
    comMes: true,
  },
  relatorios: {
    id: 'relatorios',
    rotulo: 'Relatórios',
    descricao: 'Evolução anual e gráficos',
    icone: (classe = 'size-5') => <BarChart3 className={classe} />,
    tipo: 'link',
    caminho: '/relatorios',
    comMes: true,
  },
  categorias: {
    id: 'categorias',
    rotulo: 'Categorias',
    descricao: 'Gerenciar categorias e itens',
    icone: (classe = 'size-5') => <Tag className={classe} />,
    tipo: 'link',
    caminho: '/categorias',
  },
  'visao-geral': {
    id: 'visao-geral',
    rotulo: 'Visão Geral',
    descricao: 'Dashboard financeiro do mês',
    icone: (classe = 'size-5') => <LayoutGrid className={classe} />,
    tipo: 'link',
    caminho: '/inicio',
    comMes: true,
  },
}

export const LISTA_ATALHOS = Object.values(CATALOGO_ATALHOS)
