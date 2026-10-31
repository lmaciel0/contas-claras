import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'
import { Link, Navigate, useLocation, useSearchParams } from 'react-router'
import { endpoints } from '../api/endpoints'
import type { ConfirmarCadastroRequest } from '../api/tipos'
import { CampoTexto, classeBotaoPrimario, classeBotaoSecundario, MensagemDeErro } from './CampoTexto'
import { mensagemDoErro } from './mensagemDoErro'
import { TelaAuth } from './TelaAuth'
import { useAuth } from './useAuth'
import { useContagem } from './useContagem'

const MENSAGEM_SEM_EMAIL = 'Informe seu e-mail.'
const MENSAGEM_CODIGO_INCOMPLETO = 'Digite os 6 dígitos do código.'

/** E-mail que o cadastro deixou no estado da rota (nunca na URL); vazio se a tela foi aberta sem ele. */
function emailDoEstado(estado: unknown): string {
  if (typeof estado === 'object' && estado !== null && 'email' in estado && typeof estado.email === 'string') {
    return estado.email
  }
  return ''
}

/**
 * `/confirmar`. Confirma o e-mail do cadastro de duas formas, e as duas já abrem a sessão:
 * - por código: e-mail + 6 dígitos digitados (o e-mail vem preenchido do cadastro, mas pode ser editado);
 * - por link: `?token=` do e-mail. O token é lido uma vez e sai da URL na hora, para não ficar no histórico nem vazar
 *   em captura de tela; a API só é chamada quando a pessoa clica (um robô que abre o link não gasta o token).
 */
export function ConfirmarPage() {
  const { usuario, confirmarCadastro } = useAuth()
  const { state } = useLocation()
  const [parametros] = useSearchParams()
  const [token] = useState(() => parametros.get('token') || null)
  const emailDaRota = emailDoEstado(state)
  const [email, setEmail] = useState(emailDaRota)
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [reenviando, setReenviando] = useState(false)
  const { restante, reiniciar } = useContagem()

  useEffect(() => {
    if (token !== null) {
      // Preserva `history.state`: é onde o roteador guarda a posição, e perdê-la quebra o voltar/avançar.
      window.history.replaceState(window.history.state, '', window.location.pathname)
    }
  }, [token])

  if (usuario !== null) {
    return <Navigate to="/" replace />
  }

  async function confirmar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) {
      return
    }
    setErro(null)
    setAviso(null)
    let pedido: ConfirmarCadastroRequest
    if (token !== null) {
      pedido = { token }
    } else {
      if (email.trim() === '') {
        setErro(MENSAGEM_SEM_EMAIL)
        return
      }
      // Quem cola "123 456" ou "123-456" do e-mail: a API só aceita os 6 dígitos.
      const digitos = codigo.replace(/\D/g, '')
      if (digitos.length !== 6) {
        setErro(MENSAGEM_CODIGO_INCOMPLETO)
        return
      }
      pedido = { email: email.trim(), codigo: digitos }
    }
    setEnviando(true)
    try {
      await confirmarCadastro(pedido)
      // Com a sessão aberta o `<Navigate>` acima troca a tela.
    } catch (falha) {
      setErro(mensagemDoErro(falha))
      setEnviando(false)
    }
  }

  async function reenviar() {
    if (reenviando) {
      return
    }
    setErro(null)
    setAviso(null)
    if (email.trim() === '') {
      setErro(MENSAGEM_SEM_EMAIL)
      return
    }
    setReenviando(true)
    try {
      await endpoints.auth.reenviarCadastro({ email: email.trim() })
      setAviso('Enviamos um novo código.')
      reiniciar()
    } catch (falha) {
      setErro(mensagemDoErro(falha))
    } finally {
      setReenviando(false)
    }
  }

  const mensagens = (
    <>
      <MensagemDeErro texto={erro} />
      {aviso !== null && (
        <p role="status" className="m-0 text-center text-sm font-medium text-[var(--cor-positivo-texto)]">
          {aviso}
        </p>
      )}
    </>
  )

  return (
    <TelaAuth titulo="Confirme seu e-mail">
      {token !== null ? (
        <form onSubmit={confirmar} noValidate className="flex flex-col gap-4">
          <p className="m-0 text-center text-sm">Falta pouco: confirme para entrar na sua conta.</p>
          {mensagens}
          <button type="submit" disabled={enviando} className={classeBotaoPrimario}>
            {enviando ? 'Confirmando…' : 'Confirmar minha conta'}
          </button>
        </form>
      ) : (
        <>
          <p className="m-0 mb-4 text-center text-sm">
            {emailDaRota !== ''
              ? `Enviamos um e-mail para ${emailDaRota}. Confira também o spam.`
              : 'Digite o e-mail e o código que enviamos. Confira também o spam.'}
          </p>
          <form onSubmit={confirmar} noValidate className="flex flex-col gap-4">
            <CampoTexto
              rotulo="E-mail"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
            />
            <CampoTexto
              rotulo="Código"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={codigo}
              onChange={(evento) => setCodigo(evento.target.value)}
            />
            {mensagens}
            <button type="submit" disabled={enviando} className={classeBotaoPrimario}>
              {enviando ? 'Confirmando…' : 'Confirmar'}
            </button>
          </form>
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              disabled={restante > 0 || reenviando || enviando}
              onClick={reenviar}
              className={classeBotaoSecundario}
            >
              {reenviando ? 'Reenviando…' : restante > 0 ? `Reenviar em ${restante} s` : 'Reenviar'}
            </button>
          </div>
        </>
      )}
      <p className="m-0 mt-5 text-center text-sm">
        Não deu certo?{' '}
        <Link to="/cadastro" className="font-semibold text-[var(--cor-principal)]">
          Refazer o cadastro
        </Link>
      </p>
    </TelaAuth>
  )
}
