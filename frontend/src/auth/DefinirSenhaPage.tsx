import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { endpoints } from '../api/endpoints'
import type { DefinirSenhaRequest } from '../api/tipos'
import { CampoTexto, classeBotaoPrimario, MensagemDeErro } from './CampoTexto'
import { mensagemDoErro } from './mensagemDoErro'
import { MENSAGEM_SENHA_FORA_DO_TAMANHO, senhaValida } from './senha'
import { useAuth } from './useAuth'

/**
 * `/conta/senha`. Quem já tem senha precisa da atual (a API responde 400 "Senha atual incorreta." se faltar
 * ou errar); conta criada só com Google define a primeira sem ela. Vale só dentro da `RotaProtegida`.
 */
export function DefinirSenhaPage() {
  const { usuario, recarregar } = useAuth()
  const temSenha = usuario?.temSenha === true
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro(null)
    setAviso(null)
    if (!senhaValida(novaSenha)) {
      setErro(MENSAGEM_SENHA_FORA_DO_TAMANHO)
      return
    }
    if (novaSenha !== confirmacao) {
      setErro('A confirmação não confere com a nova senha.')
      return
    }
    const pedido: DefinirSenhaRequest = temSenha ? { senhaAtual, senha: novaSenha } : { senha: novaSenha }
    setEnviando(true)
    try {
      await endpoints.auth.definirSenha(pedido)
      setAviso(temSenha ? 'Senha alterada.' : 'Senha definida.')
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmacao('')
      // A conta só com Google passa a ter senha: relê o usuário para a tela pedir a atual nas próximas trocas.
      await recarregar().catch(() => undefined)
    } catch (falha) {
      setErro(mensagemDoErro(falha))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="card mx-auto w-full max-w-md p-6">
      <h1 className="m-0 mb-1 text-xl font-bold">{temSenha ? 'Alterar senha' : 'Definir senha'}</h1>
      <p className="m-0 mb-5 text-sm">
        {temSenha
          ? 'Ao trocar a senha, os outros aparelhos precisam entrar de novo.'
          : 'Com uma senha você também pode entrar sem o Google.'}
      </p>
      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        {temSenha && (
          <CampoTexto
            rotulo="Senha atual"
            type="password"
            autoComplete="current-password"
            value={senhaAtual}
            onChange={(evento) => setSenhaAtual(evento.target.value)}
          />
        )}
        <CampoTexto
          rotulo="Nova senha"
          type="password"
          autoComplete="new-password"
          value={novaSenha}
          onChange={(evento) => setNovaSenha(evento.target.value)}
        />
        <CampoTexto
          rotulo="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          value={confirmacao}
          onChange={(evento) => setConfirmacao(evento.target.value)}
        />
        <MensagemDeErro texto={erro} />
        {aviso !== null && (
          <p role="status" className="m-0 rounded-xl border border-[var(--cor-positivo)] bg-[#e9f6ee] px-3 py-2 text-sm text-[var(--cor-texto)]">
            {aviso}
          </p>
        )}
        <button type="submit" disabled={enviando} className={classeBotaoPrimario}>
          {enviando ? 'Salvando…' : 'Salvar senha'}
        </button>
      </form>
    </section>
  )
}
