import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router'
import { CampoTexto, classeBotaoPrimario, MensagemDeErro } from './CampoTexto'
import { destinoAposEntrar } from './destino'
import { mensagemDoErro } from './mensagemDoErro'
import { TelaAuth } from './TelaAuth'
import { useAuth } from './useAuth'

/** `/login`. Entrar (senha ou Google) só atualiza `usuario`; o `<Navigate>` abaixo leva à rota pedida. */
export function LoginPage() {
  const { usuario, entrar } = useAuth()
  const [parametros] = useSearchParams()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (usuario !== null) {
    return <Navigate to={destinoAposEntrar(parametros.get('voltar'))} replace />
  }

  async function enviar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      await entrar(email.trim(), senha)
    } catch (falha) {
      setErro(mensagemDoErro(falha))
      setEnviando(false)
    }
  }

  return (
    <TelaAuth titulo="Entrar">
      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <CampoTexto
          rotulo="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
        />
        <CampoTexto
          rotulo="Senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(evento) => setSenha(evento.target.value)}
        />
        <Link
          to="/esqueci-senha"
          className="-mt-2 inline-flex min-h-6 items-center self-end text-sm font-semibold text-[var(--cor-principal)]"
        >
          Esqueci a senha
        </Link>
        <MensagemDeErro texto={erro} />
        <button type="submit" disabled={enviando} className={classeBotaoPrimario}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <p className="m-0 mt-5 text-center text-sm">
        Ainda não tem conta?{' '}
        <Link to="/cadastro" className="font-semibold text-[var(--cor-principal)]">
          Criar conta
        </Link>
      </p>
    </TelaAuth>
  )
}
