import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Chamado uma vez por erro capturado, com a pilha de componentes (se o React informar). */
  aoErro?: (erro: Error, pilha?: string) => void
}

interface Estado {
  falhou: boolean
}

/**
 * Última barreira da aplicação: se algo lançar durante a renderização e nenhuma fronteira mais interna (como o
 * `ErroDeCarregamento` das páginas) segurar, o React desmontaria tudo e o usuário veria uma tela branca. Aqui vira um
 * aviso com o botão de recarregar. Não captura erros de eventos nem de código assíncrono (limitação das fronteiras de erro).
 */
export class LimiteDeErro extends Component<Props, Estado> {
  override state: Estado = { falhou: false }

  static getDerivedStateFromError(): Estado {
    return { falhou: true }
  }

  override componentDidCatch(erro: Error, info: ErrorInfo) {
    this.props.aoErro?.(erro, info.componentStack ?? undefined)
  }

  override render() {
    if (!this.state.falhou) {
      return this.props.children
    }
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--cor-fundo)] px-4 text-[var(--cor-texto)]">
        <div
          role="alert"
          className="flex w-full max-w-md flex-col items-center gap-3 rounded-xl border border-[var(--cor-negativo)] bg-[var(--cor-erro-fundo)] px-4 py-5 text-center text-sm text-[var(--cor-texto)]"
        >
          <h1 className="m-0 text-lg font-semibold">Algo deu errado</h1>
          <p className="m-0">Recarregue a página para continuar. Seus dados estão salvos.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-11 cursor-pointer rounded-lg bg-[var(--cor-principal)] px-4 font-semibold text-[var(--cor-sobre-principal)]"
          >
            Recarregar
          </button>
        </div>
      </div>
    )
  }
}
