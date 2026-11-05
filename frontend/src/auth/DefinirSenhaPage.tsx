import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { endpoints } from '../api/endpoints'
import type { DefinirSenhaRequest } from '../api/tipos'
import { BotaoGoogle } from './BotaoGoogle'
import { CampoTexto, classeBotaoPrimario, MensagemDeErro } from './CampoTexto'
import { mensagemDoErro } from './mensagemDoErro'
import { MENSAGEM_SENHA_FORA_DO_TAMANHO, senhaValida } from './senha'
import { ehSessaoPerdida } from './sessaoPerdida'
import { useAuth } from './useAuth'

/**
 * `/conta/senha`. Quem já tem senha precisa da atual (a API responde 400 "Senha atual incorreta." se faltar ou errar).
 * Conta criada só com Google reautentica pelo Google: preenche a nova senha e o botão do Google devolve a credencial,
 * que segue com a senha (401 "Login Google inválido." se faltar ou for de outro usuário). Vale só dentro da
 * `RotaProtegida`. A chamada não desloga em 401 (`semLogoutEm401`): só "Não autenticado." é sessão perdida.
 */
export function DefinirSenhaPage() {
  const { usuario, recarregar, limparSessao } = useAuth()
  const temSenha = usuario?.temSenha === true
  // Sem `VITE_GOOGLE_CLIENT_ID` o `BotaoGoogle` não renderiza: a conta só-Google não consegue confirmar a identidade.
  const googleDisponivel = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function salvar(pedidoDeReautenticacao: Pick<DefinirSenhaRequest, 'senhaAtual' | 'credencialGoogle'>) {
    if (enviando) {
      return
    }
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
    setEnviando(true)
    try {
      await endpoints.auth.definirSenha({ ...pedidoDeReautenticacao, senha: novaSenha })
      setAviso(temSenha ? 'Senha alterada.' : 'Senha definida.')
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmacao('')
      // A conta só com Google passa a ter senha: relê o usuário para a tela pedir a atual nas próximas trocas.
      await recarregar().catch(() => undefined)
    } catch (falha) {
      if (ehSessaoPerdida(falha)) {
        limparSessao() // a `RotaProtegida` leva a /login
        return
      }
      setErro(mensagemDoErro(falha))
    } finally {
      setEnviando(false)
    }
  }

  function enviar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault()
    // Conta só Google não envia por aqui: precisa da credencial do botão do Google.
    if (temSenha) {
      void salvar({ senhaAtual })
    }
  }

  return (
    <section className="card mx-auto w-full max-w-md p-6">
      <h1 className="m-0 mb-1 text-xl font-bold">{temSenha ? 'Alterar senha' : 'Definir senha'}</h1>
      <p className="m-0 mb-5 text-sm">
        {temSenha
          ? 'Ao trocar a senha, os outros aparelhos precisam entrar de novo.'
          : 'Com uma senha você também pode entrar sem o Google. Para sua segurança, o Google confirma a sua identidade.'}
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
          <p role="status" className="m-0 rounded-xl border border-[var(--cor-positivo)] bg-[var(--cor-ok-fundo)] px-3 py-2 text-sm text-[var(--cor-texto)]">
            {aviso}
          </p>
        )}
        {temSenha ? (
          <button type="submit" disabled={enviando} className={classeBotaoPrimario}>
            {enviando ? 'Salvando…' : 'Salvar senha'}
          </button>
        ) : !googleDisponivel ? (
          <p className="m-0 text-center text-sm">
            O login com o Google não está disponível neste ambiente, e é ele que confirma a sua identidade para definir
            a senha. Por isso não dá para definir uma senha por aqui.
          </p>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <p className="m-0 text-center text-sm">
              Preencha a nova senha e confirme com o Google: ele confirma que é você antes de salvar.
            </p>
            <BotaoGoogle
              aoErro={setErro}
              aoCredential={(credencialGoogle) => {
                void salvar({ credencialGoogle })
              }}
            />
            {enviando && (
              <p role="status" className="m-0 text-sm">
                Salvando…
              </p>
            )}
          </div>
        )}
      </form>
    </section>
  )
}
