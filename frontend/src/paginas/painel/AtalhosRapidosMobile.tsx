import { useState } from 'react'
import { Link } from 'react-router'
import { SlidersHorizontal } from 'lucide-react'
import { useMesSelecionado } from '../../layout/useMesSelecionado'
import { usePreferencias } from '../../preferencias/usePreferencias'
import { ATALHOS_PADRAO } from '../../preferencias/preferenciasStorage'
import { CATALOGO_ATALHOS, type AtalhoInfo } from './atalhosCatalogo'
import { ModalPersonalizarAtalhos } from './ModalPersonalizarAtalhos'

function getDestino(atalho: AtalhoInfo, busca: string): { pathname: string; search?: string } {
  const params = new URLSearchParams(atalho.search ? atalho.search.replace(/^\?/, '') : '')
  if (atalho.comMes && busca) {
    const buscaParams = new URLSearchParams(busca.replace(/^\?/, ''))
    buscaParams.forEach((val, key) => params.set(key, val))
  }
  const queryString = params.toString()
  return {
    pathname: atalho.caminho,
    search: queryString ? `?${queryString}` : '',
  }
}

export function AtalhosRapidosMobile() {
  const { busca } = useMesSelecionado()
  const { preferencias } = usePreferencias()
  const [personalizarAberto, setPersonalizarAberto] = useState(false)

  const ids = preferencias.atalhosMobile ?? ATALHOS_PADRAO
  const atalhos: AtalhoInfo[] = ids
    .map((id) => CATALOGO_ATALHOS[id])
    .filter((a): a is AtalhoInfo => Boolean(a))
    .slice(0, 4)

  return (
    <section aria-label="Acesso rápido" className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--cor-mutado)]">
          Acesso rápido
        </span>
        <button
          type="button"
          onClick={() => setPersonalizarAberto(true)}
          className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-[var(--cor-principal)] hover:underline"
          aria-label="Personalizar atalhos"
        >
          <SlidersHorizontal className="size-3" />
          Personalizar
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
        {atalhos.map((atalho) => {
          const destino = getDestino(atalho, busca)
          return (
            <Link
              key={atalho.id}
              to={destino}
              state={atalho.state}
              aria-label={atalho.rotulo}
              className="group flex flex-col items-center gap-1.5 rounded-2xl p-1 text-center no-underline transition-transform active:scale-95"
            >
              <div className="flex size-13 items-center justify-center rounded-2xl border border-[var(--cor-linha)] bg-[var(--cor-card)] text-[var(--cor-principal)] shadow-xs transition-colors group-hover:border-[var(--cor-principal)] group-hover:bg-[var(--cor-principal)]/10">
                {atalho.icone('size-6')}
              </div>
              <span className="w-full truncate text-[11px] font-semibold text-[var(--cor-texto)]">
                {atalho.rotulo}
              </span>
            </Link>
          )
        })}
      </div>

      <ModalPersonalizarAtalhos
        aberto={personalizarAberto}
        aoFechar={() => setPersonalizarAberto(false)}
      />
    </section>
  )
}
