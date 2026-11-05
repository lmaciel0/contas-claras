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

const CAMINHOS_FINANCEIRO = GRUPOS_MENU.find((g) => g.titulo === 'Financeiro')?.itens.map((i) => i.caminho) ?? []

/** Os quatro destinos da dock inferior do celular. O resto (Projetos, Cartões, Relatórios...) fica no menu do topo; Finanças fica ativo em todo o grupo Financeiro. */
export const ITENS_DOCK: ItemMenu[] = [
  { rotulo: 'Início', caminho: '/', exata: true },
  { rotulo: 'Tarefas', caminho: '/tarefas' },
  { rotulo: 'Notas', caminho: '/notas' },
  { rotulo: 'Finanças', caminho: '/financeiro', comMes: true, tambemAtivoEm: CAMINHOS_FINANCEIRO },
]
