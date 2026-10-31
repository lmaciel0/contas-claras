export interface ItemMenu {
  rotulo: string
  caminho: string
  /** Só fica ativo na rota exata (Início, para não acender em todas as telas). */
  exata?: boolean
  /** O link leva `?ano=&mes=` do mês em foco. */
  comMes?: boolean
}

export interface GrupoMenu {
  titulo: string | null
  itens: ItemMenu[]
}

/** Itens do menu lateral. Notas, projetos e calendário entram aqui quando o módulo existir. */
export const GRUPOS_MENU: GrupoMenu[] = [
  {
    titulo: null,
    itens: [
      { rotulo: 'Início', caminho: '/', exata: true },
      { rotulo: 'Tarefas', caminho: '/tarefas' },
    ],
  },
  {
    titulo: 'Financeiro',
    itens: [
      { rotulo: 'Visão geral', caminho: '/financeiro', comMes: true },
      { rotulo: 'Lançamentos', caminho: '/lancamentos', comMes: true },
      { rotulo: 'Cartões', caminho: '/cartoes', comMes: true },
      { rotulo: 'Categorias', caminho: '/categorias' },
      { rotulo: 'Relatórios', caminho: '/relatorios' },
    ],
  },
]
