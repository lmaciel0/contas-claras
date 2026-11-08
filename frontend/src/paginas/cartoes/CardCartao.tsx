import { Calendar, CreditCard, Pencil, Plus, Wifi } from 'lucide-react'
import { useId } from 'react'
import type { CartaoResponse } from '../../api/tipos'
import { formatarMoeda } from '../../formato/moeda'
import { formatarPercentual, larguraDaBarra } from '../inicio/valores'
import { CLASSE_DO_CHIP, COR_DA_BARRA } from './faixas'
import './CardCartao.css'

const classeFoco =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]'

function getVisualMiniCartao(nome: string): { background: string; bandeira: string } {
  const n = nome.toLowerCase()
  if (n.includes('nu') || n.includes('roxo') || n.includes('ultravioleta')) {
    return {
      background: 'linear-gradient(135deg, #820ad1 0%, #430468 100%)',
      bandeira: 'Nubank',
    }
  }
  if (n.includes('inter')) {
    return {
      background: 'linear-gradient(135deg, #ff7a00 0%, #c44d00 100%)',
      bandeira: 'Inter',
    }
  }
  if (n.includes('itau') || n.includes('itaú') || n.includes('uniclass') || n.includes('personnalite')) {
    return {
      background: 'linear-gradient(135deg, #0d3b66 0%, #001833 100%)',
      bandeira: 'Cartão',
    }
  }
  if (n.includes('bradesco')) {
    return {
      background: 'linear-gradient(135deg, #cc092f 0%, #730315 100%)',
      bandeira: 'Bradesco',
    }
  }
  if (n.includes('santander')) {
    return {
      background: 'linear-gradient(135deg, #ec0000 0%, #8b0000 100%)',
      bandeira: 'Santander',
    }
  }
  if (n.includes('amex') || n.includes('american express')) {
    return {
      background: 'linear-gradient(135deg, #0077b6 0%, #023e8a 100%)',
      bandeira: 'AMEX',
    }
  }
  if (n.includes('c6')) {
    return {
      background: 'linear-gradient(135deg, #2b2b2b 0%, #111111 100%)',
      bandeira: 'C6 Bank',
    }
  }
  if (n.includes('verde')) {
    return {
      background: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)',
      bandeira: 'Cartão',
    }
  }
  if (n.includes('vermelho')) {
    return {
      background: 'linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)',
      bandeira: 'Cartão',
    }
  }
  if (n.includes('azul')) {
    return {
      background: 'linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)',
      bandeira: 'Cartão',
    }
  }
  return {
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    bandeira: 'Cartão',
  }
}

interface Props {
  cartao: CartaoResponse
  aoEditar?: (cartao: CartaoResponse) => void
  aoLancar?: (cartao: CartaoResponse) => void
}

/** Um cartão: mini cartão físico estético no topo, nome, vencimento, fatura do mês e barra de uso com limite. */
export function CardCartao({ cartao, aoEditar, aoLancar }: Props) {
  const idTitulo = useId()
  const { faixa, uso, limite } = cartao
  const comLimite = faixa !== 'SEM_LIMITE' && uso !== null && limite !== null
  const visual = getVisualMiniCartao(cartao.nome)
  const ultimosDigitos = String(cartao.itemId).padStart(4, '0').slice(-4)

  return (
    <section
      aria-labelledby={idTitulo}
      data-faixa={faixa}
      className="cartao-premium p-4 sm:p-4.5"
    >
      {/* Efeitos de feixe de luz e brilho de fundo */}
      <div className="cartao-premium__shine" aria-hidden="true" />
      <div className="cartao-premium__glow" aria-hidden="true" />

      {/* Mini cartão visual realista no topo */}
      <div
        className="cartao-premium__mini-card mb-3.5 select-none"
        style={{ background: visual.background }}
        aria-hidden="true"
      >
        <div className="flex items-center justify-between">
          {/* Chip metálico dourado */}
          <div className="flex items-center gap-2">
            <div className="h-5 w-7 rounded-sm bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-inner flex items-center justify-center p-0.5">
              <div className="h-full w-full border border-amber-800/40 rounded-sm grid grid-cols-2 gap-0.5">
                <div className="border-r border-b border-amber-800/30" />
                <div className="border-b border-amber-800/30" />
                <div className="border-r border-amber-800/30" />
                <div />
              </div>
            </div>
            <Wifi className="size-4 rotate-90 opacity-70" />
          </div>

          <span className="text-[11px] font-bold tracking-wider uppercase opacity-90 drop-shadow-sm">
            {visual.bandeira}
          </span>
        </div>

        <div className="mt-auto flex items-end justify-between">
          <span className="cartao-premium__mini-number">
            •••• •••• •••• {ultimosDigitos}
          </span>
          <CreditCard className="size-4 opacity-40" />
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="relative z-[2] flex flex-1 flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 id={idTitulo} className="m-0 truncate text-base font-bold text-[var(--cor-texto)]">
                  {cartao.nome}
                </h3>
                {cartao.titular && (
                  <span className="inline-flex shrink-0 items-center rounded-full border border-[var(--cor-linha)] bg-[var(--cor-fundo)] px-2 py-0.5 text-[11px] font-semibold text-[var(--cor-principal)]">
                    {cartao.titular}
                  </span>
                )}
                {aoEditar && (
                  <button
                    type="button"
                    onClick={() => aoEditar(cartao)}
                    title={`Editar ${cartao.nome}`}
                    aria-label={`Editar ${cartao.nome}`}
                    className="inline-flex size-6 cursor-pointer items-center justify-center rounded-full border border-[var(--cor-linha)] bg-[var(--cor-fundo)] text-[var(--cor-mutado)] transition-colors hover:border-[var(--cor-principal)] hover:text-[var(--cor-principal)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
                  >
                    <Pencil className="size-3" />
                  </button>
                )}
              </div>
              {cartao.diaVencimento !== null && (
                <p className="m-0 mt-1 flex items-center gap-1 text-[11px] text-[var(--cor-mutado)]">
                  <Calendar className="size-3 shrink-0" />
                  <span>vence dia {String(cartao.diaVencimento).padStart(2, '0')}</span>
                </p>
              )}
            </div>

            {comLimite && (
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${CLASSE_DO_CHIP[faixa]}`}>
                {formatarPercentual(uso)}
              </span>
            )}
          </div>

          {/* Barra de progresso de uso do limite */}
          {comLimite ? (
            <div
              role="meter"
              aria-label={`Uso do limite de ${cartao.nome}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(larguraDaBarra(uso))}
              aria-valuetext={`${formatarPercentual(uso)} do limite`}
              className="my-3 h-2 overflow-hidden rounded-full bg-[var(--cor-linha)]"
            >
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${larguraDaBarra(uso)}%`, backgroundColor: COR_DA_BARRA[faixa] }}
              />
            </div>
          ) : (
            <div className="my-3" />
          )}
        </div>

        {/* Rodapé com fatura, limite e botão de ação */}
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-[var(--cor-linha)]/60 pt-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[var(--cor-mutado)]">Fatura do mês</span>
              {cartao.faturaPaga && Number.parseFloat(cartao.fatura) > 0 && (
                <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-500">
                  Paga
                </span>
              )}
            </div>
            <span className="valor text-sm font-bold text-[var(--cor-texto)]">
              {formatarMoeda(cartao.fatura)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {comLimite ? (
              <div className="text-right">
                <span className="text-[11px] text-[var(--cor-mutado)]">
                  {cartao.limiteDisponivel != null ? 'Disponível' : 'Limite'}
                </span>
                <p className="valor m-0 text-xs font-semibold text-[var(--cor-texto)]">
                  {cartao.limiteDisponivel != null
                    ? formatarMoeda(cartao.limiteDisponivel)
                    : `de ${formatarMoeda(limite)}`}
                </p>
                {cartao.limiteDisponivel != null && (
                  <span className="text-[10px] text-[var(--cor-mutado)]">
                    de {formatarMoeda(limite)}
                  </span>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => aoEditar?.(cartao)}
                className={`inline-flex min-h-6 cursor-pointer items-center text-xs font-semibold text-[var(--cor-principal)] hover:underline ${classeFoco}`}
              >
                Cadastrar limite
              </button>
            )}

            <button
              type="button"
              onClick={() => aoLancar?.(cartao)}
              title={`Lançar despesa em ${cartao.nome}`}
              aria-label={`Lançar despesa em ${cartao.nome}`}
              className="cartao-premium__action-btn shrink-0 ml-1 cursor-pointer"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
