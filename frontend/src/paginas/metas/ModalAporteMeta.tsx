import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, X } from 'lucide-react'
import type { MetaResponse } from '../../api/tipos'
import { formatarMoeda, lerValor } from '../../formato/moeda'
import { FundoDoDialogo } from '../../layout/FundoDoDialogo'
import { useDialogoModal } from '../../layout/useDialogoModal'

interface Props {
  readonly aberto: boolean
  readonly meta: MetaResponse | null
  readonly tipo: 'GUARDAR' | 'RESGATAR'
  readonly aoConfirmar: (valor: string) => Promise<void> | void
  readonly aoFechar: () => void
}

export function ModalAporteMeta({
  aberto,
  meta,
  tipo,
  aoConfirmar,
  aoFechar,
}: Readonly<Props>) {
  const { painel, prenderFoco } = useDialogoModal<HTMLDialogElement>(aberto, aoFechar)
  const [valorTexto, setValorTexto] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (!aberto || !meta) {
    return null
  }

  const saldoAtualNum = Number.parseFloat(meta.valorGuardado || '0')
  const ehGuardar = tipo === 'GUARDAR'

  const aplicarPilula = (valorAdd: number) => {
    setErro(null)
    setValorTexto(valorAdd.toFixed(2).replace('.', ','))
  }

  const aplicarTudo = () => {
    setErro(null)
    setValorTexto(saldoAtualNum.toFixed(2).replace('.', ','))
  }

  const tratarEnvio = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)

    const valorNormalizado = lerValor(valorTexto)
    if (!valorNormalizado) {
      setErro('Informe um valor válido maior que zero.')
      return
    }

    const valorNum = Number.parseFloat(valorNormalizado)
    if (!ehGuardar && valorNum > saldoAtualNum) {
      setErro('Valor excede o saldo guardado.')
      return
    }

    try {
      setEnviando(true)
      await aoConfirmar(valorNormalizado)
      setValorTexto('')
      aoFechar()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErro(err.message)
      } else {
        setErro('Ocorreu um erro ao processar. Tente novamente.')
      }
    } finally {
      setEnviando(false)
    }
  }

  let textoBotao = ehGuardar ? 'Confirmar aporte' : 'Confirmar resgate'
  if (enviando) {
    textoBotao = 'Processando...'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <FundoDoDialogo testId="fundo-modal-aporte" aoClicar={aoFechar} />
      <dialog
        open
        ref={painel}
        aria-modal="true"
        aria-labelledby="titulo-modal-aporte"
        onKeyDown={prenderFoco}
        className="superficie relative z-10 m-0 flex max-h-[90vh] w-full max-w-md flex-col rounded-t-3xl border border-[var(--cor-linha)] bg-[var(--cor-card)] p-0 text-[var(--cor-texto)] shadow-2xl backdrop:bg-transparent sm:rounded-3xl"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-[var(--cor-linha)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex size-10 items-center justify-center rounded-2xl ${
                ehGuardar
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              }`}
            >
              {ehGuardar ? (
                <ArrowUpRight className="size-5" />
              ) : (
                <ArrowDownLeft className="size-5" />
              )}
            </div>
            <div>
              <h2
                id="titulo-modal-aporte"
                className="m-0 text-base font-bold text-[var(--cor-texto)]"
              >
                {ehGuardar ? 'Guardar Dinheiro' : 'Resgatar Dinheiro'}
              </h2>
              <p className="m-0 mt-0.5 text-xs text-[var(--cor-mutado)]">
                {meta.titulo}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar diálogo"
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-[var(--cor-mutado)] hover:bg-[var(--cor-linha)]/50 focus-visible:outline-2 focus-visible:outline-[var(--cor-principal)]"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Informações de saldo da meta */}
        <div className="bg-[var(--cor-fundo)] px-5 py-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[var(--cor-mutado)]">
              {ehGuardar ? 'Saldo atual guardado:' : 'Saldo disponível:'}{' '}
              <strong className="font-bold text-[var(--cor-texto)]">
                {formatarMoeda(meta.valorGuardado)}
              </strong>
            </span>
          </div>
          {ehGuardar && (
            <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--cor-mutado)]">
              <span>Alvo da caixinha:</span>
              <span>{formatarMoeda(meta.valorAlvo)}</span>
            </div>
          )}
        </div>

        {/* Formulário */}
        <form onSubmit={tratarEnvio} className="flex flex-col gap-4 p-5">
          <div>
            <label
              htmlFor="campo-valor-aporte"
              className="block text-xs font-semibold text-[var(--cor-texto)]"
            >
              Valor (R$)
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-semibold text-[var(--cor-mutado)]">
                R$
              </span>
              <input
                id="campo-valor-aporte"
                type="text"
                inputMode="decimal"
                autoFocus
                placeholder="0,00"
                value={valorTexto}
                onChange={(e) => {
                  setValorTexto(e.target.value)
                  if (erro) setErro(null)
                }}
                className="w-full rounded-xl border border-[var(--cor-linha)] bg-[var(--cor-fundo)] py-2.5 pr-4 pl-10 text-base font-bold text-[var(--cor-texto)] placeholder:font-normal placeholder:text-[var(--cor-mutado)] focus:border-[var(--cor-principal)] focus:outline-none focus:ring-2 focus:ring-[var(--cor-principal)]/20"
              />
            </div>
          </div>

          {/* Pílulas rápidas de valor */}
          <div className="flex flex-wrap items-center gap-2">
            {ehGuardar ? (
              <>
                {[50, 100, 200, 500].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => aplicarPilula(v)}
                    className="cursor-pointer rounded-lg border border-[var(--cor-linha)] bg-[var(--cor-fundo)] px-2.5 py-1 text-xs font-medium text-[var(--cor-texto)] transition-colors hover:border-[var(--cor-principal)] hover:text-[var(--cor-principal)]"
                  >
                    + R$ {v}
                  </button>
                ))}
              </>
            ) : (
              <>
                {[50, 100, 200].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => aplicarPilula(v)}
                    className="cursor-pointer rounded-lg border border-[var(--cor-linha)] bg-[var(--cor-fundo)] px-2.5 py-1 text-xs font-medium text-[var(--cor-texto)] transition-colors hover:border-[var(--cor-principal)] hover:text-[var(--cor-principal)]"
                  >
                    R$ {v}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={aplicarTudo}
                  className="cursor-pointer rounded-lg border border-[var(--cor-linha)] bg-[var(--cor-fundo)] px-2.5 py-1 text-xs font-semibold text-[var(--cor-principal)] transition-colors hover:border-[var(--cor-principal)]"
                >
                  Tudo
                </button>
              </>
            )}
          </div>

          {erro && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:text-red-400"
            >
              {erro}
            </div>
          )}

          <div className="mt-2 flex items-center justify-end gap-2 border-t border-[var(--cor-linha)] pt-4">
            <button
              type="button"
              onClick={aoFechar}
              disabled={enviando}
              className="cursor-pointer rounded-xl border border-[var(--cor-linha)] px-4 py-2 text-xs font-semibold text-[var(--cor-mutado)] hover:bg-[var(--cor-linha)]/30 hover:text-[var(--cor-texto)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando || !valorTexto.trim()}
              className={`cursor-pointer rounded-xl px-5 py-2 text-xs font-bold text-[var(--cor-sobre-principal)] shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                ehGuardar
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-[var(--cor-principal)] hover:opacity-90'
              }`}
            >
              {textoBotao}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  )
}
