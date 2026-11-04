import type { FaixaUso } from '../../api/tipos'

/** Cor do preenchimento da barra por faixa de uso (a faixa vem pronta da API). */
export const COR_DA_BARRA: Record<Exclude<FaixaUso, 'SEM_LIMITE'>, string> = {
  VERDE: '#2E9E5B',
  AMARELO: '#E0A100',
  VERMELHO: '#D64545',
}

// Texto do chip um tom mais escuro que a barra para chegar a 4,5:1 sobre o fundo claro (WCAG AA); tokens em index.css.
export const CLASSE_DO_CHIP: Record<Exclude<FaixaUso, 'SEM_LIMITE'>, string> = {
  VERDE: 'bg-[var(--cor-ok-fundo)] text-[var(--cor-positivo-texto)]',
  AMARELO: 'bg-[var(--cor-aviso-fundo)] text-[var(--cor-aviso-texto)]',
  VERMELHO: 'bg-[var(--cor-erro-fundo)] text-[var(--cor-negativo-texto)]',
}
