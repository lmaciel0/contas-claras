import { rotuloMes } from '../formato/mes'
import { useMesSelecionado } from './useMesSelecionado'

const botao =
  'grid h-8 min-w-8 place-items-center rounded-full text-[var(--cor-principal)] hover:bg-[var(--cor-fundo)] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--cor-principal)]'

/** `‹ Outubro 2026 ›`: troca o mês em foco (guardado na URL). */
export function SeletorMes() {
  const { ano, mes, anterior, seguinte } = useMesSelecionado()

  return (
    <div className="flex items-center gap-1 rounded-full bg-[var(--cor-card)] px-1 py-0.5 text-sm font-semibold shadow-sm">
      <button type="button" className={botao} aria-label="Mês anterior" onClick={anterior}>
        <span aria-hidden="true">‹</span>
      </button>
      <span className="min-w-28 text-center" aria-live="polite">
        {rotuloMes(ano, mes)}
      </span>
      <button type="button" className={botao} aria-label="Mês seguinte" onClick={seguinte}>
        <span aria-hidden="true">›</span>
      </button>
    </div>
  )
}
