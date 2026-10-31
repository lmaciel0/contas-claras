import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'
import { Link, Navigate, useLocation, useSearchParams } from 'react-router'
import { endpoints } from '../api/endpoints'
import type { ConfirmarCadastroRequest } from '../api/tipos'
import { BotaoReenviar } from './BotaoReenviar'
import { CampoTexto, classeBotaoPrimario, MensagemDeErro } from './CampoTexto'
import { mensagemDoErro } from './mensagemDoErro'
import { MENSAGEM_SENHA_FORA_DO_TAMANHO, MENSAGEM_SENHAS_DIFERENTES, senhaValida } from './senha'
import { TelaAuth } from './TelaAuth'
import { useAuth } from './useAuth'
import { useContagem } from './useContagem'

const MENSAGEM_SEM_EMAIL = 'Informe seu e-mail.'
const MENSAGEM_CODIGO_INCOMPLETO = 'Digite os 6 dígitos do código.'
/** Neutro de propósito: a API responde 202 igual com ou sem cadastro pendente (inclusive vencido). */
const AVISO_REENVIO =
  'Se houver um cadastro pendente para este e-mail, enviamos um novo código. Se ele venceu, refaça o cadastro.'

/** E-mail que o cadastro deixou no estado da rota (nunca na URL); vazio se a tela foi aberta sem ele. */
function emailDoEstado(estado: unknown): string {
  if (typeof estado === 'object' && estado !== null && 'email' in estado && typeof estado.email === 'string') {
    return estado.email
  }
  return ''
}

/**
 * `/confirmar`. Confirma o e-mail do cadastro de duas formas, e as duas definem a senha e já abrem a sessão
 * (a senha só entra aqui, depois da prova de posse do e-mail):
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
  const [senha, setSenha] = useState('')
  const [repetir, setRepetir] = useState('')
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

  /** Confere a senha antes de gastar uma tentativa do código; devolve `false` e mostra o erro se não servir. */
  function validarSenhas(): boolean {
    if (!senhaValida(senha)) {
      setErro(MENSAGEM_SENHA_FORA_DO_TAMANHO)
      return false
    }
    if (senha !== repetir) {
      setErro(MENSAGEM_SENHAS_DIFERENTES)
      return false
    }
    return true
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
      if (!validarSenhas()) {
        return
      }
      pedido = { token, senha }
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
      if (!validarSenhas()) {
        return
      }
      pedido = { email: email.trim(), codigo: digitos, senha }
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
      setAviso(AVISO_REENVIO)
      reiniciar()
    } catch (falha) {
      setErro(mensagemDoErro(falha))
    } finally {
      setReenviando(false)
    }
  }

  const camposDeSenha = (
    <>
      <CampoTexto
        rotulo="Senha"
        type="password"
        autoComplete="new-password"
        value={senha}
        onChange={(evento) => setSenha(evento.target.value)}
      />
      <p className="m-0 -mt-2 text-xs">De 8 a 72 caracteres.</p>
      <CampoTexto
        rotulo="Repetir senha"
        type="password"
        autoComplete="new-password"
        value={repetir}
        onChange={(evento) => setRepetir(evento.target.value)}
      />
    </>
  )

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
          <p className="m-0 text-center text-sm">Falta pouco: crie sua senha e confirme para entrar na sua conta.</p>
          {camposDeSenha}
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
            {camposDeSenha}
            {mensagens}
            <button type="submit" disabled={enviando} className={classeBotaoPrimario}>
              {enviando ? 'Confirmando…' : 'Confirmar'}
            </button>
          </form>
          <BotaoReenviar restante={restante} reenviando={reenviando} desabilitado={enviando} aoReenviar={reenviar} />
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
