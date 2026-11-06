export interface ItemMenu {
  rotulo: string
  caminho: string
  /** Só fica ativo na rota exata (Início, para não acender em todas as telas). */
  exata?: boolean
  /** O link leva `?ano=&mes=` do mês em foco. */
  comMes?: boolean
  /** Outros caminhos em que o item também fica ativo (ele é o atalho de um grupo inteiro). */
  tambemAtivoEm?: string[]
}

export interface GrupoMenu {
  titulo: string | null
  itens: ItemMenu[]
}

/** Itens do menu lateral. Projetos e calendário entram aqui quando o módulo existir. */
export const GRUPOS_MENU: GrupoMenu[] = [
  {
    titulo: null,
    itens: [
      { rotulo: 'Início', caminho: '/', exata: true },
      { rotulo: 'Projetos', caminho: '/projetos' },
      { rotulo: 'Tarefas', caminho: '/tarefas' },
      { rotulo: 'Notas', caminho: '/notas' },
    ],
  },
  {
    titulo: 'Financeiro',
    itens: [
      { rotulo: 'Visão geral', caminho: '/financeiro', comMes: true },
      { rotulo: 'Orçamento', caminho: '/lancamentos', comMes: true },
      { rotulo: 'Cartões', caminho: '/cartoes', comMes: true },
      { rotulo: 'Categorias', caminho: '/categorias' },
      { rotulo: 'Relatórios', caminho: '/relatorios' },
    ],
  },
]

const TODOS_OS_ITENS = GRUPOS_MENU.flatMap((g) => g.itens)

/** Atalhos que ficam fora da dock do celular e moram na página Mais, nesta ordem. */
const ORDEM_MAIS = ['/tarefas', '/projetos', '/financeiro', '/cartoes', '/categorias', '/relatorios']

export const ITENS_MAIS: ItemMenu[] = ORDEM_MAIS.flatMap((caminho) => TODOS_OS_ITENS.filter((i) => i.caminho === caminho))

/** Rotas em que o item "Mais" da dock fica ativo: os atalhos da página e as telas de conta. */
export const CAMINHOS_MAIS: string[] = [...ITENS_MAIS.map((i) => i.caminho), '/mais', '/conta/senha', '/conta/excluir']

/** Os destinos da dock inferior do celular. O botão "Criar" fica entre Notas e Orçamento e não é item. O resto mora em Mais. */
export const ITENS_DOCK: ItemMenu[] = [
  { rotulo: 'Início', caminho: '/', exata: true },
  { rotulo: 'Notas', caminho: '/notas' },
  { rotulo: 'Orçamento', caminho: '/lancamentos', comMes: true },
  { rotulo: 'Mais', caminho: '/mais', tambemAtivoEm: CAMINHOS_MAIS },
]
