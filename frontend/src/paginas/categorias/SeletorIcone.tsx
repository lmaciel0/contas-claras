import { useState } from 'react'
import { Image, Search, X } from 'lucide-react'
import { CATALOGO_ICONES, ICONE_PADRAO, renderizarIcone } from './catalogoIcones'

interface Props {
  valor?: string
  aoMudar: (icone: string) => void
}

export function SeletorIcone({ valor, aoMudar }: Props) {
  const [expandido, setExpandido] = useState(false)
  const [busca, setBusca] = useState('')
  const iconeAtual = (valor || ICONE_PADRAO).toLowerCase().trim()

  // Primeiros ícones para a barra rápida (como no Print 3: restaurante, transporte, casa, outros)
  const iconesRapidos = [
    { id: 'restaurante', nome: 'Restaurante' },
    { id: 'transporte', nome: 'Transporte' },
    { id: 'casa', nome: 'Casa' },
    { id: 'outros', nome: 'Outros' },
  ]

  const filtrados = CATALOGO_ICONES.filter(
    (item) =>
      item.nome.toLowerCase().includes(busca.toLowerCase()) ||
      item.id.toLowerCase().includes(busca.toLowerCase()) ||
      item.categoria.toLowerCase().includes(busca.toLowerCase()),
  )

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--cor-mutado)]">
        <Image className="size-4" aria-hidden="true" />
        <span>Ícone</span>
      </div>

      <div
        role="radiogroup"
        aria-label="Ícone da categoria"
        className="flex flex-wrap items-center gap-2.5"
      >
        {iconesRapidos.map((item) => {
          const selecionado = iconeAtual === item.id
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={selecionado}
              aria-label={item.nome}
              onClick={() => aoMudar(item.id)}
              className={`grid size-9 place-items-center rounded-full border transition-all ${
                selecionado
                  ? 'border-[var(--cor-principal)] bg-[var(--cor-principal)] text-white shadow-sm'
                  : 'border-[var(--cor-linha)] bg-[var(--cor-fundo)] text-[var(--cor-mutado)] hover:bg-[var(--cor-linha)]/50'
              } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]`}
            >
              {renderizarIcone(item.id, 'size-4')}
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
        <div className="mt-2 flex flex-col gap-2.5 rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-fundo)] p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex flex-1 items-center">
              <Search className="absolute left-2.5 size-3.5 text-[var(--cor-mutado)]" aria-hidden="true" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar ícone..."
                className="w-full rounded-lg border border-[var(--cor-linha)] bg-[var(--cor-card)] py-1.5 pr-2.5 pl-8 text-xs text-[var(--cor-texto)] placeholder:text-[var(--cor-mutado)] focus-visible:outline-2 focus-visible:outline-[var(--cor-principal)]"
              />
            </div>
            <button
              type="button"
              aria-label="Fechar catálogo de ícones"
              onClick={() => setExpandido(false)}
              className="grid size-7 place-items-center rounded-lg text-[var(--cor-mutado)] hover:bg-[var(--cor-linha)]"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div
            role="radiogroup"
            aria-label="Catálogo completo de ícones"
            className="grid max-h-48 grid-cols-6 gap-2 overflow-y-auto p-1"
          >
            {filtrados.map((item) => {
              const selecionado = iconeAtual === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={selecionado}
                  aria-label={item.nome}
                  title={item.nome}
                  onClick={() => {
                    aoMudar(item.id)
                    setExpandido(false)
                  }}
                  className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2 transition-all ${
                    selecionado
                      ? 'border-[var(--cor-principal)] bg-[var(--cor-principal)] text-white'
                      : 'border-[var(--cor-linha)] bg-[var(--cor-card)] text-[var(--cor-texto)] hover:border-[var(--cor-principal)]/40 hover:bg-[var(--cor-linha)]/30'
                  } focus-visible:outline-2 focus-visible:outline-[var(--cor-principal)]`}
                >
                  {renderizarIcone(item.id, 'size-4')}
                  <span className="max-w-full truncate text-[10px]">{item.nome.split('/')[0]?.trim()}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
