import { classeBotaoSecundario } from './CampoTexto'

interface Props {
  /** Segundos que faltam para liberar (de `useContagem`); com valor acima de 0 o botão fica bloqueado. */
  restante: number
  reenviando: boolean
  /** Bloqueio extra, ex.: enquanto o formulário ao lado está enviando. */
  desabilitado?: boolean
  aoReenviar: () => void
}

/** "Reenviar" do código por e-mail, com a contagem de espera no próprio texto (a API também recusa antes de 60 s). */
export function BotaoReenviar({ restante, reenviando, desabilitado = false, aoReenviar }: Props) {
  return (
    <div className="mt-3 flex justify-center">
      <button
        type="button"
        disabled={restante > 0 || reenviando || desabilitado}
        onClick={aoReenviar}
        className={classeBotaoSecundario}
      >
        {reenviando ? 'Reenviando…' : restante > 0 ? `Reenviar em ${restante} s` : 'Reenviar'}
      </button>
    </div>
  )
}
