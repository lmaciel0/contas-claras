import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { Link, Navigate } from 'react-router'
import { BotaoGoogle } from './BotaoGoogle'
import { CampoTexto, classeBotaoPrimario, MensagemDeErro } from './CampoTexto'
import { mensagemDoErro } from './mensagemDoErro'
import { MENSAGEM_SENHA_FORA_DO_TAMANHO, senhaValida } from './senha'
import { TelaAuth, TelaCarregando } from './TelaAuth'
import { useAuth } from './useAuth'

/** `/cadastro`. A API cria a conta já com sessão (cookie), então depois do sucesso a pessoa vai direto ao Início. */
export function CadastroPage() {
  const { usuario, carregando, cadastrar } = useAuth()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (carregando) {
    return <TelaCarregando />
  }
  if (usuario !== null) {
    return <Navigate to="/" replace />
  }

  async function enviar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro(null)
    if (nome.trim() === '' || email.trim() === '') {
      setErro('Informe seu nome e seu e-mail.')
      return
    }
    if (!senhaValida(senha)) {
      setErro(MENSAGEM_SENHA_FORA_DO_TAMANHO)
      return
    }
    setEnviando(true)
    try {
      await cadastrar(nome.trim(), email.trim(), senha)
    } catch (falha) {
      setErro(mensagemDoErro(falha))
      setEnviando(false)
    }
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
        <CampoTexto
          rotulo="Senha"
          type="password"
          autoComplete="new-password"
          value={senha}
          onChange={(evento) => setSenha(evento.target.value)}
        />
        <p className="m-0 -mt-2 text-xs">De 8 a 72 caracteres.</p>
        <MensagemDeErro texto={erro} />
        <button type="submit" disabled={enviando} className={classeBotaoPrimario}>
          {enviando ? 'Criando…' : 'Criar conta'}
        </button>
      </form>
      <div className="mt-4 flex flex-col gap-4">
        <BotaoGoogle aoErro={setErro} />
        <p className="m-0 text-center text-sm">
          Já tem conta?{' '}
          <Link to="/login" className="font-semibold text-[var(--cor-principal)]">
            Entrar
          </Link>
        </p>
      </div>
    </TelaAuth>
  )
}
