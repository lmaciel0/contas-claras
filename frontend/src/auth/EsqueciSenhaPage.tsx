import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { Link, Navigate } from 'react-router'
import { endpoints } from '../api/endpoints'
import { BotaoReenviar } from './BotaoReenviar'
import { CampoTexto, classeBotaoPrimario, MensagemDeErro } from './CampoTexto'
import { mensagemDoErro } from './mensagemDoErro'
import { MENSAGEM_SENHA_FORA_DO_TAMANHO, MENSAGEM_SENHAS_DIFERENTES, senhaValida } from './senha'
import { TelaAuth } from './TelaAuth'
import { useAuth } from './useAuth'
import { useContagem } from './useContagem'

/**
 * `/esqueci-senha`, em dois passos guardados no estado da própria tela (sem rota nova):
 * 1. o e-mail, para a API mandar um código (responde igual com ou sem conta, então a tela nunca revela se existe);
 * 2. o código, a senha nova e a repetição. Redefinir já abre a sessão.
 */
export function EsqueciSenhaPage() {
  const { usuario, redefinirSenha } = useAuth()
  const [emailEnviado, setEmailEnviado] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [senha, setSenha] = useState('')
  const [repetir, setRepetir] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [reenviando, setReenviando] = useState(false)
  const { restante, reiniciar } = useContagem()

  if (usuario !== null) {
    return <Navigate to="/" replace />
  }

  async function pedirCodigo(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) {
      return
    }
    setErro(null)
    if (email.trim() === '') {
      setErro('Informe seu e-mail.')
      return
    }
    setEnviando(true)
    try {
      await endpoints.auth.esqueciSenha({ email: email.trim() })
      setEmailEnviado(email.trim())
      reiniciar()
    } catch (falha) {
      setErro(mensagemDoErro(falha))
    } finally {
      setEnviando(false)
    }
  }

  async function redefinir(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando || emailEnviado === null) {
      return
    }
    setErro(null)
    setAviso(null)
    // Quem cola "123 456" ou "123-456" do e-mail: a API só aceita os 6 dígitos.
    const digitos = codigo.replace(/\D/g, '')
    if (digitos.length !== 6) {
      setErro('Digite os 6 dígitos do código.')
      return
    }
    if (!senhaValida(senha)) {
      setErro(MENSAGEM_SENHA_FORA_DO_TAMANHO)
      return
    }
    if (senha !== repetir) {
      setErro(MENSAGEM_SENHAS_DIFERENTES)
      return
    }
    setEnviando(true)
    try {
      await redefinirSenha({ email: emailEnviado, codigo: digitos, senha })
      // Com a sessão aberta o `<Navigate>` acima troca a tela.
    } catch (falha) {
      setErro(mensagemDoErro(falha))
      setEnviando(false)
    }
  }

  async function reenviar() {
    if (reenviando || emailEnviado === null) {
      return
    }
    setErro(null)
    setAviso(null)
    setReenviando(true)
    try {
      await endpoints.auth.esqueciSenha({ email: emailEnviado })
      setAviso('Enviamos um novo código.')
      reiniciar()
    } catch (falha) {
      setErro(mensagemDoErro(falha))
    } finally {
      setReenviando(false)
    }
  }

  return (
    <TelaAuth titulo="Esqueci a senha">
      {emailEnviado === null ? (
        <form onSubmit={pedirCodigo} noValidate className="flex flex-col gap-4">
          <p className="m-0 text-center text-sm">Informe seu e-mail e enviaremos um código para criar uma senha nova.</p>
          <CampoTexto
            rotulo="E-mail"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
          />
          <MensagemDeErro texto={erro} />
          <button type="submit" disabled={enviando} className={classeBotaoPrimario}>
            {enviando ? 'Enviando…' : 'Enviar código'}
          </button>
        </form>
      ) : (
        <>
          <p className="m-0 mb-4 text-center text-sm">
            {`Enviamos um e-mail para ${emailEnviado}. Confira também o spam.`}
          </p>
          <form onSubmit={redefinir} noValidate className="flex flex-col gap-4">
            <CampoTexto
              rotulo="Código"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={codigo}
              onChange={(evento) => setCodigo(evento.target.value)}
            />
            <CampoTexto
              rotulo="Nova senha"
              type="password"
              autoComplete="new-password"
              value={senha}
              onChange={(evento) => setSenha(evento.target.value)}
            />
            <p className="m-0 -mt-2 text-xs">De 8 a 72 caracteres.</p>
            <CampoTexto
              rotulo="Repetir nova senha"
              type="password"
              autoComplete="new-password"
              value={repetir}
              onChange={(evento) => setRepetir(evento.target.value)}
            />
            <MensagemDeErro texto={erro} />
            {aviso !== null && (
              <p role="status" className="m-0 text-center text-sm font-medium text-[var(--cor-positivo-texto)]">
                {aviso}
              </p>
            )}
            <button type="submit" disabled={enviando} className={classeBotaoPrimario}>
              {enviando ? 'Redefinindo…' : 'Redefinir senha'}
            </button>
          </form>
          <BotaoReenviar restante={restante} reenviando={reenviando} desabilitado={enviando} aoReenviar={reenviar} />
        </>
      )}
      <p className="m-0 mt-5 text-center text-sm">
        <Link to="/login" className="font-semibold text-[var(--cor-principal)]">
          Voltar para o login
        </Link>
      </p>
    </TelaAuth>
  )
}
