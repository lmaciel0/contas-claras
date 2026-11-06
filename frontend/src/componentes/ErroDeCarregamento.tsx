import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Ação do botão. Por padrão recarrega a página (útil para o chunk que sumiu depois de um deploy). */
  aoRecarregar?: () => void
}

interface Estado {
  falhou: boolean
}

/**
 * Fronteira de erro das páginas lazy. Se o chunk não baixar (ex.: aba antiga pedindo um arquivo com hash que o deploy
 * novo removeu), o import rejeita; sem isto o React desmontaria a árvore inteira. Aqui só a área da página vira o aviso,
 * e a moldura continua na tela.
 */
export class ErroDeCarregamento extends Component<Props, Estado> {
  override state: Estado = { falhou: false }

  static getDerivedStateFromError(): Estado {
    return { falhou: true }
  }

  override componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error('Falha ao carregar a tela', erro, info.componentStack)
  }

  override render() {
    if (!this.state.falhou) {
      return this.props.children
    }
    const recarregar = this.props.aoRecarregar ?? (() => window.location.reload())
    return (
      <div
        role="alert"
        className="mx-auto my-6 flex max-w-md flex-col items-center gap-3 rounded-xl border border-[var(--cor-negativo)] bg-[var(--cor-erro-fundo)] px-4 py-5 text-center text-sm text-[var(--cor-texto)]"
      >
        <p className="m-0">Não foi possível carregar esta tela. Pode ter saído uma versão nova do Aprumo ou a conexão falhou.</p>
        <button
          type="button"
          onClick={recarregar}
          className="min-h-11 cursor-pointer rounded-lg bg-[var(--cor-principal)] px-4 font-semibold text-[var(--cor-sobre-principal)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
        >
          Recarregar
        </button>
      </div>
    )
  }
}
