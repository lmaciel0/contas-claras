import { useState } from 'react'
import { Check, Palette } from 'lucide-react'
import { CORES_CATEGORIA, COR_PADRAO, obterCorValida } from './paletaCores'

interface Props {
  valor?: string
  aoMudar: (cor: string) => void
}

export function SeletorCor({ valor, aoMudar }: Props) {
  const [expandido, setExpandido] = useState(false)
  const corAtual = obterCorValida(valor)

  // As primeiras 4 cores aparecem no seletor rápido (como no Print 3)
  const coresRapidas = CORES_CATEGORIA.slice(0, 4)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--cor-mutado)]">
        <Palette className="size-4" aria-hidden="true" />
        <span>Cor da categoria</span>
      </div>

      <div
        role="radiogroup"
        aria-label="Cores da categoria"
        className="flex flex-wrap items-center gap-2.5"
      >
        {coresRapidas.map((cor) => {
          const selecionado = corAtual.toLowerCase() === cor.hex.toLowerCase()
          return (
            <button
              key={cor.id}
              type="button"
              role="radio"
              aria-checked={selecionado}
              aria-label={cor.nome}
              onClick={() => aoMudar(cor.hex)}
              className="relative grid size-8 place-items-center rounded-full transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
              style={{ backgroundColor: cor.hex }}
            >
              {selecionado && <Check className="size-4 text-white drop-shadow-sm" aria-hidden="true" />}
            </button>
          )
        })}

        <button
          type="button"
          onClick={() => setExpandido((prev) => !prev)}
          className="rounded-full bg-[var(--cor-linha)] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--cor-texto)] transition-colors hover:bg-[var(--cor-linha)]/80 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--cor-principal)]"
        >
          Outros
        </button>
      </div>

      {expandido && (
        <div className="mt-2 flex flex-col gap-2 rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-fundo)] p-3">
          <p className="m-0 text-xs text-[var(--cor-mutado)]">Mais cores pré-definidas ou personalizada:</p>
          <div className="flex flex-wrap items-center gap-2">
            {CORES_CATEGORIA.slice(4).map((cor) => {
              const selecionado = corAtual.toLowerCase() === cor.hex.toLowerCase()
              return (
                <button
                  key={cor.id}
                  type="button"
                  role="radio"
                  aria-checked={selecionado}
                  aria-label={cor.nome}
                  onClick={() => aoMudar(cor.hex)}
                  className="relative grid size-7 place-items-center rounded-full transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
                  style={{ backgroundColor: cor.hex }}
                >
                  {selecionado && <Check className="size-3.5 text-white drop-shadow-sm" aria-hidden="true" />}
                </button>
              )
            })}
          </div>

          <div className="mt-1 flex items-center gap-2">
            <label htmlFor="cor-personalizada" className="text-xs font-medium text-[var(--cor-texto)]">
              Cor personalizada:
            </label>
            <input
              id="cor-personalizada"
              type="color"
              value={corAtual}
              onChange={(e) => aoMudar(e.target.value)}
              className="size-8 cursor-pointer rounded border border-[var(--cor-linha)] bg-transparent p-0"
            />
            <span className="font-mono text-xs uppercase text-[var(--cor-mutado)]">{corAtual}</span>
          </div>
        </div>
      )}
    </div>
  )
}
