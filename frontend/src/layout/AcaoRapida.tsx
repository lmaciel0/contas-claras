import { useCallback, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { FundoDoDialogo } from './FundoDoDialogo'
import { ICONES } from './icones'
import { useDialogoModal } from './useDialogoModal'
import { useMesSelecionado } from './useMesSelecionado'

const foco = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]'

const itemFolha = `flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2 text-[15px] font-semibold text-[var(--cor-texto)] no-underline transition-colors duration-200 ease-out hover:bg-[var(--cor-fundo)] motion-reduce:transition-none ${foco}`

/**
 * Botão "+" flutuante do celular (menos de 768 px) e a folha de ações rápidas que ele abre: Nova nota, Nova conta e
 * Nova tarefa. Fica 12 px acima da dock (z-30, como ela); a folha (z-[35]) cobre a dock e fica abaixo do menu (z-40) e
 * dos modais (z-50). Mesmo comportamento do menu deslizante (foco, Esc, fundo, rolagem travada, Tab preso), via
 * `useDialogoModal`. Só renderize quando `useEhCelular()` for verdadeiro (o AppShell faz isso).
 *
 * Nota e tarefa não têm rota de criação: a nota nasce de um POST seguido de navegação, e a tarefa é o campo da própria
 * página. Por isso os links levam a `?nova=1`, que `NotasPage` e `TarefasPage` consomem.
 */
export function AcaoRapida() {
  const { busca } = useMesSelecionado()
  const [aberta, setAberta] = useState(false)
  const botao = useRef<HTMLButtonElement>(null)
  const idFolha = useId()

  const fechar = useCallback(() => {
    setAberta(false)
    botao.current?.focus()
  }, [])
  const { painel, prenderFoco } = useDialogoModal(aberta, fechar)

  return (
    <>
      <button
        ref={botao}
        type="button"
        aria-label="Criar"
        aria-haspopup="dialog"
        aria-expanded={aberta}
        aria-controls={aberta ? idFolha : undefined}
        onClick={() => setAberta(true)}
        className={`fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 grid min-h-11 min-w-11 size-12 cursor-pointer place-items-center rounded-full bg-[var(--cor-principal)] text-[var(--cor-sobre-principal)] shadow-[0_6px_16px_color-mix(in_srgb,var(--cor-principal)_40%,transparent)] transition-transform duration-200 ease-out motion-safe:active:scale-95 motion-reduce:transition-none ${foco}`}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {aberta && (
        <div className="fixed inset-0 z-[35]">
          <FundoDoDialogo testId="fundo-da-acao-rapida" aoClicar={fechar} />
          <div
            ref={painel}
            id={idFolha}
            role="dialog"
            aria-modal="true"
            aria-label="Criar"
            onKeyDown={prenderFoco}
            className="folha-painel superficie absolute inset-x-2.5 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] mx-auto flex max-w-md flex-col gap-1 rounded-3xl p-2"
          >
            <Link to={{ pathname: '/notas', search: '?nova=1' }} onClick={fechar} className={itemFolha}>
              {ICONES['/notas']}
              Nova nota
            </Link>
            <Link to={{ pathname: '/lancamentos/novo', search: busca }} onClick={fechar} className={itemFolha}>
              {ICONES['/lancamentos']}
              Nova conta
            </Link>
            <Link to={{ pathname: '/tarefas', search: '?nova=1' }} onClick={fechar} className={itemFolha}>
              {ICONES['/tarefas']}
              Nova tarefa
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
