import { Link, type To } from 'react-router'
import { foco } from './classesFoco'
import { FundoDoDialogo } from './FundoDoDialogo'
import { ICONES } from './icones'
import { useDialogoModal } from './useDialogoModal'
import { useMesSelecionado } from './useMesSelecionado'

const itemFolha = `flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2 text-[15px] font-semibold text-[var(--cor-texto)] no-underline transition-colors duration-200 ease-out hover:bg-[var(--cor-fundo)] motion-reduce:transition-none ${foco}`

const botaoFechar = `mt-1 min-h-11 cursor-pointer rounded-2xl border-t border-[var(--cor-linha)] px-3 py-2 text-[15px] font-semibold text-[var(--cor-mutado)] transition-colors duration-200 ease-out hover:bg-[var(--cor-fundo)] hover:text-[var(--cor-texto)] motion-reduce:transition-none ${foco}`

interface ItemFolha {
  rotulo: string
  /** Chave de `ICONES`. */
  icone: string
  para: To
  state?: { nova: true }
}

/** `id` do diálogo, para o botão "Criar" da dock apontar com `aria-controls`. Só há uma folha na tela. */
export const ID_FOLHA_ACAO_RAPIDA = 'folha-acao-rapida'

/**
 * Folha de ações rápidas do celular (menos de 768 px): Nova nota, Nova despesa e Nova receita. Quem a abre é o botão
 * "Criar" da `DockInferior`, que também guarda o estado e a renderiza como irmã do `<nav>` (nunca dentro dele: o
 * `backdrop-blur` do nav cria um bloco de contenção e quebraria o `fixed inset-0`). A folha (z-[35]) cobre a dock e fica
 * abaixo do menu (z-40) e dos modais (z-50). Mesmo comportamento do menu deslizante (foco, Esc, fundo, rolagem travada,
 * Tab preso), via `useDialogoModal`; `aoFechar` decide o que acontece depois (a dock devolve o foco ao botão).
 *
 * Nota não tem rota de criação: a nota nasce de um POST seguido de navegação. "Nova nota" leva `{ nova: true }` no
 * estado de navegação (um link externo não consegue defini-lo, então abrir uma URL não cria nota). Despesa e receita
 * abrem o formulário `/lancamentos/novo` com o mês em foco.
 */
function destinoComMes(caminho: string, busca: string, paramsExtras?: Record<string, string>): To {
  const params = new URLSearchParams(busca ? busca.replace(/^\?/, '') : '')
  if (paramsExtras) {
    Object.entries(paramsExtras).forEach(([k, v]) => params.set(k, v))
  }
  const queryString = params.toString()
  return {
    pathname: caminho,
    search: queryString ? `?${queryString}` : '',
  }
}

export function FolhaAcaoRapida({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  const { busca } = useMesSelecionado()
  const { painel, prenderFoco } = useDialogoModal(aberta, aoFechar)
  const itens: ItemFolha[] = [
    { rotulo: 'Nova nota', icone: '/notas', para: '/notas', state: { nova: true } },
    { rotulo: 'Nova despesa', icone: '/lancamentos', para: destinoComMes('/lancamentos/novo', busca) },
    { rotulo: 'Nova receita', icone: '/financeiro', para: destinoComMes('/lancamentos/novo', busca, { tipo: 'RECEITA' }) },
  ]

  if (!aberta) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[35]">
      <FundoDoDialogo testId="fundo-da-acao-rapida" aoClicar={aoFechar} />
      <div
        ref={painel}
        id={ID_FOLHA_ACAO_RAPIDA}
        role="dialog"
        aria-modal="true"
        aria-label="Criar"
        onKeyDown={prenderFoco}
        className="folha-painel superficie absolute inset-x-2.5 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] mx-auto flex max-w-md flex-col gap-1 rounded-3xl p-2"
      >
        {itens.map(({ rotulo, icone, para, state }) => (
          <Link key={rotulo} to={para} state={state} onClick={aoFechar} className={itemFolha}>
            {ICONES[icone]}
            {rotulo}
          </Link>
        ))}
        <button type="button" onClick={aoFechar} className={botaoFechar}>
          Fechar
        </button>
      </div>
    </div>
  )
}
