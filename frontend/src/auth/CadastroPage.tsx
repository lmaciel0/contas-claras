import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { CampoTexto, classeBotaoPrimario, MensagemDeErro } from './CampoTexto'
import { mensagemDoErro } from './mensagemDoErro'
import { TelaAuth } from './TelaAuth'
import { useAuth } from './useAuth'

/**
 * `/cadastro`. A API não cria a conta aqui: manda um código (e um link) por e-mail, e a conta só nasce em `/confirmar`.
 * Aqui não há senha: a pendência não a guarda (um terceiro poderia trocá-la); ela é definida na confirmação.
 * Por isso o sucesso leva à confirmação, com o e-mail no estado da rota (nunca na URL).
 */
export function CadastroPage() {
  const { usuario, cadastrar } = useAuth()
  const navigate = useNavigate()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (usuario !== null) {
    return <Navigate to="/" replace />
  }

  async function enviar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) {
      return
    }
    setErro(null)
    if (nome.trim() === '' || email.trim() === '') {
      setErro('Informe seu nome e seu e-mail.')
      return
    }
    setEnviando(true)
    try {
      await cadastrar(nome.trim(), email.trim())
    } catch (falha) {
      setErro(mensagemDoErro(falha))
      setEnviando(false)
      return
    }
    // O botão segue em "Enviando…" até a tela trocar: não há o que reativar depois do sucesso.
    void navigate('/confirmar', { state: { email: email.trim() } })
  }

  return (
    <TelaAuth titulo="Criar conta">
      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <CampoTexto
          rotulo="Nome"
          type="text"
          autoComplete="name"
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
        />
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
          {enviando ? 'Enviando…' : 'Criar conta'}
        </button>
      </form>
      <p className="m-0 mt-5 text-center text-sm">
        Já tem conta?{' '}
        <Link to="/login" className="font-semibold text-[var(--cor-principal)]">
          Entrar
        </Link>
      </p>
    </TelaAuth>
  )
}
