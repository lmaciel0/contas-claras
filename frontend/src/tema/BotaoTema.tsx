import { useTema } from './useTema'

/** Raios do sol; na lua eles somem e o primeiro item vira o crescente. */
const PARTES_DO_ICONE = [0, 1, 2, 3, 4, 5, 6, 7, 8]

/** Switch sol/lua que alterna o tema da interface. O estado vem de `useTema`, que também grava a escolha. */
export function BotaoTema() {
  const { tema, alternar } = useTema()

  return (
    <label className="theme">
      <span className="theme__toggle-wrap">
        <input
          className="theme__toggle"
          type="checkbox"
          role="switch"
          aria-label="Tema escuro"
          checked={tema === 'escuro'}
          onChange={alternar}
        />
        <span className="theme__icon" aria-hidden="true">
          {PARTES_DO_ICONE.map((parte) => (
            <span key={parte} className="theme__icon-part" />
          ))}
        </span>
      </span>
    </label>
  )
}
