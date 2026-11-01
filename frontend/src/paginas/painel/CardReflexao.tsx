import { useState } from 'react'
import {
  isFavorito,
  obterCitacaoDoDia,
  obterProximaCitacao,
  removerFavorito,
  salvarFavorito,
  type Citacao,
} from './citacoes'

export function CardReflexao() {
  const [agora] = useState(() => new Date())
  const [citacao, setCitacao] = useState<Citacao>(() => obterCitacaoDoDia(agora))
  const [favorito, setFavorito] = useState<boolean>(() => isFavorito(citacao.id))
  const [copiado, setCopiado] = useState(false)

  function alternarFavorito() {
    if (favorito) {
      removerFavorito(citacao.id)
      setFavorito(false)
    } else {
      salvarFavorito(citacao.id)
      setFavorito(true)
    }
  }

  function proxima() {
    const prox = obterProximaCitacao(citacao.id)
    setCitacao(prox)
    setFavorito(isFavorito(prox.id))
    setCopiado(false)
  }

  async function copiar() {
    try {
      const texto = `“${citacao.frase}” — ${citacao.autor}, ${citacao.obra}${citacao.detalhe ? ` (${citacao.detalhe})` : ''}`
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Falha ao copiar ignorada
    }
  }

  return (
    <section
      aria-labelledby="titulo-reflexao-dia"
      className="relative overflow-hidden rounded-[var(--raio-card,22px)] bg-gradient-to-br from-[var(--cor-principal)] to-[var(--cor-principal-fim)] p-5 text-[var(--cor-sobre-principal)] shadow-sm transition-all duration-200 sm:p-6"
    >
      {/* Luz ambiente suave decorativa no fundo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[var(--cor-sobre-principal)]/10 blur-2xl"
      />

      {/* Topo: Tag, Subtítulo e Ações */}
      <div className="relative mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--cor-sobre-principal)]/15 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 items-center rounded-md bg-[var(--cor-sobre-principal)]/15 px-2 text-[11px] font-semibold tracking-wider text-[var(--cor-sobre-principal)] uppercase backdrop-blur-xs">
            <h2 id="titulo-reflexao-dia" className="m-0 text-[11px] font-semibold tracking-wider uppercase">
              Reflexão do dia
            </h2>
          </span>
          <span className="text-xs text-[var(--cor-sobre-principal-suave)]">Sabedoria diária</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Botão Copiar */}
          <button
            type="button"
            onClick={copiar}
            aria-label="Copiar reflexão"
            title={copiado ? 'Copiado!' : 'Copiar citação'}
            className="flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg bg-[var(--cor-sobre-principal)]/10 text-[var(--cor-sobre-principal)] transition-colors hover:bg-[var(--cor-sobre-principal)]/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-sobre-principal)]"
          >
            {copiado ? (
              <svg aria-hidden="true" className="h-4 w-4 text-[var(--cor-positivo)]" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg aria-hidden="true" className="h-4 w-4 text-[var(--cor-sobre-principal)]/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            )}
          </button>

          {/* Botão Favoritar */}
          <button
            type="button"
            onClick={alternarFavorito}
            aria-label={favorito ? 'Remover dos favoritos' : 'Favoritar reflexão'}
            aria-pressed={favorito}
            title={favorito ? 'Remover dos favoritos' : 'Favoritar reflexão'}
            className="flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg bg-[var(--cor-sobre-principal)]/10 text-[var(--cor-sobre-principal)] transition-colors hover:bg-[var(--cor-sobre-principal)]/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-sobre-principal)]"
          >
            <svg
              aria-hidden="true"
              className={`h-4 w-4 transition-transform duration-150 ${favorito ? 'fill-amber-300 text-amber-300 scale-110' : 'text-[var(--cor-sobre-principal)]/80'}`}
              viewBox="0 0 20 20"
              fill={favorito ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={favorito ? '0' : '1.5'}
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>

          {/* Botão Outra Reflexão */}
          <button
            type="button"
            onClick={proxima}
            aria-label="Outra reflexão"
            title="Ver outra reflexão"
            className="flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg bg-[var(--cor-sobre-principal)]/10 text-[var(--cor-sobre-principal)] transition-colors hover:bg-[var(--cor-sobre-principal)]/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-sobre-principal)]"
          >
            <svg aria-hidden="true" className="h-4 w-4 text-[var(--cor-sobre-principal)]/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Frase */}
      <blockquote className="relative my-0 text-[15px] leading-relaxed font-medium text-[var(--cor-sobre-principal)] sm:text-[16px]">
        <p data-testid="frase-reflexao" className="m-0">
          “{citacao.frase}”
        </p>
      </blockquote>

      {/* Autor e Obra */}
      <footer className="mt-3.5 flex items-center justify-between text-xs text-[var(--cor-sobre-principal-suave)]">
        <div>
          <cite data-testid="autor-reflexao" className="font-bold text-[var(--cor-sobre-principal)] not-italic">
            {citacao.autor}
          </cite>
          {', '}
          <span className="italic">{citacao.obra}</span>
          {citacao.detalhe && (
            <span className="opacity-80">
              {' · '}
              {citacao.detalhe}
            </span>
          )}
        </div>
      </footer>
    </section>
  )
}
