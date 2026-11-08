import { useState } from 'react'
import { Check, RotateCcw, X } from 'lucide-react'
import { useDialogoModal } from '../../layout/useDialogoModal'
import { FundoDoDialogo } from '../../layout/FundoDoDialogo'
import { usePreferencias } from '../../preferencias/usePreferencias'
import { ATALHOS_PADRAO } from '../../preferencias/preferenciasStorage'
import type { IdAtalhoMobile } from '../../preferencias/preferenciasTipos'
import { LISTA_ATALHOS, type AtalhoInfo } from './atalhosCatalogo'

interface Props {
  aberto: boolean
  aoFechar: () => void
}

export function ModalPersonalizarAtalhos({ aberto, aoFechar }: Props) {
  const { preferencias, setAtalhosMobile } = usePreferencias()
  const { painel, prenderFoco } = useDialogoModal(aberto, aoFechar)

  const [selecionados, setSelecionados] = useState<IdAtalhoMobile[]>(() => preferencias.atalhosMobile ?? ATALHOS_PADRAO)

  if (!aberto) {
    return null
  }

  const toggleAtalho = (id: IdAtalhoMobile) => {
    if (selecionados.includes(id)) {
      setSelecionados(selecionados.filter((s) => s !== id))
    } else {
      if (selecionados.length < 4) {
        setSelecionados([...selecionados, id])
      } else {
        // Se já tem 4, substitui o último para fluidez imediata
        setSelecionados([...selecionados.slice(0, 3), id])
      }
    }
  }

  const salvar = () => {
    if (selecionados.length === 4) {
      setAtalhosMobile(selecionados)
      aoFechar()
    }
  }

  const restaurar = () => {
    setSelecionados(ATALHOS_PADRAO)
  }

  const podeSalvar = selecionados.length === 4

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <FundoDoDialogo testId="fundo-personalizar-atalhos" aoClicar={aoFechar} />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-personalizar-atalhos"
        onKeyDown={prenderFoco}
        className="superficie relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-3xl border border-[var(--cor-linha)] bg-[var(--cor-card)] shadow-2xl sm:rounded-3xl"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-[var(--cor-linha)] px-5 py-4">
          <div>
            <h2 id="titulo-personalizar-atalhos" className="m-0 text-base font-bold text-[var(--cor-texto)]">
              Personalizar Atalhos
            </h2>
            <p className="m-0 mt-0.5 text-xs text-[var(--cor-mutado)]">
              Escolha 4 atalhos para a tela inicial ({selecionados.length}/4)
            </p>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="flex size-8 cursor-pointer items-center justify-center rounded-full text-[var(--cor-mutado)] hover:bg-[var(--cor-fundo)] hover:text-[var(--cor-texto)]"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Lista de atalhos */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {LISTA_ATALHOS.map((atalho: AtalhoInfo) => {
            const selecionado = selecionados.includes(atalho.id)
            const ordem = selecionados.indexOf(atalho.id) + 1

            return (
              <button
                key={atalho.id}
                type="button"
                onClick={() => toggleAtalho(atalho.id)}
                className={`flex w-full cursor-pointer items-center justify-between rounded-2xl border p-3 text-left transition-all duration-150 ${
                  selecionado
                    ? 'border-[var(--cor-principal)] bg-[var(--cor-principal)]/10 text-[var(--cor-texto)] shadow-xs'
                    : 'border-[var(--cor-linha)] bg-[var(--cor-card)] text-[var(--cor-mutado)] hover:border-[var(--cor-principal)]/60 hover:text-[var(--cor-texto)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                      selecionado
                        ? 'bg-[var(--cor-principal)] text-[var(--cor-sobre-principal)]'
                        : 'bg-[var(--cor-fundo)] text-[var(--cor-mutado)]'
                    }`}
                  >
                    {atalho.icone('size-5')}
                  </div>
                  <div className="min-w-0">
                    <p className="m-0 text-sm font-semibold text-[var(--cor-texto)]">{atalho.rotulo}</p>
                    <p className="m-0 text-xs text-[var(--cor-mutado)]">{atalho.descricao}</p>
                  </div>
                </div>

                <div className="ml-3 flex shrink-0 items-center">
                  {selecionado ? (
                    <span className="flex size-6 items-center justify-center rounded-full bg-[var(--cor-principal)] text-xs font-bold text-[var(--cor-sobre-principal)]">
                      {ordem}
                    </span>
                  ) : (
                    <div className="size-5 rounded-full border-2 border-[var(--cor-linha)]" />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Rodapé com ações */}
        <div className="flex items-center justify-between border-t border-[var(--cor-linha)] bg-[var(--cor-fundo)]/50 p-4">
          <button
            type="button"
            onClick={restaurar}
            className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[var(--cor-mutado)] hover:text-[var(--cor-texto)]"
          >
            <RotateCcw className="size-3.5" />
            Restaurar padrão
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={aoFechar}
              className="cursor-pointer rounded-xl px-3.5 py-2 text-xs font-semibold text-[var(--cor-mutado)] hover:bg-[var(--cor-fundo)] hover:text-[var(--cor-texto)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvar}
              disabled={!podeSalvar}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[var(--cor-principal)] px-4 py-2 text-xs font-bold text-[var(--cor-sobre-principal)] shadow-xs transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="size-3.5" />
              Salvar 4 atalhos
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
